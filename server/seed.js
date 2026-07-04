const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const DB_NAME = process.env.MONGODB_DB || 'quickcafe_db';

const categories = [
  { category_id: 1, category_name: 'Coffee', category_icon: 'coffee' },
  { category_id: 2, category_name: 'Tea', category_icon: 'leaf' },
  { category_id: 3, category_name: 'Cold Drinks', category_icon: 'glass' },
  { category_id: 4, category_name: 'Snacks', category_icon: 'sandwich' },
  { category_id: 5, category_name: 'Desserts', category_icon: 'cake' },
];

const tables = [
  { table_id: 1, table_number: 'Table 01', qr_code: 'qr_table_1.png', status: 'Available' },
  { table_id: 2, table_number: 'Table 02', qr_code: 'qr_table_2.png', status: 'Available' },
  { table_id: 3, table_number: 'Table 03', qr_code: 'qr_table_3.png', status: 'Occupied' },
  { table_id: 4, table_number: 'Table 07', qr_code: 'qr_table_7.png', status: 'Occupied' },
  { table_id: 5, table_number: 'Table 12', qr_code: 'qr_table_12.png', status: 'Available' },
];

const menuItems = [
  { item_id: 1, category_id: 1, item_name: 'Cappuccino', description: 'Classic espresso with steamed milk foam', price: 149, image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=700&auto=format&fit=crop', rating: 4.6, availability: 'Available' },
  { item_id: 2, category_id: 1, item_name: 'Cafe Latte', description: 'Smooth espresso layered with warm milk', price: 139, image: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?q=80&w=700&auto=format&fit=crop', rating: 4.5, availability: 'Available' },
  { item_id: 3, category_id: 1, item_name: 'Espresso', description: 'Strong and bold single coffee shot', price: 99, image: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=700&auto=format&fit=crop', rating: 4.7, availability: 'Available' },
  { item_id: 4, category_id: 1, item_name: 'Hazelnut Mocha', description: 'Espresso, chocolate and roasted hazelnut', price: 189, image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=700&auto=format&fit=crop', rating: 4.6, availability: 'Available' },
  { item_id: 5, category_id: 2, item_name: 'Masala Chai', description: 'Spiced black tea brewed with milk', price: 89, image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=700&auto=format&fit=crop', rating: 4.8, availability: 'Available' },
  { item_id: 6, category_id: 2, item_name: 'Green Tea', description: 'Light antioxidant-rich steeped tea', price: 79, image: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?q=80&w=700&auto=format&fit=crop', rating: 4.3, availability: 'Available' },
  { item_id: 7, category_id: 3, item_name: 'Cold Brew', description: 'Slow-steeped coffee served over ice', price: 169, image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=700&auto=format&fit=crop', rating: 4.6, availability: 'Available' },
  { item_id: 8, category_id: 3, item_name: 'Mint Lemonade', description: 'Fresh mint, lemon and sparkling water', price: 129, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=700&auto=format&fit=crop', rating: 4.4, availability: 'Available' },
  { item_id: 9, category_id: 4, item_name: 'Cheese Sandwich', description: 'Grilled sandwich with melted cheese', price: 119, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=700&auto=format&fit=crop', rating: 4.4, availability: 'Available' },
  { item_id: 10, category_id: 4, item_name: 'Veg Puff', description: 'Flaky pastry with spiced vegetable filling', price: 99, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=700&auto=format&fit=crop', rating: 4.2, availability: 'Available' },
  { item_id: 11, category_id: 4, item_name: 'Garlic Bread', description: 'Toasted bread with garlic herb butter', price: 129, image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=700&auto=format&fit=crop', rating: 4.5, availability: 'Available' },
  { item_id: 12, category_id: 5, item_name: 'Chocolate Brownie', description: 'Rich fudgy brownie with cocoa', price: 129, image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=700&auto=format&fit=crop', rating: 4.8, availability: 'Available' },
  { item_id: 13, category_id: 5, item_name: 'Blueberry Muffin', description: 'Soft muffin packed with blueberries', price: 119, image: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?q=80&w=700&auto=format&fit=crop', rating: 4.3, availability: 'Available' },
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing. Copy .env.example to .env and add your MongoDB Atlas connection string.');
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  await Promise.all([
    db.collection('admin').deleteMany({}),
    db.collection('categories').deleteMany({}),
    db.collection('cafe_tables').deleteMany({}),
    db.collection('menu_items').deleteMany({}),
    db.collection('orders').deleteMany({}),
    db.collection('payments').deleteMany({}),
    db.collection('counters').deleteMany({}),
  ]);

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

  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@quickcafe.com';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await db.collection('admin').insertOne({
    admin_id: 1,
    username: adminUsername,
    email: adminEmail,
    password: passwordHash,
  });
  await db.collection('categories').insertMany(categories);
  await db.collection('cafe_tables').insertMany(tables);
  await db.collection('menu_items').insertMany(menuItems);

  const demoItems = [
    { item_id: 1, item_name: 'Cappuccino', quantity: 1, price: 149, total: 149 },
    { item_id: 9, item_name: 'Cheese Sandwich', quantity: 1, price: 119, total: 119 },
    { item_id: 12, item_name: 'Chocolate Brownie', quantity: 1, price: 129, total: 129 },
  ];

  await db.collection('orders').insertOne({
    order_id: 1,
    table_id: 4,
    order_date: new Date(),
    subtotal: 397,
    tax: 19.85,
    total_amount: 416.85,
    payment_mode: 'UPI',
    order_status: 'Preparing',
    items: demoItems,
  });

  await db.collection('payments').insertOne({
    payment_id: 1,
    order_id: 1,
    payment_mode: 'UPI',
    payment_status: 'Paid',
    paid_amount: 416.85,
    payment_date: new Date(),
  });

  await db.collection('counters').insertMany([
    { _id: 'orders', seq: 1 },
    { _id: 'payments', seq: 1 },
    { _id: 'menu_items', seq: 13 },
  ]);

  console.log(`Seeded MongoDB database "${DB_NAME}" with QuickCafe demo data.`);
  console.log(`Admin login: ${adminUsername} / ${adminPassword}`);
  await client.close();
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
