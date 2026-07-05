/* ============================================================
   QuickCafe — script.js
   Shared cart store, menu rendering (pulled from the Node/MongoDB API via
   fetch, with an offline fallback so the UI still demos nicely
   if the file is opened without a PHP server running), and the
   per-page init functions wired up at the bottom of this file.
   ============================================================ */

const CONFIG = {
  TAX_RATE: 0.05,
  API: {
    menu: 'api/menu',
    categories: 'api/categories',
    addOrder: 'api/orders',
    orderStatus: 'api/order-status',
    bill: 'api/bill',
    tables: 'api/tables',
    selectTable: 'api/select-table',
  },
};

/* Offline fallback so the interface still works if opened directly
   as a file:// page instead of through a PHP server. Mirrors database/quickcafe.sql. */
const FALLBACK_CATEGORIES = [
  { category_id: 1, category_name: 'Coffee', category_icon: 'mug-hot' },
  { category_id: 2, category_name: 'Tea', category_icon: 'leaf' },
  { category_id: 3, category_name: 'Cold Drinks', category_icon: 'glass-water' },
  { category_id: 4, category_name: 'Snacks', category_icon: 'cookie-bite' },
  { category_id: 5, category_name: 'Desserts', category_icon: 'cake-candles' },
];

const FALLBACK_TABLES = [
  { table_id: 1, table_number: 'Table 01', status: 'Available' },
  { table_id: 2, table_number: 'Table 02', status: 'Available' },
  { table_id: 3, table_number: 'Table 03', status: 'Occupied' },
  { table_id: 4, table_number: 'Table 07', status: 'Occupied' },
  { table_id: 5, table_number: 'Table 12', status: 'Available' },
];

const FALLBACK_MENU = [
  { item_id: 1, item_name: 'Cappuccino', description: 'Classic espresso with steamed milk foam', price: 149, rating: 4.6, category_name: 'Coffee', image: 'images/menu/cappuccino.svg' },
  { item_id: 2, item_name: 'Cafe Latte', description: 'Smooth espresso layered with warm milk', price: 139, rating: 4.5, category_name: 'Coffee', image: 'images/menu/cafe-latte.svg' },
  { item_id: 3, item_name: 'Espresso', description: 'Strong and bold single coffee shot', price: 99, rating: 4.7, category_name: 'Coffee', image: 'images/menu/espresso.svg' },
  { item_id: 4, item_name: 'Hazelnut Mocha', description: 'Espresso, chocolate and roasted hazelnut', price: 189, rating: 4.6, category_name: 'Coffee', image: 'images/menu/hazelnut-mocha.svg' },
  { item_id: 5, item_name: 'Masala Chai', description: 'Spiced black tea brewed with milk', price: 89, rating: 4.8, category_name: 'Tea', image: 'images/menu/masala-chai.svg' },
  { item_id: 6, item_name: 'Green Tea', description: 'Light antioxidant-rich steeped tea', price: 79, rating: 4.3, category_name: 'Tea', image: 'images/menu/green-tea.svg' },
  { item_id: 7, item_name: 'Cold Brew', description: 'Slow-steeped coffee served over ice', price: 169, rating: 4.6, category_name: 'Cold Drinks', image: 'images/menu/cold-brew.svg' },
  { item_id: 8, item_name: 'Mint Lemonade', description: 'Fresh mint, lemon and sparkling water', price: 129, rating: 4.4, category_name: 'Cold Drinks', image: 'images/menu/mint-lemonade.svg' },
  { item_id: 9, item_name: 'Cheese Sandwich', description: 'Grilled sandwich with melted cheese', price: 119, rating: 4.4, category_name: 'Snacks', image: 'images/menu/cheese-sandwich.svg' },
  { item_id: 10, item_name: 'Veg Puff', description: 'Flaky pastry with spiced vegetable filling', price: 99, rating: 4.2, category_name: 'Snacks', image: 'images/menu/veg-puff.svg' },
  { item_id: 11, item_name: 'Garlic Bread', description: 'Toasted bread with garlic herb butter', price: 129, rating: 4.5, category_name: 'Snacks', image: 'images/menu/garlic-bread.svg' },
  { item_id: 12, item_name: 'Chocolate Brownie', description: 'Rich fudgy brownie with cocoa', price: 129, rating: 4.8, category_name: 'Desserts', image: 'images/menu/chocolate-brownie.svg' },
  { item_id: 13, item_name: 'Blueberry Muffin', description: 'Soft muffin packed with blueberries', price: 119, rating: 4.3, category_name: 'Desserts', image: 'images/menu/blueberry-muffin.svg' },
];



// Real product photo URLs used as primary images. The local SVGs below stay as fallback
// so the project still works if the internet is unavailable.
const ITEM_PHOTO_URLS = {
  1: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?q=80&w=700&auto=format&fit=crop',
  2: 'https://images.unsplash.com/photo-1561882468-9110e03e0f78?q=80&w=700&auto=format&fit=crop',
  3: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?q=80&w=700&auto=format&fit=crop',
  4: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?q=80&w=700&auto=format&fit=crop',
  5: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=700&auto=format&fit=crop',
  6: 'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?q=80&w=700&auto=format&fit=crop',
  7: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?q=80&w=700&auto=format&fit=crop',
  8: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=700&auto=format&fit=crop',
  9: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?q=80&w=700&auto=format&fit=crop',
  10: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=700&auto=format&fit=crop',
  11: 'https://images.unsplash.com/photo-1619898804176-c2d8e2d97cc0?q=80&w=700&auto=format&fit=crop',
  12: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?q=80&w=700&auto=format&fit=crop',
  13: 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?q=80&w=700&auto=format&fit=crop',
};

const ITEM_IMAGE_FALLBACKS = {
  1: 'images/menu/cappuccino.svg',
  2: 'images/menu/cafe-latte.svg',
  3: 'images/menu/espresso.svg',
  4: 'images/menu/hazelnut-mocha.svg',
  5: 'images/menu/masala-chai.svg',
  6: 'images/menu/green-tea.svg',
  7: 'images/menu/cold-brew.svg',
  8: 'images/menu/mint-lemonade.svg',
  9: 'images/menu/cheese-sandwich.svg',
  10: 'images/menu/veg-puff.svg',
  11: 'images/menu/garlic-bread.svg',
  12: 'images/menu/chocolate-brownie.svg',
  13: 'images/menu/blueberry-muffin.svg',
};

function isLocalSvgPlaceholder(src) {
  return typeof src === 'string' && src.includes('images/menu/') && src.toLowerCase().endsWith('.svg');
}

function getItemImage(item) {
  const id = item && item.item_id;
  const image = item && item.image;
  // If DB has an uploaded/custom JPG/PNG or a remote image, use it.
  // If DB still has the local SVG placeholder, show the real photo URL first.
  if (image && !isLocalSvgPlaceholder(image)) return image;
  return ITEM_PHOTO_URLS[id] || image || ITEM_IMAGE_FALLBACKS[id] || 'images/menu/cappuccino.svg';
}

function getImageFallback(item) {
  const id = item && item.item_id;
  return ITEM_IMAGE_FALLBACKS[id] || 'images/menu/cappuccino.svg';
}

/* ---------- tiny utilities ---------- */
const qs = (sel, el = document) => el.querySelector(sel);
const qsa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
const rupee = (n) => '₹' + Number(n).toFixed(2).replace(/\.00$/, '');
const rupeeFixed = (n) => '₹' + Number(n).toFixed(2);

function showTransitionOverlay(title, description, durationMs) {
  return new Promise((resolve) => {
    let overlay = qs('.transition-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'transition-overlay';
      overlay.innerHTML = `
        <div class="transition-card">
          <div class="transition-spinner"></div>
          <div class="transition-title" style="font-family:var(--font-display);font-size:24px;font-weight:800;color:#2d1e13;margin-bottom:8px;"></div>
          <div class="transition-desc" style="font-size:14px;color:#7f5539;font-weight:800;"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    qs('.transition-title', overlay).textContent = title;
    qs('.transition-desc', overlay).textContent = description;
    
    overlay.offsetHeight; 
    overlay.classList.add('show');
    
    setTimeout(() => {
      overlay.classList.remove('show');
      setTimeout(() => resolve(), 400);
    }, durationMs);
  });
}

function showReadyCelebrationOverlay(orderId) {
  let overlay = qs('.ready-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'ready-overlay';
    overlay.innerHTML = `
      <div class="ready-modal">
        <div class="ready-icon-container">
          <i class="fa-solid fa-bell-concierge"></i>
        </div>
        <div class="ready-title">🛎️ Order is Ready!</div>
        <div class="ready-desc">Your fresh hot coffee brew is prepared and ready at the pick-up counter. Enjoy your meal!</div>
        <button class="ready-btn" type="button">Got It</button>
      </div>
    `;
    document.body.appendChild(overlay);
    
    qs('.ready-btn', overlay).addEventListener('click', () => {
      overlay.classList.remove('show');
    });
  }
  
  overlay.offsetHeight; 
  overlay.classList.add('show');
}

function updateCoverflowEffect(grid) {
  if (!grid) return;
  const rect = grid.getBoundingClientRect();
  const center = rect.left + rect.width / 2;
  const cards = Array.from(grid.querySelectorAll('.menu-card'));
  
  cards.forEach((card) => {
    const cardRect = card.getBoundingClientRect();
    const cardCenter = cardRect.left + cardRect.width / 2;
    const distanceFromCenter = cardCenter - center;
    const maxDistance = rect.width / 2 || 1;
    const ratio = Math.min(Math.max(distanceFromCenter / maxDistance, -1), 1);
    
    const rotation = ratio * -24;
    const scale = 1 - Math.abs(ratio) * 0.12;
    const translation = ratio * -18;
    const opacity = 1 - Math.abs(ratio) * 0.25;
    
    if (!card.matches(':hover')) {
      card.style.transform = `translateX(${translation}px) scale(${scale}) rotateY(${rotation}deg)`;
      card.style.opacity = opacity;
      card.style.filter = `brightness(${1 - Math.abs(ratio) * 0.12})`;
      card.style.zIndex = Math.round((1 - Math.abs(ratio)) * 10);
    }
  });
}

window.addEventListener('resize', () => {
  const grid = document.getElementById('menuGrid');
  if (grid) updateCoverflowEffect(grid);
});

function setupCheckoutInterceptors() {
  document.addEventListener('click', async (e) => {
    const anchor = e.target.closest('a');
    if (!anchor) return;
    
    const href = anchor.getAttribute('href');
    if (href && href.includes('cart.html')) {
      e.preventDefault();
      
      const cart = CartStore.get();
      if (!cart.length) {
        showToast('Your cart is empty. Add items first!', 'fa-shopping-cart');
        return;
      }
      
      if (localStorage.getItem('qc_table_selected') !== 'true') {
        await showTransitionOverlay('🪑 Connect a Table', 'Please select a table to proceed with checkout...', 1200);
        window.location.href = 'table.html?redirect=cart';
      } else {
        await showTransitionOverlay('🛒 Opening Cart', 'Loading your checkout items...', 1000);
        window.location.href = 'cart.html';
      }
    }
  });
}

function getTableNumber() {
  const url = new URLSearchParams(window.location.search);
  const fromUrl = url.get('table');
  if (fromUrl) {
    localStorage.setItem('qc_table', fromUrl);
    localStorage.setItem('qc_table_selected', 'true');
    return fromUrl;
  }
  return localStorage.getItem('qc_table') || 'Table 07';
}


/* ---------- theme switcher ---------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', 'light');
  localStorage.setItem('qc_theme', 'light');
}

function initTheme() {
  applyTheme('light');
}

function syncTableLabels() {
  qsa('[data-table-label]').forEach((el) => { el.textContent = getTableNumber(); });
}

function syncGuestLabels() {
  const guestName = localStorage.getItem('qc_guest_name') || 'Coffee Lover';
  qsa('[data-guest-name]').forEach((el) => { el.textContent = guestName; });
}

/* ---------- right rail mini order panel ---------- */
function renderQuickOrderPanel() {
  const list = qs('#quickOrderList');
  const count = CartStore.count();
  const total = CartStore.subtotal();

  qsa('[data-mini-cart-count]').forEach((el) => {
    el.textContent = `${count} ${count === 1 ? 'Item' : 'Items'}`;
  });
  qsa('[data-mini-cart-total]').forEach((el) => {
    el.textContent = rupee(total);
  });

  if (!list) return;
  const cart = CartStore.get();
  if (!cart.length) {
    list.innerHTML = `<div class="mini-empty"><i class="fa-solid fa-mug-hot"></i><p>Your cart is waiting for coffee.</p><a href="menu.html" style="color:var(--moss-bright);font-weight:900;">Browse Menu</a></div>`;
    return;
  }

  list.innerHTML = cart.slice(0, 4).map((c) => `
    <div class="quick-order-line" data-id="${c.item_id}">
      <img src="${getItemImage(c)}" alt="${c.item_name}" data-fallback="${getImageFallback(c)}" onerror="this.onerror=null;this.src=this.dataset.fallback || 'images/menu/cappuccino.svg';">
      <div class="quick-order-info">
        <h5>${c.item_name}</h5>
        <span>${rupee(c.price)} × ${c.quantity}</span>
      </div>
      <div class="quick-order-actions">
        <div class="qty-stepper">
          <button data-mini-action="dec"><i class="fa-solid fa-minus"></i></button>
          <span>${c.quantity}</span>
          <button data-mini-action="inc"><i class="fa-solid fa-plus"></i></button>
        </div>
        <button class="mini-remove" data-mini-action="remove" title="Remove"><i class="fa-regular fa-trash-can"></i></button>
      </div>
    </div>
  `).join('') + (cart.length > 4 ? `<p style="color:var(--muted);font-size:12px;font-weight:800;text-align:center;">+${cart.length - 4} more item(s) in cart</p>` : '');

  qsa('[data-mini-action]', list).forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.closest('.quick-order-line').dataset.id);
      const current = CartStore.qtyOf(id);
      const action = btn.dataset.miniAction;
      if (action === 'inc') CartStore.setQty(id, current + 1);
      if (action === 'dec') CartStore.setQty(id, current - 1);
      if (action === 'remove') CartStore.remove(id);
    });
  });
}

function initSoonLinks() {
  qsa('[data-soon]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Coming in the next build phase', 'fa-clock');
    });
  });
}

/* ---------- cart store (localStorage) ---------- */
const CartStore = {
  KEY: 'qc_cart',
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },
  save(cart) {
    localStorage.setItem(this.KEY, JSON.stringify(cart));
    updateCartBadges();
  },
  add(item) {
    const cart = this.get();
    const existing = cart.find((c) => c.item_id === item.item_id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...item, quantity: 1 });
    this.save(cart);
    showToast(`${item.item_name} added to cart`, 'fa-circle-check');
  },
  setQty(itemId, qty) {
    let cart = this.get();
    if (qty <= 0) {
      cart = cart.filter((c) => c.item_id !== itemId);
    } else {
      const existing = cart.find((c) => c.item_id === itemId);
      if (existing) existing.quantity = qty;
    }
    this.save(cart);
  },
  qtyOf(itemId) {
    const found = this.get().find((c) => c.item_id === itemId);
    return found ? found.quantity : 0;
  },
  remove(itemId) {
    this.save(this.get().filter((c) => c.item_id !== itemId));
  },
  clear() { this.save([]); },
  count() { return this.get().reduce((sum, c) => sum + c.quantity, 0); },
  totalQty() { return this.count(); },
  subtotal() { return this.get().reduce((sum, c) => sum + c.quantity * c.price, 0); },
};

function updateCartBadges() {
  const count = CartStore.count();
  const total = CartStore.subtotal();
  qsa('[data-cart-badge]').forEach((el) => {
    el.textContent = count;
    el.style.display = count > 0 ? 'inline-flex' : 'none';
  });
  qsa('[data-cart-dot]').forEach((el) => {
    el.style.display = count > 0 ? 'block' : 'none';
  });
  qsa('[data-cart-pill]').forEach((el) => {
    el.textContent = `${count} ${count === 1 ? 'Item' : 'Items'} | ${rupee(total)}`;
  });
  qsa('[data-cart-badge-count]').forEach((el) => {
    el.textContent = `${count} ${count === 1 ? 'Item' : 'Items'}`;
  });
  qsa('[data-cart-badge-pill]').forEach((el) => {
    el.textContent = count > 0 ? `${count} item${count !== 1 ? 's' : ''}` : '0 items';
  });
  document.dispatchEvent(new Event('qc:cart-updated'));
  syncTableLabels();
  syncGuestLabels();
  renderQuickOrderPanel();
}

/* ---------- toast ---------- */
let toastTimer = null;
function showToast(message, icon = 'fa-circle-check') {
  let toast = qs('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<i class="fa-solid ${icon}"></i><span>${message}</span>`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

/* ---------- mobile sidebar ---------- */
function initMobileNav() {
  const toggle = qs('[data-nav-toggle]');
  const sidebar = qs('.sidebar');
  if (!toggle || !sidebar) return;
  let backdrop = qs('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }
  const close = () => { sidebar.classList.remove('open'); backdrop.classList.remove('show'); };
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('show');
  });
  backdrop.addEventListener('click', close);
}

/* ---------- data fetching (with offline fallback) ---------- */
async function fetchCategories() {
  try {
    const res = await fetch(CONFIG.API.categories);
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    if (!data.success) throw new Error('api error');
    return data.categories;
  } catch {
    return FALLBACK_CATEGORIES;
  }
}

async function fetchMenu(category) {
  try {
    const url = category && category !== 'All Items'
      ? `${CONFIG.API.menu}?category=${encodeURIComponent(category)}`
      : CONFIG.API.menu;
    const res = await fetch(url);
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    if (!data.success) throw new Error('api error');
    return data.items;
  } catch {
    if (!category || category === 'All Items') return FALLBACK_MENU;
    return FALLBACK_MENU.filter((m) => m.category_name === category);
  }
}

async function fetchTables() {
  try {
    const res = await fetch(CONFIG.API.tables);
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();
    if (!data.success) throw new Error('api error');
    return data.tables;
  } catch {
    return FALLBACK_TABLES;
  }
}

async function claimTable(tableNumber) {
  try {
    const res = await fetch(CONFIG.API.selectTable, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table_number: tableNumber }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Could not select table');
    return data;
  } catch (err) {
    if (window.location.protocol === 'file:') {
      return { success: true, table_number: tableNumber, demo: true };
    }
    throw err;
  }
}

/* ---------- rendering: category pills ---------- */
function renderPills(container, categories, activeName, onSelect) {
  const iconMap = { Coffee: 'mug-hot', Tea: 'leaf', 'Cold Drinks': 'glass-water', Snacks: 'cookie-bite', Desserts: 'cake-candles' };
  const all = [{ category_name: 'All Items' }, ...categories];
  container.innerHTML = all.map((c) => `
    <button class="pill ${c.category_name === activeName ? 'active' : ''}" data-category="${c.category_name}">
      <i class="fa-solid fa-${c.category_name === 'All Items' ? 'border-all' : (iconMap[c.category_name] || 'leaf')}"></i>
      ${c.category_name}
    </button>
  `).join('');
  qsa('.pill', container).forEach((btn) => {
    btn.addEventListener('click', () => onSelect(btn.dataset.category));
  });
}

/* ---------- rendering: menu grid ---------- */
function renderMenuGrid(container, items, _preserveIndex) {
  if (!items.length) {
    container.innerHTML = `<div class="order-empty"><i class="fa-solid fa-mug-saucer"></i><p>No items in this category yet.</p></div>`;
    return;
  }
  
  // Preserve active carousel position across add-to-cart re-renders
  const savedIndex = _preserveIndex != null ? _preserveIndex
    : (container._carouselActiveIndex || 0);

  const N = items.length;
  const radius = Math.max(280, Math.min(380, 240 + N * 15));
  
  container.innerHTML = `
    <div class="menu-orbit-ring" style="transform: translateZ(-${radius}px);">
      ${items.map((item, index) => {
        const qty = CartStore.qtyOf(item.item_id);
        const angle = index * (360 / N);
        return `
        <div class="menu-card" 
             data-id="${item.item_id}" 
             data-index="${index}"
             style="--card-angle: ${angle}deg; --orbit-radius: ${radius}px;">
          <div class="menu-card-img">
            <img src="${getItemImage(item)}" alt="${item.item_name}" loading="lazy" data-fallback="${getImageFallback(item)}"
                 onerror="this.onerror=null;this.src=this.dataset.fallback || 'images/menu/cappuccino.svg';">
            <span class="menu-card-fav"><i class="fa-regular fa-heart"></i></span>
          </div>
          <div class="menu-card-body">
            <h4>${item.item_name}</h4>
            <p class="desc">${item.description || ''}</p>
            <span class="menu-card-rating"><i class="fa-solid fa-star"></i> ${Number(item.rating || 4.5).toFixed(1)}</span>
            <div class="menu-card-footer">
              <span class="menu-card-price">${rupee(item.price)}</span>
              ${qty > 0 ? `
                <div class="qty-stepper" data-qty-for="${item.item_id}">
                  <button data-action="dec"><i class="fa-solid fa-minus"></i></button>
                  <span>${qty}</span>
                  <button data-action="inc"><i class="fa-solid fa-plus"></i></button>
                </div>` : `
                <button class="add-btn" data-add="${item.item_id}"><i class="fa-solid fa-plus"></i></button>`
              }
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  `;

  qsa('[data-add]', container).forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = items.find((i) => i.item_id == btn.dataset.add);
      CartStore.add(item);
      // Pass current carousel position so it doesn't jump back to 0
      renderMenuGrid(container, items, container._carouselActiveIndex || 0);
    });
  });
  qsa('[data-qty-for]', container).forEach((stepper) => {
    const id = Number(stepper.dataset.qtyFor);
    qsa('button', stepper).forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const current = CartStore.qtyOf(id);
        CartStore.setQty(id, b.dataset.action === 'inc' ? current + 1 : current - 1);
        renderMenuGrid(container, items, container._carouselActiveIndex || 0);
      });
    });
  });

  if (container.id === 'menuGrid') {
    let activeIndex = savedIndex;
    const cards = qsa('.menu-card', container);

    function selectIndex(index) {
      activeIndex = ((index % N) + N) % N;
      const isMobile = window.innerWidth < 768;
      const spacing = isMobile ? 145 : 190;

      cards.forEach((card, idx) => {
        let diff = idx - activeIndex;
        if (diff > N / 2)  diff -= N;
        if (diff < -N / 2) diff += N;

        const absDiff = Math.abs(diff);
        const isActive = diff === 0;

        // Scale: active=1.18, direct neighbors=0.88, far=0.72
        let scale, translateZ, opacity, blur, rotateY;
        if (isActive) {
          scale      = 1.18;
          translateZ = 120;
          opacity    = 1;
          blur       = 0;
          rotateY    = 0;
        } else if (absDiff === 1) {
          scale      = 0.88;
          translateZ = -40;
          opacity    = 0.75;
          blur       = 0.6;
          rotateY    = diff > 0 ? -35 : 35;
        } else {
          scale      = Math.max(0.60, 0.72 - (absDiff - 2) * 0.06);
          translateZ = -120 - (absDiff - 2) * 60;
          opacity    = Math.max(0.10, 0.35 - (absDiff - 2) * 0.10);
          blur       = absDiff * 1.2;
          rotateY    = diff > 0 ? -55 : 55;
        }

        const translateX = diff * spacing;
        const zIndex = 100 - absDiff * 15;

        card.style.transform = `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`;
        card.style.zIndex    = zIndex;
        card.style.opacity   = opacity;
        card.style.filter    = blur > 0 ? `blur(${blur}px) brightness(0.72)` : 'brightness(1)';
        card.classList.toggle('active', isActive);
      });
      // Persist current position so add-to-cart re-render can restore it
      container._carouselActiveIndex = activeIndex;
    }

    selectIndex(savedIndex);

    // Click any card → bring it to center
    cards.forEach((card) => {
      card.addEventListener('click', (e) => {
        const index = Number(card.dataset.index);
        if (index !== activeIndex) {
          e.preventDefault();
          e.stopPropagation();
          selectIndex(index);
        }
      });

      // Hover lift on active card only
      card.addEventListener('mouseenter', () => {
        if (card.classList.contains('active')) {
          card.style.transform = `translateX(0px) translateZ(155px) rotateY(0deg) scale(1.24) translateY(-16px)`;
        }
      });
      card.addEventListener('mouseleave', () => {
        if (card.classList.contains('active')) selectIndex(activeIndex);
      });
    });

    // Arrow buttons
    const prevBtn = qs('#carouselPrev');
    const nextBtn = qs('#carouselNext');
    if (prevBtn) prevBtn.onclick = () => selectIndex(activeIndex - 1);
    if (nextBtn) nextBtn.onclick = () => selectIndex(activeIndex + 1);

    // Scroll wheel
    let lastScrollTime = 0;
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastScrollTime < 200) return;
      lastScrollTime = now;
      selectIndex(e.deltaY > 0 ? activeIndex + 1 : activeIndex - 1);
    }, { passive: false });

    // Touch swipe
    let touchStartX = 0;
    container.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    container.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) selectIndex(dx > 0 ? activeIndex - 1 : activeIndex + 1);
    }, { passive: true });

    // Keyboard arrow keys
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  selectIndex(activeIndex - 1);
      if (e.key === 'ArrowRight') selectIndex(activeIndex + 1);
    });

    // Sync the Go-to-Cart badge pill count
    function syncCartPill() {
      const pill = qs('[data-cart-badge-pill]');
      if (!pill) return;
      const total = CartStore.totalQty ? CartStore.totalQty() : 0;
      pill.textContent = total > 0 ? `${total} item${total > 1 ? 's' : ''}` : '0 items';
    }
    syncCartPill();
    document.addEventListener('qc:cart-updated', syncCartPill);
  }
}


function renderPopularGrid(container, items) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = `<div class="order-empty"><i class="fa-solid fa-mug-saucer"></i><p>No popular items available right now.</p></div>`;
    return;
  }

  // Render ALL items (not just 4) — arrows reveal hidden ones
  container.innerHTML = items.map((item, i) => {
    const qty = CartStore.qtyOf(item.item_id);
    return `
      <div class="popular-card pop-fade-in" data-id="${item.item_id}" style="animation-delay:${i * 60}ms">
        <div class="popular-card-media">
          <img src="${getItemImage(item)}" alt="${item.item_name}" loading="lazy" data-fallback="${getImageFallback(item)}"
               onerror="this.onerror=null;this.src=this.dataset.fallback || 'images/menu/cappuccino.svg';">
        </div>
        <div class="popular-card-info">
          <h4 class="popular-card-title">${item.item_name}</h4>
          <span class="popular-card-price">${rupee(item.price)}</span>
        </div>
        <div class="popular-card-controls">
          ${qty > 0 ? `
            <div class="qty-stepper compact" data-popular-qty="${item.item_id}">
              <button data-action="dec" aria-label="Decrease quantity"><i class="fa-solid fa-minus"></i></button>
              <span>${qty}</span>
              <button data-action="inc" aria-label="Increase quantity"><i class="fa-solid fa-plus"></i></button>
            </div>` : `
            <button class="add-btn popular-add-btn" data-popular-add="${item.item_id}" aria-label="Add ${item.item_name}">
              <i class="fa-solid fa-plus"></i>
            </button>`}
        </div>
      </div>`;
  }).join('');

  qsa('[data-popular-add]', container).forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = items.find((i) => i.item_id == btn.dataset.popularAdd);
      if (!item) return;
      CartStore.add(item);
      renderPopularGrid(container, items);
    });
  });

  qsa('[data-popular-qty]', container).forEach((stepper) => {
    const id = Number(stepper.dataset.popularQty);
    qsa('button', stepper).forEach((btn) => {
      btn.addEventListener('click', () => {
        const current = CartStore.qtyOf(id);
        CartStore.setQty(id, btn.dataset.action === 'inc' ? current + 1 : current - 1);
        renderPopularGrid(container, items);
      });
    });
  });

  // Arrow carousel controls (only wire once — check flag on stage)
  const stage = qs('#popularCarouselStage');
  const track = qs('.popular-track-wrap', stage);
  if (!stage || !track || stage._arrowsWired) return;
  stage._arrowsWired = true;

  const SCROLL_AMOUNT = 260; // px per arrow click

  function updateArrows() {
    const prev = qs('#popularPrev');
    const next = qs('#popularNext');
    if (!prev || !next) return;
    prev.style.opacity = track.scrollLeft <= 4 ? '0.35' : '1';
    next.style.opacity = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4 ? '0.35' : '1';
  }

  qs('#popularPrev').addEventListener('click', () => {
    track.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' });
  });
  qs('#popularNext').addEventListener('click', () => {
    track.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' });
  });
  track.addEventListener('scroll', updateArrows, { passive: true });
  updateArrows();

  // Mobile swipe
  let touchStartX = 0;
  track.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) track.scrollBy({ left: dx > 0 ? -SCROLL_AMOUNT : SCROLL_AMOUNT, behavior: 'smooth' });
  }, { passive: true });
}

/* ============================================================
   Page: Home (index.html)
   ============================================================ */
async function initHomePage() {
  const grid = qs('#previewMenuGrid');
  if (grid) {
    const items = await fetchMenu('All Items');
    renderPopularGrid(grid, items);
  }
}

/* ============================================================
   Page: Table (table.html)
   ============================================================ */
async function initTablePage() {
  const grid = qs('#tableStatusGrid');
  if (!grid) return;

  const url = new URLSearchParams(window.location.search);
  if (url.get('redirect') === 'cart') {
    const kicker = qs('.page-hero-card .kicker');
    if (kicker) kicker.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> Checkout Progress`;
    const heroTitle = qs('.page-hero-card h2');
    if (heroTitle) heroTitle.textContent = `Select Your Table`;
    const heroDesc = qs('.page-hero-card p');
    if (heroDesc) heroDesc.textContent = `Please select an available table from the list below to complete your checkout flow.`;
  }

  function renderTables(tables) {
    const currentTable = getTableNumber();
    grid.innerHTML = tables.map((table) => {
      const status = table.status || 'Available';
      const statusClass = status.toLowerCase();
      const isCurrent = table.table_number === currentTable;
      const selectable = status === 'Available' && !isCurrent;
      const label = isCurrent ? 'Your Table' : (status === 'Available' ? 'Free' : status);
      return `
        <button type="button"
          class="table-status ${statusClass} ${isCurrent ? 'current' : ''} ${selectable ? 'selectable' : ''}"
          data-select-table="${table.table_number}"
          ${selectable ? '' : 'disabled'}>
          ${table.table_number} <b>${label}</b>
        </button>`;
    }).join('');

    qsa('[data-select-table]', grid).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const tableNumber = btn.dataset.selectTable;
        btn.disabled = true;
        try {
          const result = await claimTable(tableNumber);
          localStorage.setItem('qc_table', result.table_number || tableNumber);
          localStorage.setItem('qc_table_selected', 'true');
          syncTableLabels();
          qsa('[data-table-number-text]').forEach((el) => { el.textContent = getTableNumber(); });
          
          const url = new URLSearchParams(window.location.search);
          if (url.get('redirect') === 'cart') {
            await showTransitionOverlay('✨ Table Connected!', 'Redirecting to your cart...', 1500);
            window.location.href = 'cart.html';
          } else {
            showToast(`${getTableNumber()} selected`, 'fa-chair');
            renderTables(await fetchTables());
          }
        } catch (err) {
          showToast(err.message || 'Could not select table', 'fa-triangle-exclamation');
          renderTables(await fetchTables());
        }
      });
    });
  }

  renderTables(await fetchTables());
}

/* ============================================================
   Page: Menu (menu.html)
   ============================================================ */
async function initMenuPage() {
  const grid = qs('#menuGrid');
  const pillRow = qs('#categoryPills');
  if (!grid || !pillRow) return;

  let active = 'All Items';
  const categories = await fetchCategories();

  const load = async () => {
    grid.innerHTML = `<div class="skeleton" style="height:220px;"></div><div class="skeleton" style="height:220px;"></div><div class="skeleton" style="height:220px;"></div>`;
    const items = await fetchMenu(active);
    renderMenuGrid(grid, items);
  };

  function selectCategory(cat) {
    active = cat;
    renderPills(pillRow, categories, active, selectCategory);
    load();
  }
  renderPills(pillRow, categories, active, selectCategory);

  // search box (optional, present on menu.html)
  const search = qs('#menuSearch');
  if (search) {
    search.addEventListener('input', async () => {
      const term = search.value.trim().toLowerCase();
      const items = await fetchMenu(active);
      const filtered = term ? items.filter((i) => i.item_name.toLowerCase().includes(term)) : items;
      renderMenuGrid(grid, filtered);
    });
  }

  load();
}

/* ============================================================
   Page: Cart (cart.html)
   ============================================================ */
function initCartPage() {
  const linesEl = qs('#cartLines');
  const subtotalEl = qs('#sumSubtotal');
  const taxEl = qs('#sumTax');
  const totalEl = qs('#sumTotal');
  const placeBtn = qs('#placeOrderBtn');
  const tableInput = qs('#tableNumberDisplay');
  if (!linesEl) return;

  if (tableInput) tableInput.textContent = getTableNumber();

  let selectedPayment = 'UPI';
  let appliedPromo = '';
  let discountAmount = 0;

  const promoInput = qs('#promoInput');
  const applyPromoBtn = qs('#applyPromoBtn');
  const promoFeedback = qs('#promoFeedback');
  const discountRow = qs('#discountRow');
  const discountName = qs('#discountName');
  const discountEl = qs('#sumDiscount');

  function validatePromo(code, subtotal) {
    const cleanCode = String(code || '').trim().toUpperCase();
    if (!cleanCode) return { valid: false, error: '' };
    if (cleanCode === 'WELCOME10') {
      return { valid: true, discount: subtotal * 0.10 };
    }
    if (cleanCode === 'FLAT20') {
      if (subtotal >= 599) {
        return { valid: true, discount: subtotal * 0.20 };
      } else {
        return { valid: false, error: 'Min order ₹599 required for FLAT20.' };
      }
    }
    return { valid: false, error: 'Invalid promo code.' };
  }

  if (applyPromoBtn && promoInput) {
    applyPromoBtn.addEventListener('click', () => {
      const code = promoInput.value;
      const subtotal = CartStore.subtotal();
      if (!subtotal) {
        showToast('Your cart is empty', 'fa-triangle-exclamation');
        return;
      }
      const result = validatePromo(code, subtotal);
      if (result.valid) {
        appliedPromo = code.trim().toUpperCase();
        discountAmount = result.discount;
        if (promoFeedback) {
          promoFeedback.textContent = `Promo code "${appliedPromo}" applied successfully!`;
          promoFeedback.style.color = 'var(--moss-bright)';
          promoFeedback.style.display = 'block';
        }
        showToast('Promo code applied!', 'fa-tag');
      } else {
        appliedPromo = '';
        discountAmount = 0;
        if (promoFeedback) {
          promoFeedback.textContent = result.error || 'Please enter a promo code.';
          promoFeedback.style.color = '#ef4444';
          promoFeedback.style.display = 'block';
        }
        showToast(result.error || 'Invalid code', 'fa-triangle-exclamation');
      }
      renderLines();
    });
  }

  function renderLines() {
    const cart = CartStore.get();
    if (!cart.length) {
      linesEl.innerHTML = `<div class="order-empty"><i class="fa-solid fa-cart-shopping"></i><p>Your cart is empty.</p><a href="menu.html">Browse the menu &rarr;</a></div>`;
      if (placeBtn) placeBtn.setAttribute('disabled', 'true');
      appliedPromo = '';
      discountAmount = 0;
      if (promoInput) promoInput.value = '';
      if (promoFeedback) promoFeedback.style.display = 'none';
    } else {
      linesEl.innerHTML = cart.map((c) => `
        <div class="cart-line" data-id="${c.item_id}">
          <img src="${getItemImage(c)}" alt="${c.item_name}" data-fallback="${getImageFallback(c)}" onerror="this.onerror=null;this.src=this.dataset.fallback || 'images/menu/cappuccino.svg';">
          <div class="cart-line-info">
            <h5>${c.item_name}</h5>
            <span>${rupee(c.price)} each</span>
          </div>
          <div class="cart-line-actions">
            <div class="qty-stepper">
              <button data-action="dec"><i class="fa-solid fa-minus"></i></button>
              <span>${c.quantity}</span>
              <button data-action="inc"><i class="fa-solid fa-plus"></i></button>
            </div>
            <button class="remove-line" data-remove="${c.item_id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `).join('');
      if (placeBtn) placeBtn.removeAttribute('disabled');
    }

    const subtotal = CartStore.subtotal();
    
    // Recalculate discount based on current subtotal
    if (appliedPromo) {
      const result = validatePromo(appliedPromo, subtotal);
      if (result.valid) {
        discountAmount = result.discount;
      } else {
        appliedPromo = '';
        discountAmount = 0;
        if (promoInput) promoInput.value = '';
        if (promoFeedback) {
          promoFeedback.textContent = result.error || 'Promo code removed due to cart changes.';
          promoFeedback.style.color = '#ef4444';
          promoFeedback.style.display = 'block';
        }
      }
    }

    if (discountRow && discountName && discountEl) {
      if (appliedPromo && discountAmount > 0) {
        discountRow.style.display = 'flex';
        discountName.textContent = appliedPromo;
        discountEl.textContent = '-' + rupeeFixed(discountAmount);
      } else {
        discountRow.style.display = 'none';
      }
    }

    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const tax = taxableAmount * CONFIG.TAX_RATE;
    const total = taxableAmount + tax;
    if (subtotalEl) subtotalEl.textContent = rupeeFixed(subtotal);
    if (taxEl) taxEl.textContent = rupeeFixed(tax);
    if (totalEl) totalEl.textContent = rupeeFixed(total);

    qsa('[data-action]', linesEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.closest('.cart-line').dataset.id);
        const current = CartStore.qtyOf(id);
        CartStore.setQty(id, btn.dataset.action === 'inc' ? current + 1 : current - 1);
        renderLines();
      });
    });
    qsa('[data-remove]', linesEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        CartStore.remove(Number(btn.dataset.remove));
        renderLines();
      });
    });
  }

  qsa('.payment-mode').forEach((el) => {
    el.addEventListener('click', () => {
      qsa('.payment-mode').forEach((p) => p.classList.remove('active'));
      el.classList.add('active');
      selectedPayment = el.dataset.mode;
    });
  });

  if (placeBtn) {
    placeBtn.addEventListener('click', async () => {
      const cart = CartStore.get();
      if (!cart.length) return;
      placeBtn.disabled = true;
      placeBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Placing order...`;

      const payload = {
        table_number: getTableNumber(),
        payment_mode: selectedPayment,
        promo_code: appliedPromo || undefined,
        items: cart.map((c) => ({ item_id: c.item_id, quantity: c.quantity })),
      };

      try {
        const res = await fetch(CONFIG.API.addOrder, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'failed');
        
        await showTransitionOverlay('🔒 Securing Checkout...', 'Verifying details with the server...', 1000);
        await showTransitionOverlay('☕ Sending to Kitchen...', 'Preparing your fresh brew...', 1000);
        await showTransitionOverlay('🎉 Order Confirmed!', 'Redirecting to status page...', 1200);

        localStorage.setItem('qc_last_order', data.order_id);
        CartStore.clear();
        window.location.href = `status.html?order=${data.order_id}`;
      } catch (e) {
        const fakeId = 'DEMO-' + Date.now().toString().slice(-6);

        await showTransitionOverlay('🔒 Offline Checkout...', 'Simulating transaction locally...', 1000);
        await showTransitionOverlay('☕ Sending to Kitchen...', 'Preparing your fresh brew...', 1000);
        await showTransitionOverlay('🎉 Order Confirmed!', 'Redirecting to status page...', 1200);

        localStorage.setItem('qc_last_order', fakeId);
        const currentSubtotal = CartStore.subtotal();
        const currentTaxable = Math.max(0, currentSubtotal - discountAmount);
        localStorage.setItem('qc_last_order_demo', JSON.stringify({
          items: cart, table: getTableNumber(), payment: selectedPayment,
          subtotal: currentSubtotal,
          discount: discountAmount,
          promo_code: appliedPromo || null,
          tax: currentTaxable * CONFIG.TAX_RATE,
          total: currentTaxable * (1 + CONFIG.TAX_RATE),
        }));
        CartStore.clear();
        window.location.href = `status.html?order=${fakeId}`;
      }
    });
  }

  renderLines();
}

/* ============================================================
   Page: Status (status.html)
   ============================================================ */
const STATUS_STEPS = ['Pending', 'Preparing', 'Ready', 'Served'];

async function initStatusPage() {
  const card = qs('#statusCard');
  if (!card) return;
  const url = new URLSearchParams(window.location.search);
  const orderId = url.get('order') || localStorage.getItem('qc_last_order');

  if (!orderId) {
    card.innerHTML = `<div class="order-empty"><i class="fa-solid fa-receipt"></i><p>No recent order found.</p><a href="menu.html">Go to menu &rarr;</a></div>`;
    return;
  }

  async function load() {
    let order;
    try {
      if (String(orderId).startsWith('DEMO-')) throw new Error('demo order');
      const res = await fetch(`${CONFIG.API.orderStatus}?order_id=${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (!data.success) throw new Error('not found');
      order = data.order;
    } catch {
      const demo = JSON.parse(localStorage.getItem('qc_last_order_demo') || '{}');
      const loadCountKey = `qc_demo_load_count_${orderId}`;
      let loadCount = Number(localStorage.getItem(loadCountKey) || 0) + 1;
      localStorage.setItem(loadCountKey, loadCount);
      
      let status = 'Preparing';
      if (loadCount >= 3) {
        status = 'Ready';
      }
      
      order = {
        order_id: orderId,
        order_status: status,
        table_number: demo.table || getTableNumber(),
        total_amount: demo.total || 0,
      };
    }
    renderStatus(order);
  }

  function renderStatus(order) {
    const currentIdx = STATUS_STEPS.indexOf(order.order_status);
    qs('#orderIdTag').textContent = `Order #${order.order_id}`;
    qs('#orderTableTag').textContent = order.table_number || '';
    qs('#statusBadgeText').textContent = order.order_status;

    qs('#stepperRow').innerHTML = STATUS_STEPS.map((step, i) => {
      const cls = i < currentIdx ? 'done' : (i === currentIdx ? 'current' : '');
      const icon = i < currentIdx ? 'fa-check' : ['fa-receipt', 'fa-fire-burner', 'fa-bell-concierge', 'fa-mug-hot'][i];
      return `<div class="step ${cls}"><div class="step-dot"><i class="fa-solid ${icon}"></i></div><span>${step}</span></div>`;
    }).join('');

    const billLink = qs('#viewBillLink');
    if (billLink) billLink.href = `bill.html?order=${order.order_id}`;

    if (order.order_status === 'Ready') {
      const shownKey = `qc_ready_shown_${order.order_id}`;
      if (localStorage.getItem(shownKey) !== 'true') {
        localStorage.setItem(shownKey, 'true');
        showReadyCelebrationOverlay(order.order_id);
      }
    }
  }

  load();
  setInterval(load, 5000);
}

/* ============================================================
   Page: Bill (bill.html)
   ============================================================ */
async function initBillPage() {
  const card = qs('#billCard');
  if (!card) return;
  const url = new URLSearchParams(window.location.search);
  const orderId = url.get('order') || localStorage.getItem('qc_last_order');

  if (!orderId) {
    card.innerHTML = `<div class="order-empty"><i class="fa-solid fa-receipt"></i><p>No order to bill yet.</p><a href="menu.html">Go to menu &rarr;</a></div>`;
    return;
  }

  let order, items;
  try {
    if (String(orderId).startsWith('DEMO-')) throw new Error('demo order');
    const res = await fetch(`${CONFIG.API.bill}?order_id=${encodeURIComponent(orderId)}`);
    const data = await res.json();
    if (!data.success) throw new Error('not found');
    order = data.order;
    items = data.items;
  } catch {
    const demo = JSON.parse(localStorage.getItem('qc_last_order_demo') || '{}');
    order = {
      order_id: orderId, order_date: new Date().toISOString(), table_number: demo.table || getTableNumber(),
      payment_mode: demo.payment || 'UPI', subtotal: demo.subtotal || 0, discount: demo.discount || 0, promo_code: demo.promo_code || null, tax: demo.tax || 0, total_amount: demo.total || 0,
    };
    items = (demo.items || []).map((i) => ({ item_name: i.item_name, quantity: i.quantity, price: i.price, total: i.price * i.quantity }));
  }

  qs('#billOrderId').textContent = `#${order.order_id}`;
  qs('#billTableNumber').textContent = order.table_number || '';
  qs('#billDate').textContent = new Date(order.order_date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  qs('#billPaymentMode').textContent = order.payment_mode;
  qs('#billRows').innerHTML = items.map((i) => `
    <tr><td>${i.item_name} <span style="color:var(--muted)">x${i.quantity}</span></td><td>${rupeeFixed(i.total)}</td></tr>
  `).join('');
  qs('#billSubtotal').textContent = rupeeFixed(order.subtotal);

  const discRow = qs('#billDiscountRow');
  const discName = qs('#billDiscountName');
  const discVal = qs('#billDiscount');
  if (discRow && order.discount > 0) {
    discRow.style.display = 'flex';
    discName.textContent = order.promo_code || 'Promo Code';
    discVal.textContent = '-' + rupeeFixed(order.discount);
  } else if (discRow) {
    discRow.style.display = 'none';
  }

  qs('#billTax').textContent = rupeeFixed(order.tax);
  qs('#billTotal').textContent = rupeeFixed(order.total_amount);
}


function initInfoPages() {
  qsa('[data-table-number-text]').forEach((el) => { el.textContent = getTableNumber(); });
  qsa('[data-cart-count-text]').forEach((el) => { el.textContent = CartStore.count(); });
  qsa('[data-cart-total-text]').forEach((el) => { el.textContent = rupee(CartStore.subtotal()); });

  const contactForm = qs('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      contactForm.reset();
      showToast('Message saved for café staff demo', 'fa-paper-plane');
    });
  }
}

function initHeroAnimations() {
  document.querySelectorAll('.hero').forEach((hero) => {
    if (!hero.querySelector('.hero-bg')) {
      const bg = document.createElement('div');
      bg.className = 'hero-bg';
      hero.prepend(bg);
    }
    for (let i = 0; i < 6; i++) {
      const particle = document.createElement('div');
      particle.className = 'hero-particle';
      const size = Math.floor(Math.random() * 8) + 4;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${Math.floor(Math.random() * 80) + 10}%`;
      particle.style.top = `${Math.floor(Math.random() * 80) + 10}%`;
      particle.style.animationDelay = `${Math.random() * 6}s`;
      particle.style.animationDuration = `${Math.random() * 6 + 6}s`;
      hero.appendChild(particle);
    }
  });
}

/* ============================================================
   Boot
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeroAnimations();
  initMobileNav();
  initSoonLinks();
  updateCartBadges();
  initInfoPages();
  setupCheckoutInterceptors();

  const page = document.body.dataset.page;
  if (page === 'home') initHomePage();
  if (page === 'table') initTablePage();
  if (page === 'menu') initMenuPage();
  if (page === 'cart') initCartPage();
  if (page === 'status') initStatusPage();
  if (page === 'bill') initBillPage();

  const printBtn = qs('#printBillBtn');
  if (printBtn) printBtn.addEventListener('click', () => window.print());
});
