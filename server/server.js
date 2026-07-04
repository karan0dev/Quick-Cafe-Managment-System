const path = require('path');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const projectRoot = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const DB_NAME = process.env.MONGODB_DB || 'quickcafe_db';
const SESSION_COOKIE = 'qc_admin_session';
const SESSION_MS = 1000 * 60 * 60 * 8;
const TAX_RATE = 0.05;

let mongoClient;
let database;
const sessions = new Map();

app.use(express.json({ limit: '1mb' }));

async function getDb() {
  if (database) return database;
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Copy .env.example to .env and add your MongoDB Atlas connection string.');
  }

  mongoClient = new MongoClient(process.env.MONGODB_URI);
  await mongoClient.connect();
  database = mongoClient.db(DB_NAME);
  await ensureIndexes(database);
  return database;
}

async function ensureIndexes(db) {
  await Promise.all([
    db.collection('admin').createIndex({ username: 1 }, { unique: true }),
    db.collection('admin').createIndex({ email: 1 }, { unique: true }),
    db.collection('categories').createIndex({ category_id: 1 }, { unique: true }),
    db.collection('cafe_tables').createIndex({ table_id: 1 }, { unique: true }),
    db.collection('cafe_tables').createIndex({ table_number: 1 }, { unique: true }),
    db.collection('menu_items').createIndex({ item_id: 1 }, { unique: true }),
    db.collection('orders').createIndex({ order_id: 1 }, { unique: true }),
    db.collection('payments').createIndex({ payment_id: 1 }, { unique: true }),
  ]);
}

function jsonError(res, message, status = 500) {
  return res.status(status).json({ success: false, error: message });
}

function route(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((cookies, part) => {
    const index = part.indexOf('=');
    if (index === -1) return cookies;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function createSession(res, admin) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, {
    admin_id: admin.admin_id,
    username: admin.username,
    expires: Date.now() + SESSION_MS,
  });

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MS,
    path: '/',
  });
}

function clearSession(req, res) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) sessions.delete(token);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

function getSession(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  const session = token ? sessions.get(token) : null;
  if (!session || session.expires < Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }

  session.expires = Date.now() + SESSION_MS;
  return session;
}

function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return jsonError(res, 'Not authenticated. Please log in again.', 401);
  }
  req.admin = session;
  return next();
}

function normalizeOrderId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

function rupeeNumber(value) {
  return Number(Number(value || 0).toFixed(2));
}

function unwrapMongoDocument(result) {
  if (!result) return null;
  if (Object.prototype.hasOwnProperty.call(result, 'value')) return result.value;
  return result;
}

async function getNextSequence(db, name) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  const doc = unwrapMongoDocument(result);
  if (!doc) throw new Error(`Could not create sequence for ${name}.`);
  return doc.seq;
}

async function menuItemsWithCategories(db, query = {}) {
  const [items, categories] = await Promise.all([
    db.collection('menu_items').find(query).sort({ category_id: 1, item_name: 1 }).toArray(),
    db.collection('categories').find({}).toArray(),
  ]);
  const categoryMap = new Map(categories.map((category) => [category.category_id, category.category_name]));
  return items.map((item) => ({
    ...item,
    category_name: categoryMap.get(item.category_id) || 'Menu',
  }));
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function paymentStatusFor(mode) {
  return mode === 'Cash' ? 'Pending' : 'Paid';
}

app.get('/api/categories', route(async (req, res) => {
  const db = await getDb();
  const categories = await db.collection('categories').find({}).sort({ category_id: 1 }).toArray();
  res.json({ success: true, count: categories.length, categories });
}));

app.get('/api/menu', route(async (req, res) => {
  const db = await getDb();
  const categoryName = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const query = { availability: 'Available' };

  if (categoryName && categoryName.toLowerCase() !== 'all items' && categoryName.toLowerCase() !== 'all') {
    const category = await db.collection('categories').findOne({ category_name: categoryName });
    query.category_id = category ? category.category_id : -1;
  }

  const items = await menuItemsWithCategories(db, query);
  res.json({ success: true, count: items.length, items });
}));

app.post('/api/orders', route(async (req, res) => {
  const db = await getDb();
  const body = req.body || {};
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!rawItems.length) {
    return jsonError(res, 'Cart is empty or malformed.', 400);
  }

  const tableNumber = String(body.table_number || 'Table 01').trim();
  const validPayments = ['Cash', 'UPI', 'Card', 'Wallet'];
  const paymentMode = validPayments.includes(body.payment_mode) ? body.payment_mode : 'Cash';
  const itemIds = rawItems.map((line) => Number.parseInt(line.item_id, 10)).filter(Boolean);

  if (!itemIds.length) {
    return jsonError(res, 'No valid items in cart.', 400);
  }

  const [table, firstTable, menuItems] = await Promise.all([
    db.collection('cafe_tables').findOne({ table_number: tableNumber }),
    db.collection('cafe_tables').findOne({}, { sort: { table_id: 1 } }),
    db.collection('menu_items').find({ item_id: { $in: itemIds } }).toArray(),
  ]);

  const tableRow = table || firstTable;
  if (!tableRow) {
    return jsonError(res, 'No cafe tables are configured yet.', 500);
  }

  const priceMap = new Map(menuItems.map((item) => [item.item_id, item]));
  const lineItems = [];
  let subtotal = 0;

  rawItems.forEach((line) => {
    const itemId = Number.parseInt(line.item_id, 10);
    const item = priceMap.get(itemId);
    if (!item) return;
    const quantity = Math.max(1, Number.parseInt(line.quantity || 1, 10));
    const price = Number(item.price);
    const total = rupeeNumber(price * quantity);
    subtotal += total;
    lineItems.push({
      item_id: item.item_id,
      item_name: item.item_name,
      quantity,
      price,
      total,
    });
  });

  if (!lineItems.length) {
    return jsonError(res, 'None of the cart items matched the menu.', 400);
  }

  subtotal = rupeeNumber(subtotal);

  // Validate and apply promo code
  let discount = 0;
  const promoCode = typeof body.promo_code === 'string' ? body.promo_code.trim().toUpperCase() : '';
  if (promoCode === 'FLAT20') {
    if (subtotal >= 599) {
      discount = rupeeNumber(subtotal * 0.20);
    } else {
      return jsonError(res, 'Promo code FLAT20 requires a minimum order of ₹599.', 400);
    }
  } else if (promoCode === 'WELCOME10') {
    discount = rupeeNumber(subtotal * 0.10);
  } else if (promoCode) {
    return jsonError(res, 'Invalid promo code.', 400);
  }

  const taxableAmount = rupeeNumber(subtotal - discount);
  const tax = rupeeNumber(taxableAmount * TAX_RATE);
  const totalAmount = rupeeNumber(taxableAmount + tax);
  const orderId = await getNextSequence(db, 'orders');
  const paymentId = await getNextSequence(db, 'payments');
  const now = new Date();

  const order = {
    order_id: orderId,
    table_id: tableRow.table_id,
    order_date: now,
    subtotal,
    discount,
    promo_code: promoCode || null,
    tax,
    total_amount: totalAmount,
    payment_mode: paymentMode,
    order_status: 'Pending',
    items: lineItems,
  };

  await db.collection('orders').insertOne(order);
  await db.collection('payments').insertOne({
    payment_id: paymentId,
    order_id: orderId,
    payment_mode: paymentMode,
    payment_status: paymentStatusFor(paymentMode),
    paid_amount: paymentMode === 'Cash' ? 0 : totalAmount,
    payment_date: now,
  });
  await db.collection('cafe_tables').updateOne(
    { table_id: tableRow.table_id },
    { $set: { status: 'Occupied' } }
  );

  res.json({
    success: true,
    order_id: orderId,
    subtotal,
    discount,
    promo_code: promoCode || null,
    tax,
    total: totalAmount,
  });
}));

app.get('/api/order-status', route(async (req, res) => {
  const db = await getDb();
  const orderId = normalizeOrderId(req.query.order_id);
  if (!orderId) return jsonError(res, 'order_id is required.', 400);

  const order = await db.collection('orders').findOne({ order_id: orderId });
  if (!order) return jsonError(res, 'Order not found.', 404);
  const table = await db.collection('cafe_tables').findOne({ table_id: order.table_id });

  res.json({
    success: true,
    order: {
      order_id: order.order_id,
      order_status: order.order_status,
      order_date: order.order_date,
      total_amount: order.total_amount,
      discount: order.discount || 0,
      promo_code: order.promo_code || null,
      table_number: table ? table.table_number : '',
    },
  });
}));

app.get('/api/bill', route(async (req, res) => {
  const db = await getDb();
  const orderId = normalizeOrderId(req.query.order_id);
  if (!orderId) return jsonError(res, 'order_id is required.', 400);

  const order = await db.collection('orders').findOne({ order_id: orderId });
  if (!order) return jsonError(res, 'Order not found.', 404);
  const table = await db.collection('cafe_tables').findOne({ table_id: order.table_id });

  res.json({
    success: true,
    order: {
      order_id: order.order_id,
      order_date: order.order_date,
      subtotal: order.subtotal,
      discount: order.discount || 0,
      promo_code: order.promo_code || null,
      tax: order.tax,
      total_amount: order.total_amount,
      payment_mode: order.payment_mode,
      order_status: order.order_status,
      table_number: table ? table.table_number : '',
    },
    items: order.items || [],
  });
}));

app.get('/api/tables', route(async (req, res) => {
  const db = await getDb();
  const tables = await db.collection('cafe_tables').find({}).sort({ table_id: 1 }).toArray();
  res.json({ success: true, tables });
}));

app.post('/api/log-error', (req, res) => {
  console.log('[BROWSER CLIENT ERROR]:', req.body);
  res.json({ success: true });
});

app.post('/api/select-table', route(async (req, res) => {
  const db = await getDb();
  const tableNumber = String((req.body || {}).table_number || '').trim();
  if (!tableNumber) return jsonError(res, 'table_number is required.', 400);

  const result = await db.collection('cafe_tables').findOneAndUpdate(
    { table_number: tableNumber, status: 'Available' },
    { $set: { status: 'Occupied' } },
    { returnDocument: 'after' }
  );
  const claimed = unwrapMongoDocument(result);

  if (!claimed) {
    const table = await db.collection('cafe_tables').findOne({ table_number: tableNumber });
    if (!table) return jsonError(res, 'That table does not exist.', 404);
    return jsonError(res, `That table is currently ${String(table.status).toLowerCase()}. Please pick another one.`, 409);
  }

  res.json({ success: true, table_id: claimed.table_id, table_number: claimed.table_number });
}));

app.get('/api/admin/session', route(async (req, res) => {
  const session = getSession(req);
  res.json({
    success: true,
    authenticated: Boolean(session),
    username: session ? session.username : null,
  });
}));

app.post('/api/admin/login', route(async (req, res) => {
  const db = await getDb();
  const body = req.body || {};
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!username || !password) {
    return jsonError(res, 'Username and password are required.', 400);
  }

  const admin = await db.collection('admin').findOne({
    $or: [{ username }, { email: username }],
  });

  if (!admin || !await bcrypt.compare(password, admin.password)) {
    return jsonError(res, 'Invalid username or password.', 401);
  }

  createSession(res, admin);
  res.json({ success: true, username: admin.username });
}));

app.post('/api/admin/logout', (req, res) => {
  clearSession(req, res);
  res.json({ success: true });
});

app.get('/api/admin/stats', requireAdmin, route(async (req, res) => {
  const db = await getDb();
  const { start, end } = todayRange();

  const [
    totalOrdersToday,
    revenueAgg,
    pendingOrders,
    availableTables,
    totalTables,
    popularAgg,
    recentOrders,
  ] = await Promise.all([
    db.collection('orders').countDocuments({ order_date: { $gte: start, $lt: end } }),
    db.collection('orders').aggregate([
      { $match: { order_date: { $gte: start, $lt: end }, order_status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, revenue: { $sum: '$total_amount' } } },
    ]).toArray(),
    db.collection('orders').countDocuments({ order_status: { $in: ['Pending', 'Preparing'] } }),
    db.collection('cafe_tables').countDocuments({ status: 'Available' }),
    db.collection('cafe_tables').countDocuments({}),
    db.collection('orders').aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.item_name', qty: { $sum: '$items.quantity' } } },
      { $sort: { qty: -1 } },
      { $limit: 1 },
    ]).toArray(),
    db.collection('orders').find({}).sort({ order_date: -1 }).limit(8).toArray(),
  ]);

  const tableIds = [...new Set(recentOrders.map((order) => order.table_id))];
  const tables = await db.collection('cafe_tables').find({ table_id: { $in: tableIds } }).toArray();
  const tableMap = new Map(tables.map((table) => [table.table_id, table.table_number]));

  res.json({
    success: true,
    stats: {
      orders_today: totalOrdersToday,
      revenue_today: Number(revenueAgg[0] ? revenueAgg[0].revenue : 0),
      pending_orders: pendingOrders,
      available_tables: availableTables,
      total_tables: totalTables,
      popular_item: popularAgg[0] ? popularAgg[0]._id : '-',
    },
    recent_orders: recentOrders.map((order) => ({
      order_id: order.order_id,
      order_date: order.order_date,
      total_amount: order.total_amount,
      order_status: order.order_status,
      payment_mode: order.payment_mode,
      table_number: tableMap.get(order.table_id) || '',
    })),
  });
}));

app.get('/api/admin/menu-items', requireAdmin, route(async (req, res) => {
  const db = await getDb();
  const [items, categories] = await Promise.all([
    menuItemsWithCategories(db),
    db.collection('categories').find({}).sort({ category_id: 1 }).toArray(),
  ]);
  res.json({ success: true, items, categories });
}));

app.post('/api/admin/save-item', requireAdmin, route(async (req, res) => {
  const db = await getDb();
  const body = req.body || {};
  const itemId = Number.parseInt(body.item_id || 0, 10);
  const categoryId = Number.parseInt(body.category_id || 0, 10);
  const itemName = String(body.item_name || '').trim();
  const description = String(body.description || '').trim();
  const price = Number(body.price || 0);
  const image = String(body.image || '').trim() || 'images/menu/cappuccino.svg';
  const rating = Number(body.rating || 4.5);
  const availability = ['Available', 'Unavailable'].includes(body.availability) ? body.availability : 'Available';

  if (!itemName || categoryId <= 0 || price <= 0) {
    return jsonError(res, 'Item name, category and a price greater than 0 are required.', 400);
  }

  const category = await db.collection('categories').findOne({ category_id: categoryId });
  if (!category) return jsonError(res, 'Selected category does not exist.', 400);

  if (itemId > 0) {
    const result = await db.collection('menu_items').updateOne(
      { item_id: itemId },
      {
        $set: {
          category_id: categoryId,
          item_name: itemName,
          description,
          price,
          image,
          rating,
          availability,
        },
      }
    );

    if (!result.matchedCount) return jsonError(res, 'Item not found.', 404);
    return res.json({ success: true, item_id: itemId, mode: 'updated' });
  }

  const newItemId = await getNextSequence(db, 'menu_items');
  await db.collection('menu_items').insertOne({
    item_id: newItemId,
    category_id: categoryId,
    item_name: itemName,
    description,
    price,
    image,
    rating,
    availability,
  });
  res.json({ success: true, item_id: newItemId, mode: 'created' });
}));

app.post('/api/admin/delete-item', requireAdmin, route(async (req, res) => {
  const db = await getDb();
  const itemId = Number.parseInt((req.body || {}).item_id || 0, 10);
  if (itemId <= 0) return jsonError(res, 'item_id is required.', 400);

  const used = await db.collection('orders').findOne({ 'items.item_id': itemId });
  if (used) {
    return jsonError(res, "This item is part of an existing order, so it can't be deleted. Mark it Unavailable instead.", 409);
  }

  const result = await db.collection('menu_items').deleteOne({ item_id: itemId });
  if (!result.deletedCount) return jsonError(res, 'Item not found.', 404);
  res.json({ success: true });
}));

app.get('/api/admin/orders', requireAdmin, route(async (req, res) => {
  const db = await getDb();
  const status = String(req.query.status || '');
  const validStatuses = ['Pending', 'Preparing', 'Ready', 'Served', 'Cancelled'];
  const query = validStatuses.includes(status) ? { order_status: status } : {};
  const orders = await db.collection('orders').find(query).sort({ order_date: -1 }).toArray();
  const tableIds = [...new Set(orders.map((order) => order.table_id))];
  const tables = await db.collection('cafe_tables').find({ table_id: { $in: tableIds } }).toArray();
  const tableMap = new Map(tables.map((table) => [table.table_id, table.table_number]));

  res.json({
    success: true,
    orders: orders.map((order) => ({
      order_id: order.order_id,
      order_date: order.order_date,
      subtotal: order.subtotal,
      discount: order.discount || 0,
      promo_code: order.promo_code || null,
      tax: order.tax,
      total_amount: order.total_amount,
      payment_mode: order.payment_mode,
      order_status: order.order_status,
      table_number: tableMap.get(order.table_id) || '',
      items: order.items || [],
    })),
  });
}));

app.post('/api/admin/update-order-status', requireAdmin, route(async (req, res) => {
  const db = await getDb();
  const body = req.body || {};
  const orderId = normalizeOrderId(body.order_id);
  const status = String(body.status || '');
  const validStatuses = ['Pending', 'Preparing', 'Ready', 'Served', 'Cancelled'];

  if (!orderId || !validStatuses.includes(status)) {
    return jsonError(res, 'A valid order_id and status are required.', 400);
  }

  const order = await db.collection('orders').findOne({ order_id: orderId });
  if (!order) return jsonError(res, 'Order not found.', 404);

  await db.collection('orders').updateOne({ order_id: orderId }, { $set: { order_status: status } });

  if (['Served', 'Cancelled'].includes(status)) {
    const activeOrders = await db.collection('orders').countDocuments({
      table_id: order.table_id,
      order_id: { $ne: orderId },
      order_status: { $in: ['Pending', 'Preparing', 'Ready'] },
    });
    if (activeOrders === 0) {
      await db.collection('cafe_tables').updateOne({ table_id: order.table_id }, { $set: { status: 'Available' } });
    }
  } else {
    await db.collection('cafe_tables').updateOne({ table_id: order.table_id }, { $set: { status: 'Occupied' } });
  }

  res.json({ success: true });
}));

app.get('/api/admin/tables', requireAdmin, route(async (req, res) => {
  const db = await getDb();
  const tables = await db.collection('cafe_tables').find({}).sort({ table_id: 1 }).toArray();
  res.json({ success: true, tables });
}));

app.post('/api/admin/update-table-status', requireAdmin, route(async (req, res) => {
  const db = await getDb();
  const tableId = Number.parseInt((req.body || {}).table_id || 0, 10);
  const status = String((req.body || {}).status || '');
  const validStatuses = ['Available', 'Occupied', 'Reserved'];

  if (tableId <= 0 || !validStatuses.includes(status)) {
    return jsonError(res, 'A valid table_id and status are required.', 400);
  }

  const result = await db.collection('cafe_tables').updateOne(
    { table_id: tableId },
    { $set: { status } }
  );
  if (!result.matchedCount) return jsonError(res, 'Table not found.', 404);
  res.json({ success: true });
}));

app.get('/api/admin/reports', requireAdmin, route(async (req, res) => {
  const db = await getDb();
  const timezone = process.env.REPORT_TIMEZONE || 'Asia/Kolkata';
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 6);

  const [dailyRevenue, topItems, paymentModes, totalsAgg] = await Promise.all([
    db.collection('orders').aggregate([
      { $match: { order_status: { $ne: 'Cancelled' }, order_date: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$order_date', timezone } },
          revenue: { $sum: '$total_amount' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, day: '$_id', revenue: 1, orders: 1 } },
    ]).toArray(),
    db.collection('orders').aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.item_name',
          qty: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' },
        },
      },
      { $sort: { qty: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, item_name: '$_id', qty: 1, revenue: 1 } },
    ]).toArray(),
    db.collection('orders').aggregate([
      { $match: { order_status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: '$payment_mode',
          orders: { $sum: 1 },
          revenue: { $sum: '$total_amount' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, payment_mode: '$_id', orders: 1, revenue: 1 } },
    ]).toArray(),
    db.collection('orders').aggregate([
      { $match: { order_status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, total_orders: { $sum: 1 }, total_revenue: { $sum: '$total_amount' } } },
    ]).toArray(),
  ]);

  res.json({
    success: true,
    daily_revenue: dailyRevenue,
    top_items: topItems,
    payment_modes: paymentModes,
    totals: totalsAgg[0] || { total_orders: 0, total_revenue: 0 },
  });
}));

app.use('/css', express.static(path.join(projectRoot, 'css')));
app.use('/js', express.static(path.join(projectRoot, 'js')));
app.use('/images', express.static(path.join(projectRoot, 'images')));
app.use('/admin', express.static(path.join(projectRoot, 'admin')));

const pages = new Set([
  'index.html',
  'customer.html',
  'menu.html',
  'cart.html',
  'status.html',
  'bill.html',
  'table.html',
  'offers.html',
  'profile.html',
  'about.html',
  'contact.html',
]);

app.get('/', (req, res) => res.sendFile(path.join(projectRoot, 'index.html')));
app.get('/:page', (req, res, next) => {
  if (!pages.has(req.params.page)) return next();
  return res.sendFile(path.join(projectRoot, req.params.page));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  return jsonError(res, err.message || 'Unexpected server error.', 500);
});

getDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`QuickCafe MongoDB API running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
