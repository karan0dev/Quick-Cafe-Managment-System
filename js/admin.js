/* ============================================================
   QuickCafe — admin.js
   Loaded alongside js/script.js on every admin/*.html page.
   script.js already gives us: qs, qsa, showToast, applyTheme,
   initTheme, initMobileNav, rupee()/rupeeFixed(). This file adds
   the admin-only auth + MongoDB-backed data screens on top of that.
   ============================================================ */

const ADMIN_API = {
  session: '../api/admin/session',
  login: '../api/admin/login',
  logout: '../api/admin/logout',
  stats: '../api/admin/stats',
  menuItems: '../api/admin/menu-items',
  saveItem: '../api/admin/save-item',
  deleteItem: '../api/admin/delete-item',
  orders: '../api/admin/orders',
  updateOrderStatus: '../api/admin/update-order-status',
  tables: '../api/admin/tables',
  updateTableStatus: '../api/admin/update-table-status',
  reports: '../api/admin/reports',
};

async function adminFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  let data;
  try { data = await res.json(); } catch { data = { success: false, error: 'Unexpected server response.' }; }
  if (res.status === 401) {
    window.location.href = 'login.html';
    throw new Error('Not authenticated');
  }
  return data;
}

/* ---------- auth guard (every page except login.html) ---------- */
async function requireAdminAuth() {
  try {
    const data = await adminFetch(ADMIN_API.session);
    if (!data.authenticated) {
      window.location.href = 'login.html';
      return null;
    }
    qsa('[data-admin-username]').forEach((el) => { el.textContent = data.username; });
    return data;
  } catch {
    window.location.href = 'login.html';
    return null;
  }
}

function initAdminLogout() {
  qsa('[data-admin-logout]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try { await adminFetch(ADMIN_API.logout, { method: 'POST' }); } catch { /* ignore */ }
      window.location.href = 'login.html';
    });
  });
}

/* ============================================================
   Page: admin/login.html
   ============================================================ */
function initAdminLoginPage() {
  const form = qs('#adminLoginForm');
  if (!form) return;

  // Already logged in? Skip the form.
  adminFetch(ADMIN_API.session).then((data) => {
    if (data.authenticated) window.location.href = 'dashboard.html';
  }).catch(() => {});

  const errorBox = qs('#loginError');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = qs('#loginUsername').value.trim();
    const password = qs('#loginPassword').value;
    const btn = qs('#loginSubmitBtn');

    if (errorBox) errorBox.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Logging in...';

    try {
      const data = await adminFetch(ADMIN_API.login, {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (!data.success) throw new Error(data.error || 'Login failed.');
      window.location.href = 'dashboard.html';
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err.message || 'Login failed. Please try again.';
        errorBox.style.display = 'flex';
      }
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Login';
    }
  });
}

/* ============================================================
   Page: admin/dashboard.html
   ============================================================ */
async function initAdminDashboardPage() {
  const grid = qs('#statGrid');
  if (!grid) return;

  const data = await adminFetch(ADMIN_API.stats);
  if (!data.success) { showToast('Could not load dashboard stats', 'fa-triangle-exclamation'); return; }
  const s = data.stats;

  qs('#statOrdersToday').textContent = s.orders_today;
  qs('#statRevenueToday').textContent = rupee(s.revenue_today);
  qs('#statPending').textContent = s.pending_orders;
  qs('#statTables').textContent = `${s.available_tables}/${s.total_tables}`;
  qs('#statPopular').textContent = s.popular_item;

  const rows = qs('#recentOrdersRows');
  if (rows) {
    if (!data.recent_orders.length) {
      rows.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:24px;">No orders yet.</td></tr>`;
    } else {
      rows.innerHTML = data.recent_orders.map((o) => `
        <tr>
          <td>#${o.order_id}</td>
          <td>${o.table_number}</td>
          <td>${new Date(o.order_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
          <td>${rupeeFixed(o.total_amount)}</td>
          <td><span class="status-pill status-${o.order_status.toLowerCase()}">${o.order_status}</span></td>
        </tr>
      `).join('');
    }
  }
}

/* ============================================================
   Page: admin/manage-menu.html
   ============================================================ */
async function initAdminMenuPage() {
  const tableBody = qs('#menuItemsRows');
  const form = qs('#itemForm');
  if (!tableBody || !form) return;

  let categories = [];

  function fillCategorySelect() {
    const select = qs('#itemCategory');
    select.innerHTML = categories.map((c) => `<option value="${c.category_id}">${c.category_name}</option>`).join('');
  }

  function resetForm() {
    form.reset();
    qs('#itemId').value = '';
    qs('#formTitle').textContent = 'Add New Item';
    qs('#itemSubmitBtn').innerHTML = '<i class="fa-solid fa-plus"></i> Add Item';
    qs('#cancelEditBtn').style.display = 'none';
  }

  async function load() {
    const data = await adminFetch(ADMIN_API.menuItems);
    if (!data.success) { showToast('Could not load menu items', 'fa-triangle-exclamation'); return; }
    categories = data.categories;
    fillCategorySelect();

    tableBody.innerHTML = data.items.map((item) => `
      <tr data-id="${item.item_id}">
        <td><img src="${item.image}" alt="" class="row-thumb" onerror="this.src='../images/menu/cappuccino.svg'"></td>
        <td>${item.item_name}</td>
        <td>${item.category_name}</td>
        <td>${rupeeFixed(item.price)}</td>
        <td><span class="status-pill ${item.availability === 'Available' ? 'status-served' : 'status-cancelled'}">${item.availability}</span></td>
        <td class="row-actions">
          <button class="icon-action" data-edit="${item.item_id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-action" data-toggle="${item.item_id}" data-current="${item.availability}" title="Toggle availability"><i class="fa-solid fa-toggle-on"></i></button>
          <button class="icon-action danger" data-delete="${item.item_id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join('') || `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">No menu items yet.</td></tr>`;

    qsa('[data-edit]', tableBody).forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = data.items.find((i) => i.item_id == btn.dataset.edit);
        if (!item) return;
        qs('#itemId').value = item.item_id;
        qs('#itemCategory').value = item.category_id;
        qs('#itemName').value = item.item_name;
        qs('#itemDescription').value = item.description || '';
        qs('#itemPrice').value = item.price;
        qs('#itemImage').value = item.image;
        qs('#itemRating').value = item.rating;
        qs('#itemAvailability').value = item.availability;
        qs('#formTitle').textContent = `Edit: ${item.item_name}`;
        qs('#itemSubmitBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
        qs('#cancelEditBtn').style.display = 'inline-flex';
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    qsa('[data-toggle]', tableBody).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const item = data.items.find((i) => i.item_id == btn.dataset.toggle);
        if (!item) return;
        const newAvailability = item.availability === 'Available' ? 'Unavailable' : 'Available';
        const result = await adminFetch(ADMIN_API.saveItem, {
          method: 'POST',
          body: JSON.stringify({ ...item, availability: newAvailability }),
        });
        if (result.success) {
          showToast(`${item.item_name} marked ${newAvailability}`, 'fa-circle-check');
          load();
        } else {
          showToast(result.error || 'Could not update item', 'fa-triangle-exclamation');
        }
      });
    });

    qsa('[data-delete]', tableBody).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const item = data.items.find((i) => i.item_id == btn.dataset.delete);
        if (!item) return;
        if (!confirm(`Delete "${item.item_name}"? This can't be undone.`)) return;
        const result = await adminFetch(ADMIN_API.deleteItem, {
          method: 'POST',
          body: JSON.stringify({ item_id: item.item_id }),
        });
        if (result.success) {
          showToast(`${item.item_name} deleted`, 'fa-trash');
          load();
        } else {
          showToast(result.error || 'Could not delete item', 'fa-triangle-exclamation');
        }
      });
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      item_id: qs('#itemId').value ? Number(qs('#itemId').value) : 0,
      category_id: Number(qs('#itemCategory').value),
      item_name: qs('#itemName').value.trim(),
      description: qs('#itemDescription').value.trim(),
      price: Number(qs('#itemPrice').value),
      image: qs('#itemImage').value.trim(),
      rating: Number(qs('#itemRating').value) || 4.5,
      availability: qs('#itemAvailability').value,
    };
    const result = await adminFetch(ADMIN_API.saveItem, { method: 'POST', body: JSON.stringify(payload) });
    if (result.success) {
      showToast(result.mode === 'created' ? 'Item added' : 'Item updated', 'fa-circle-check');
      resetForm();
      load();
    } else {
      showToast(result.error || 'Could not save item', 'fa-triangle-exclamation');
    }
  });

  qs('#cancelEditBtn').addEventListener('click', resetForm);
  load();
}

/* ============================================================
   Page: admin/orders.html
   ============================================================ */
async function initAdminOrdersPage() {
  const rowsEl = qs('#ordersRows');
  const pillRow = qs('#orderStatusPills');
  if (!rowsEl || !pillRow) return;

  const statuses = ['All', 'Pending', 'Preparing', 'Ready', 'Served', 'Cancelled'];
  let active = 'All';
  const nextStatus = { Pending: 'Preparing', Preparing: 'Ready', Ready: 'Served' };

  function renderPills() {
    pillRow.innerHTML = statuses.map((s) => `<button class="pill ${s === active ? 'active' : ''}" data-status="${s}">${s}</button>`).join('');
    qsa('.pill', pillRow).forEach((btn) => {
      btn.addEventListener('click', () => { active = btn.dataset.status; renderPills(); load(); });
    });
  }

  async function load() {
    rowsEl.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">Loading...</td></tr>`;
    const url = active === 'All' ? ADMIN_API.orders : `${ADMIN_API.orders}?status=${encodeURIComponent(active)}`;
    const data = await adminFetch(url);
    if (!data.success) { showToast('Could not load orders', 'fa-triangle-exclamation'); return; }

    if (!data.orders.length) {
      rowsEl.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px;">No orders in this filter.</td></tr>`;
      return;
    }

    rowsEl.innerHTML = data.orders.map((o) => {
      const itemsSummary = o.items.map((i) => `${i.item_name} ×${i.quantity}`).join(', ');
      const advance = nextStatus[o.order_status];
      const promoInfo = o.promo_code ? `<br><span style="background:var(--moss-bright);color:#000;font-size:9px;font-weight:900;padding:2px 6px;border-radius:4px;display:inline-block;margin-top:4px;">${o.promo_code}</span>` : '';
      return `
      <tr data-id="${o.order_id}">
        <td>#${o.order_id}</td>
        <td>${o.table_number}</td>
        <td class="order-items-cell">${itemsSummary}</td>
        <td>${rupeeFixed(o.total_amount)}${promoInfo}<br><span class="muted-copy" style="font-size:11px;">${o.payment_mode}</span></td>
        <td><span class="status-pill status-${o.order_status.toLowerCase()}">${o.order_status}</span></td>
        <td class="row-actions">
          ${advance ? `<button class="btn btn-ghost btn-sm" data-advance="${o.order_id}" data-next="${advance}">Mark ${advance}</button>` : ''}
          ${o.order_status !== 'Cancelled' && o.order_status !== 'Served' ? `<button class="icon-action danger" data-cancel="${o.order_id}" title="Cancel order"><i class="fa-solid fa-ban"></i></button>` : ''}
        </td>
      </tr>`;
    }).join('');

    qsa('[data-advance]', rowsEl).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const result = await adminFetch(ADMIN_API.updateOrderStatus, {
          method: 'POST',
          body: JSON.stringify({ order_id: Number(btn.dataset.advance), status: btn.dataset.next }),
        });
        if (result.success) { showToast(`Order #${btn.dataset.advance} marked ${btn.dataset.next}`, 'fa-circle-check'); load(); }
        else showToast(result.error || 'Could not update order', 'fa-triangle-exclamation');
      });
    });
    qsa('[data-cancel]', rowsEl).forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Cancel order #${btn.dataset.cancel}?`)) return;
        const result = await adminFetch(ADMIN_API.updateOrderStatus, {
          method: 'POST',
          body: JSON.stringify({ order_id: Number(btn.dataset.cancel), status: 'Cancelled' }),
        });
        if (result.success) { showToast(`Order #${btn.dataset.cancel} cancelled`, 'fa-ban'); load(); }
        else showToast(result.error || 'Could not cancel order', 'fa-triangle-exclamation');
      });
    });
  }

  renderPills();
  load();
  setInterval(load, 15000); // light auto-refresh so new customer orders show up without a manual reload
}

/* ============================================================
   Page: admin/tables.html
   ============================================================ */
async function initAdminTablesPage() {
  const grid = qs('#adminTableGrid');
  if (!grid) return;

  async function load() {
    const data = await adminFetch(ADMIN_API.tables);
    if (!data.success) { showToast('Could not load tables', 'fa-triangle-exclamation'); return; }

    grid.innerHTML = data.tables.map((t) => `
      <div class="admin-table-card status-${t.status.toLowerCase()}">
        <div class="admin-table-card-head">
          <h4>${t.table_number}</h4>
          <span class="status-pill status-${t.status.toLowerCase() === 'available' ? 'served' : (t.status.toLowerCase() === 'occupied' ? 'pending' : 'preparing')}">${t.status}</span>
        </div>
        <div class="admin-table-actions">
          <button data-set-table="${t.table_id}" data-status="Available" ${t.status === 'Available' ? 'disabled' : ''}>Available</button>
          <button data-set-table="${t.table_id}" data-status="Occupied" ${t.status === 'Occupied' ? 'disabled' : ''}>Occupied</button>
          <button data-set-table="${t.table_id}" data-status="Reserved" ${t.status === 'Reserved' ? 'disabled' : ''}>Reserved</button>
        </div>
      </div>
    `).join('');

    qsa('[data-set-table]', grid).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const result = await adminFetch(ADMIN_API.updateTableStatus, {
          method: 'POST',
          body: JSON.stringify({ table_id: Number(btn.dataset.setTable), status: btn.dataset.status }),
        });
        if (result.success) { showToast('Table status updated', 'fa-circle-check'); load(); }
        else showToast(result.error || 'Could not update table', 'fa-triangle-exclamation');
      });
    });
  }

  load();
}

/* ============================================================
   Page: admin/reports.html
   ============================================================ */
async function initAdminReportsPage() {
  const topItemsEl = qs('#topItemsList');
  if (!topItemsEl) return;

  const data = await adminFetch(ADMIN_API.reports);
  if (!data.success) { showToast('Could not load reports', 'fa-triangle-exclamation'); return; }

  qs('#reportTotalRevenue').textContent = rupee(data.totals.total_revenue);
  qs('#reportTotalOrders').textContent = data.totals.total_orders;

  const maxQty = Math.max(1, ...data.top_items.map((i) => Number(i.qty)));
  topItemsEl.innerHTML = data.top_items.length
    ? data.top_items.map((i) => `
      <div class="bar-row">
        <span class="bar-label">${i.item_name}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(i.qty / maxQty) * 100}%"></div></div>
        <span class="bar-value">${i.qty} sold</span>
      </div>
    `).join('')
    : `<p class="muted-copy">No sales yet.</p>`;

  const paymentEl = qs('#paymentModeList');
  paymentEl.innerHTML = data.payment_modes.length
    ? data.payment_modes.map((p) => `
      <div class="payment-stat-row">
        <span>${p.payment_mode}</span>
        <span>${p.orders} orders</span>
        <span>${rupeeFixed(p.revenue)}</span>
      </div>
    `).join('')
    : `<p class="muted-copy">No payments yet.</p>`;

  const revenueEl = qs('#dailyRevenueList');
  if (revenueEl) {
    const maxRev = Math.max(1, ...data.daily_revenue.map((d) => Number(d.revenue)));
    revenueEl.innerHTML = data.daily_revenue.length
      ? data.daily_revenue.map((d) => `
        <div class="bar-row">
          <span class="bar-label">${new Date(d.day).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' })}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${(d.revenue / maxRev) * 100}%"></div></div>
          <span class="bar-value">${rupee(d.revenue)}</span>
        </div>
      `).join('')
      : `<p class="muted-copy">No revenue in the last 7 days yet.</p>`;
  }
}

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {
  const page = document.body.dataset.page;
  initAdminLogout();

  if (page === 'admin-login') {
    initAdminLoginPage();
    return;
  }

  const auth = await requireAdminAuth();
  if (!auth) return; // redirected to login

  if (page === 'admin-dashboard') initAdminDashboardPage();
  if (page === 'admin-menu') initAdminMenuPage();
  if (page === 'admin-orders') initAdminOrdersPage();
  if (page === 'admin-tables') initAdminTablesPage();
  if (page === 'admin-reports') initAdminReportsPage();
});
