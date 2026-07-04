QuickCafe images folder

The SVG files in images/menu are offline fallback graphics.
The live menu now uses real product photo URLs from js/script.js and database/quickcafe.sql.

If photos still do not show after replacing the project files:
1. Open phpMyAdmin.
2. Select quickcafe_db.
3. Run database/update_menu_images.sql.
4. Refresh the browser with Ctrl + F5.
