# QuickCafe Admin Panel — Implementation Notes

The admin panel is built and live. This file is now a reference for what exists and how it works, not a plan.

## Demo login

URL: `admin/login.html`
Username: `admin`
Password: `admin123`

If you imported `database/quickcafe.sql` **before** this update, your `admin` row has an old placeholder password that won't verify. Run `database/fix_admin_password.sql` once to patch it in place — no need to re-import everything.

## Pages

| Page | Purpose |
|---|---|
| `admin/login.html` | Staff sign-in (session-based) |
| `admin/dashboard.html` | Orders today, revenue today, pending count, table availability, top seller, recent orders |
| `admin/manage-menu.html` | Add / edit / delete menu items, toggle availability |
| `admin/orders.html` | Live order queue with status filter pills; advance or cancel orders; auto-refreshes every 15s |
| `admin/tables.html` | Manually correct table status (Available / Occupied / Reserved) |
| `admin/reports.html` | 7-day revenue chart, top-selling items, payment mode breakdown |

## How auth works

This project is 100% static HTML + JSON APIs (no server-rendered pages), so the admin pages themselves can't be gated server-side the way a framework route would be. Instead:

- `php/admin_login.php` verifies the password with `password_verify()` and starts a PHP session.
- Every admin data endpoint (`admin_stats.php`, `admin_orders.php`, etc.) calls `require_admin()` from `php/admin_auth.php` first and returns HTTP 401 if there's no valid session — **this is the real protection**, since the data is what matters.
- Each admin page's JS calls `php/admin_session.php` on load; if it's not authenticated, it redirects to `login.html` before rendering anything useful.

This is good enough for a college project demo, but worth saying explicitly in a viva: a production system would also want HTTPS, CSRF tokens on state-changing requests, and rate-limiting on login attempts.

## How the customer ↔ admin sides connect

- A customer claims a table via `table.html` (`php/select_table.php`) or by placing an order — either way the table flips to **Occupied**.
- When staff mark an order **Served** or **Cancelled** in `admin/orders.html`, `php/update_order_status.php` automatically flips the table back to **Available** (unless it still has another active order).
- `admin/tables.html` lets staff override this manually at any time — e.g. a walk-in seated without an online order, or marking a table **Reserved** ahead of time.

## Endpoints added for the admin side

```
php/admin_auth.php              shared session-guard helpers (require_admin())
php/admin_login.php             POST { username, password }
php/admin_logout.php            POST — destroys the session
php/admin_session.php           GET — "am I logged in?" check used by every admin page
php/admin_stats.php             GET — dashboard numbers
php/admin_menu_items.php        GET — ALL items incl. Unavailable (unlike customer-facing get_menu.php)
php/admin_save_item.php         POST — create or update a menu item
php/admin_delete_item.php       POST — delete (blocked with a clear message if the item is used in a past order)
php/admin_orders.php            GET — all orders + line items, optional ?status= filter
php/update_order_status.php     POST { order_id, status } — also manages table availability automatically
php/admin_tables.php            GET — all tables (admin view)
php/admin_update_table_status.php  POST { table_id, status } — manual override
php/admin_reports.php           GET — 7-day revenue, top items, payment modes
```

Two endpoints are also used by the **customer** side (no login required):
```
php/get_tables.php       GET — public table list, used by table.html
php/select_table.php     POST { table_number } — claim an Available table
```

## Tested

Logged in (correct + wrong password + login-by-email), confirmed the session persists across requests and `admin_stats.php` returns 401 without it, ran every CRUD action on menu items including the foreign-key-conflict case, advanced an order through every status (and confirmed the table frees automatically on Served), and exercised `select_table.php`'s double-booking protection. All against a live MySQL instance.
