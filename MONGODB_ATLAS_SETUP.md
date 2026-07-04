# QuickCafe MongoDB Atlas Setup

This project now has a Node.js backend that replaces the PHP/MySQL API layer.
MongoDB Atlas stores the cafe data, and the existing HTML/CSS/JavaScript UI keeps working with the new `/api/...` routes.

## 1. Create Atlas Database

1. Create a free MongoDB Atlas cluster.
2. Create a database user with read/write permission.
3. Add your current IP address in Atlas Network Access.
4. Copy the connection string. It looks like:

```text
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
```

## 2. Configure This Project

Copy `.env.example` to `.env`, then replace `MONGODB_URI` with your Atlas connection string.

```text
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=quickcafe_db
PORT=3000
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@quickcafe.com
ADMIN_PASSWORD=admin123
```

## 3. Install And Seed

```bash
npm install
npm run seed
npm start
```

If PowerShell says running scripts is disabled, use the Windows npm command directly:

```bash
npm.cmd run seed
npm.cmd start
```

Open:

```text
http://localhost:3000/index.html
```

Admin:

```text
http://localhost:3000/admin/login.html
username: admin
password: admin123
```

## 4. New API Routes

Customer routes:

```text
GET  /api/categories
GET  /api/menu
POST /api/orders
GET  /api/order-status?order_id=1
GET  /api/bill?order_id=1
GET  /api/tables
POST /api/select-table
```

Admin routes:

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

The old `php/` folder can stay as a legacy fallback/reference, but the preferred workflow is now Node.js plus MongoDB Atlas.
