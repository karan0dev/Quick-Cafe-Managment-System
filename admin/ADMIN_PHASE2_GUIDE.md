# QuickCafe Admin Panel — Phase 2 Build Guide

This project is customer-facing right now. To add the admin panel, build these modules:

## Admin features

1. **Admin Login**
   - Page: `admin/login.html`
   - PHP: `php/admin_login.php`
   - Table: `admin`
   - Use `password_hash()` and `password_verify()` for secure password handling.

2. **Dashboard Overview**
   - Page: `admin/dashboard.html`
   - Show total orders, today revenue, pending orders, available tables and popular item.
   - PHP: `php/admin_stats.php`

3. **Manage Menu**
   - Page: `admin/manage-menu.html`
   - Admin can add, edit, delete and mark menu items unavailable.
   - PHP endpoints:
     - `php/admin_add_item.php`
     - `php/admin_update_item.php`
     - `php/admin_delete_item.php`
   - Database table: `menu_items`

4. **Order Management**
   - Page: `admin/orders.html`
   - Show all orders with table number, items, bill amount and current status.
   - Admin can change status: `Pending → Preparing → Ready → Served`.
   - PHP endpoint: `php/update_order_status.php`
   - Tables used: `orders`, `order_items`, `menu_items`, `cafe_tables`

5. **Table Availability**
   - Page: `admin/tables.html`
   - Show which tables are `Available`, `Occupied`, or `Reserved`.
   - When an order is active, set table to `Occupied`.
   - When order is served/paid, set table back to `Available`.
   - PHP endpoint: `php/admin_update_table.php`
   - Database table: `cafe_tables`

6. **Reports**
   - Page: `admin/reports.html`
   - Daily revenue, top-selling items, number of orders, payment mode summary.
   - PHP: `php/admin_reports.php`

## Suggested admin folder structure

```text
admin/
├── login.html
├── dashboard.html
├── manage-menu.html
├── orders.html
├── tables.html
└── reports.html

php/
├── admin_login.php
├── admin_stats.php
├── admin_add_item.php
├── admin_update_item.php
├── admin_delete_item.php
├── update_order_status.php
├── admin_update_table.php
└── admin_reports.php
```

## Important database notes

- `menu_items` already supports add/edit/delete style work.
- `orders.order_status` already supports live status updates.
- `cafe_tables.status` already supports table availability tracking.
- `status.html` already polls order status every 6 seconds, so admin changes can appear live on the customer side.

## Viva explanation line

“The admin panel will allow café staff to manage menu items, update orders in real time, view bills, track table availability and analyze daily sales, while the customer interface remains a QR-based ordering flow.”
