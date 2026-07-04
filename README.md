<div align="center">

# ☕ QuickCafe

**A QR-based café ordering & billing system with a customer storefront, staff admin panel, and a Node.js/Express API backed by MongoDB Atlas.**

[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-000000?logo=three.js&logoColor=white)](https://threejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

[Features](#-project-highlights) • [Tech Stack](#-tech-stack) • [Demo Flow](#-demo-flow) • [Setup](#-setup) • [API](#-api-overview) • [Structure](#-project-structure)

</div>

---

QuickCafe is a complete project demo of a café ordering system: customers select a table, browse the menu, place an order, track its status, and print a bill — while staff manage the menu, live orders, tables, and sales reports from a dedicated admin dashboard.

## ✨ Project Highlights

- 🎬 **Dual entry experience** — a premium landing portal for admin login and customer table sessions
- 🛒 **Customer ordering flow** — table selection, menu categories, live search, cart quantity controls, promo codes, 5% tax, order status tracking, and printable bills
- 📊 **Staff admin panel** — authentication, dashboard metrics, menu CRUD, live order queue, table status control, and sales reports
- 🗄️ **MongoDB Atlas backend** with Express routes for both customer and admin workflows
- 🔒 **Server-side pricing** — order totals are recalculated from database menu prices instead of trusting the browser
- 📴 **Offline-friendly fallbacks** for menu, table, order status, and bill views when static pages are opened without the API
- 📱 **Fully responsive UI** built with HTML, CSS, and JavaScript, plus real product imagery and local SVG fallbacks

## 🛠️ Tech Stack

| Layer | Tools |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| UI assets | Font Awesome, Lucide icons, Google Fonts, Three.js landing background |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Auth | bcryptjs password hashing, HTTP-only admin session cookie |
| Config | dotenv |

## 🎥 Demo Flow

1. Open the app at `http://localhost:3000/`.
2. For a **customer demo**, switch to customer mode, enter a guest name, choose a table, and start browsing.
3. Add items from `menu.html`, review them in `cart.html`, apply an optional promo code, and place the order.
4. Track the order from `status.html` — staff updates on the admin side are reflected live in the customer status flow.
5. Open `bill.html` from the order status page to view and print the final bill.
6. For a **staff demo**, log in with the seeded admin account and manage operations from `admin/dashboard.html`.

**Demo admin credentials** (after seeding):

```text
Username: admin
Password: admin123
```

**Demo promo codes:**

| Code | Discount |
|---|---|
| `WELCOME10` | 10% off |
| `FLAT20` | 20% off when subtotal is at least ₹599 |

## 📄 Main Pages

| Page | Purpose |
|---|---|
| `index.html` | Premium landing/login portal for admin and customer entry |
| `customer.html` | Customer home dashboard with popular picks and mini order panel |
| `menu.html` | Full menu with categories, search, add-to-cart controls, and image fallbacks |
| `cart.html` | Cart review, promo validation, payment mode, tax, and order placement |
| `status.html` | Order progress tracker that polls the backend every 5 seconds |
| `bill.html` | Printable invoice with itemized totals |
| `table.html` | Table selection and QR-style table session flow |
| `offers.html` | Promotional offers for the customer side |
| `profile.html` | Demo guest profile and loyalty-style content |
| `about.html` | Project and cafe information |
| `contact.html` | Demo contact form and cafe contact details |
| `admin/login.html` | Staff sign-in |
| `admin/dashboard.html` | Daily orders, revenue, pending orders, table availability, and recent activity |
| `admin/manage-menu.html` | Add, edit, delete, and toggle menu items |
| `admin/orders.html` | Filter orders, advance statuses, cancel active orders, and auto-refresh every 15 seconds |
| `admin/tables.html` | Update table state as Available, Occupied, or Reserved |
| `admin/reports.html` | Revenue, top items, payment mode, and order reporting |

## 🚀 Setup

### 1. Install Requirements

Install Node.js and create a MongoDB Atlas cluster, then install the project dependencies:

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the MongoDB connection string:

```text
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=quickcafe_db
PORT=3000
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@quickcafe.com
ADMIN_PASSWORD=admin123
REPORT_TIMEZONE=Asia/Kolkata
```

### 3. Seed Demo Data

This clears and rebuilds the demo collections, including categories, tables, menu items, one sample order, counters, and the admin account:

```bash
npm run seed
```

### 4. Start the App

```bash
npm start
```

Open:

```text
http://localhost:3000/
```

> **Windows/PowerShell tip:** if PowerShell blocks npm scripts, use the `.cmd` form:
> ```bash
> npm.cmd run seed
> npm.cmd start
> ```

## 📜 Available Scripts

| Script | What it does |
|---|---|
| `npm start` | Starts the Express server |
| `npm run dev` | Starts the same server for local development |
| `npm run seed` | Rebuilds MongoDB demo data |
| `npm run check` | Runs JavaScript syntax checks for frontend, admin, server, and seed files |

## 🔌 API Overview

**Customer routes**

```text
GET  /api/categories
GET  /api/menu
POST /api/orders
GET  /api/order-status?order_id=1
GET  /api/bill?order_id=1
GET  /api/tables
POST /api/select-table
POST /api/log-error
```

**Admin routes**

```text
POST /api/admin/login
POST /api/admin/logout
GET  /api/admin/session
GET  /api/admin/stats
GET  /api/admin/menu-items
POST /api/admin/save-item
POST /api/admin/delete-item
GET  /api/admin/orders
POST /api/admin/update-order-status
GET  /api/admin/tables
POST /api/admin/update-table-status
GET  /api/admin/reports
```

## 🗄️ Database Collections

The seed script creates these MongoDB collections:

| Collection | Role |
|---|---|
| `admin` | Staff account with hashed password |
| `categories` | Menu categories |
| `cafe_tables` | Table numbers, QR references, and availability |
| `menu_items` | Menu catalog with prices, descriptions, ratings, images, and availability |
| `orders` | Customer orders, line items, totals, promo codes, tax, and order status |
| `payments` | Payment mode and payment status records |
| `counters` | Auto-increment style IDs for orders, payments, and menu items |

## 📁 Project Structure

```text
QuickCafe/
├── index.html                 Landing portal
├── customer.html              Customer dashboard
├── menu.html                  Menu and ordering
├── cart.html                  Checkout
├── status.html                Order tracking
├── bill.html                  Printable bill
├── table.html                 Table selection
├── offers.html                Customer offers
├── profile.html               Guest profile
├── about.html                 About page
├── contact.html                Contact page
├── css/
│   ├── landing.css            Landing portal styling
│   └── style.css              Customer interface design system
├── js/
│   ├── landing.js             Landing login/customer mode logic
│   ├── script.js               Customer app logic and offline fallbacks
│   └── admin.js                Admin panel logic
├── server/
│   ├── server.js               Express API and static server
│   └── seed.js                 MongoDB demo data seed
├── admin/
│   ├── login.html
│   ├── dashboard.html
│   ├── manage-menu.html
│   ├── orders.html
│   ├── tables.html
│   ├── reports.html
│   └── admin.css
├── images/
│   ├── hero/                   Landing and cafe visuals
│   └── menu/                   Local SVG fallback artwork
├── MONGODB_ATLAS_SETUP.md      Extra Atlas setup notes
├── package.json
├── .env.example
└── README.md
```

## 🔐 Reliability & Security Notes

- Admin passwords are hashed with bcrypt before being stored
- Admin-only API routes require a valid session cookie
- Order creation recalculates item prices, discount, tax, and totals on the server
- Menu item deletion is blocked when an item already exists inside an order
- Tables automatically become **Occupied** when claimed or ordered from, then are freed when orders are **Served** or **Cancelled**
- Local image fallbacks prevent broken menu cards when remote photos fail
- Static customer pages still present a usable demo even when the backend is unavailable

> For production use, add HTTPS, persistent session storage, CSRF protection, rate limiting, stricter input validation, and role-based staff permissions.

## 🎓 Viva Points

- Demonstrates both customer-facing ordering **and** staff-side operations, not just a menu page
- The QR/table concept is represented through table-specific sessions and table availability logic
- Order totals are protected because the backend performs the final price calculation
- Staff can update order progress, and the customer tracking page refreshes automatically
- MongoDB collections are modeled around real café operations: menu, tables, orders, payments, and reports
- Practical UI polish: responsive navigation, image fallbacks, promo codes, printable bills, and admin analytics

## 🧯 Troubleshooting

| Problem | Fix |
|---|---|
| `MONGODB_URI is missing` | Create `.env` from `.env.example` and add your Atlas connection string |
| Cannot connect to Atlas | Check database user, password, cluster URL, and Atlas Network Access IP allowlist |
| Admin login fails | Run `npm run seed` again or verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env` |
| Orders do not save | Make sure the app is opened through `http://localhost:3000/`, not only as a file |
| Images do not load | The app falls back to local SVG artwork from `images/menu/` |
| PowerShell blocks npm scripts | Use `npm.cmd run seed` and `npm.cmd start` |

## 🗺️ Future Improvements

- [ ] Generate actual QR images for each table
- [ ] Add kitchen display mode for staff
- [ ] Persist sessions in MongoDB or Redis
- [ ] Add payment gateway integration
- [ ] Add exportable PDF bills and daily sales reports
- [ ] Add inventory tracking for menu items

## 📝 License

This project is available under the [MIT License](LICENSE).

---

<div align="center">

Built with ☕ by [karan0dev](https://github.com/karan0dev)

</div>
