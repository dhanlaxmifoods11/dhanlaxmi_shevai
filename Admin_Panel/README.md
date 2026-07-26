# Admin Panel — Developer README

This file explains the Admin Panel (Admin_Panel/) code, how it integrates with the Google Apps Script backend, and how to operate and maintain it. It is written for developers who will maintain or extend the admin UI and for technically-capable shop owners who need to understand where orders come from and how to troubleshoot.

Location: `Admin_Panel/`

Important files

- `admin.html` — Main admin dashboard page (lists orders, filters, bulk actions).
- `admin.js` — Core JavaScript for the dashboard. Key responsibilities:
  - Fetch orders from the API (Google Apps Script) using `API_URL`.
  - Display orders and update dashboard statistics (functions: `loadOrders`, `displayOrders`, `updateDashboardStats`).
  - Filter orders by date, status, and search (`filterOrders`).
  - Handle order edits and creation (`openOrderModal`, `handleOrderSubmit`, `editOrderModal`).
  - Mixed-shevai support and item row templates (`addItemRow`, `handleItemTypeChange`, `updateItemRate`, `calculateTotal`).
  - Delivery and payment flows (`deliverOrder`, `showPaymentModal`, `updatePayment`).
  - Bulk actions: status update, print, delete, export (`bulkUpdateStatus`, `bulkPrint`, `bulkDelete`, `exportOrders`).
- `auth.js` — Lightweight client-side authentication helpers and utilities used by the UI. Currently `getCurrentUser()` returns a dummy Admin object. If you need real authentication, replace client-side logic with a server-backed solution.
- `accounts.html`, `accounts.js`, `change_password.html` — Account management screens for the admin user.
- `invoice.html` and `invoice.css` — Print-ready invoice template used when printing or saving order receipts.
- `admin.css`, `accounts.css`, `invoice.css` — Styles for the admin UI.
- `manifest.json`, `sw.js` — Optional PWA metadata and service worker for the admin pages (caching/offline behaviour).

API / Backend integration

- `admin.js` uses a single backend endpoint defined at the top of the file:

  const API_URL = 'https://script.google.com/macros/s/AKfycbzcQviEyybujCo-XM-CEHQXZdMYcyv2tmNAauY2HWwQ5BCyjURVxDo1wk8dEOgoiCg/exec';

  This endpoint is a Google Apps Script Web App deployed by the business owner. The Admin Panel uses POST requests with a JSON body to perform actions such as `getOrders`, `addOrder`, `updateStatus`, `deliverOrder`, `updatePayment`, `deleteOrder`, and `getRawMaterials`.

- The Admin Panel expects the Apps Script endpoint to respond with JSON. Example request bodies:
  - `{ action: 'getOrders' }` — returns an array of orders (each order is an object with keys like `Order ID`, `Timestamp`, `नाव`/`Name`, `मोबाईल`/`Mobile`, `ऑर्डर डिटेल्स`/`Items`, `एकूण`/`Total`, `Status`, etc.)
  - `{ action: 'addOrder', name, mobile, address, items, deliveryDate, priority, total, note }` — creates a new order
  - `{ action: 'updateStatus', rowNumber, newStatus }` — updates status for a given row
  - `{ action: 'deliverOrder', row }` — marks order delivered and may return stock warnings
  - `{ action: 'updatePayment', orderId, advancePaid, updatedBy }` — updates payment for order ID

Where to change the API URL

- The endpoint URL is used in these files and places:
  - `Admin_Panel/admin.js` (top `API_URL` constant)
  - `index.html` and `Dhanlaxmi_App/script_app.js` (they use `SCRIPT_URL` to post new orders)

If you move the Apps Script to another Google account or redeploy, update the URL in all three locations.

How orders look (data format expectations)

- Orders in the Apps Script response are objects. The UI uses a helper `getKey(order, possibleKeys)` to be robust to different column/key names. Example fields used by the UI:
  - `Order ID` or `OrderID`
  - `Timestamp` (or `Date` inside Timestamp)
  - `नाव` / `Name`
  - `मोबाईल` / `Mobile`
  - `ऑर्डर डिटेल्स` / `Items` (string listing items, `|` separated for multiple items)
  - `एकूण` / `Total` (total amount)
  - `Advance Paid` / `Advance` (amount paid in advance)
  - `Status` (order status in Marathi: 'नवीन ऑर्डर', 'प्रक्रिया सुरू', 'तयार', 'डिलिव्हर')

Key client-side flows and functions (quick reference)

- loadOrders() — POST `{action: 'getOrders'}` to API_URL and stores response in `allOrders`.
- displayOrders(orders) — renders an HTML table using `orders` array. It computes payment status, balance, and renders action buttons.
- handleOrderSubmit(e) — collects data from the add/edit order modal, formats items (supports mixed shevai), and POSTs add/update to API_URL.
- editOrderModal(row) — reads an order, parses items (supports regex parsing for mixed items) and fills the add/edit modal for editing.
- calculateTotal() — iterates item rows, supports mixed shevai (rava + gahu / rava + maida), updates `totalAmount` input.
- deliverOrder(row) — sends `{action:'deliverOrder', row}` to API. On success it reloads orders and shows payment modal.
- updatePayment(orderId, totalPaidAmount) — updates advance paid for an order via API.

Running and testing locally

1. Open `Admin_Panel/admin.html` in a browser. Because admin.html makes network calls to the Apps Script endpoint, ensure you have network access.
2. Open browser DevTools → Network to inspect requests to `API_URL`. Check response bodies for errors.
3. If the Apps Script endpoint is not deployed for `Anyone (even anonymous)` you will see permission errors — see Apps Script README in this folder for deployment steps.

Security notes and recommendations

- Current auth is client-side and not secure. For production use we recommend implementing a small server-side login system (Node/Express, Flask, or Firebase Authentication) and moving admin actions behind the server. The client-side JS should not store real passwords or secrets.
- Limit access to the Google Apps Script and Google Sheet to only trusted Google accounts. If you must allow anonymous access to the script (so site can POST without signing in), ensure the script sanitizes input and keeps only necessary columns.

Maintenance tips

- Price updates are in the front-end order forms (`admin.html` modal templates and `index.html` / `Dhanlaxmi_App/index.html`). Update the option `data-rate` attributes or the value attributes.
- Backup the Google Sheet regularly: see Apps Script README below for methods.
- If you change column names in the Google Sheet, adjust `getKey()` checks or ensure the script returns consistent keys.

Adding features

- To add a new order status: update `status` options in `displayOrders` (the status dropdown HTML) and ensure the Apps Script accepts and stores the new status values.
- To add product SKUs or inventory, extend `getRawMaterials` endpoint (the script already exposes `getRawMaterials`) and the UI will receive `allMaterials` via `loadMaterials()`.

Support

If you want, I can:
- Add a small server-side example (Node + Express) to serve the Admin Panel and handle secure authentication.
- Add unit tests and E2E tests (Cypress) to automate manual E2E test plan.

---

# Apps Script README (brief) — see Admin_Panel/AppsScript_README.md for the full guide

(If you don't see `AppsScript_README.md` in this folder, check the root README for the Apps Script URL and details.)
