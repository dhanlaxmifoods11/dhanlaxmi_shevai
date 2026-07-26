# Google Apps Script — Integration README

This document explains the Google Apps Script web endpoint used by the website, app and Admin Panel to store and manage orders in a Google Sheet. It includes:
- the exact script URLs the repo currently uses
- a deployable example Apps Script (doPost) you can copy-paste and deploy
- expected Google Sheet layout (columns)
- request/response shapes used by the frontend
- how to deploy, test and secure the Apps Script
- backup recommendations

---

SCRIPT URLs referenced in this repository

- Admin Panel (Admin_Panel/admin.js) API_URL:
  https://script.google.com/macros/s/AKfycbzcQviEyybujCo-XM-CEHQXZdMYcyv2tmNAauY2HWwQ5BCyjURVxDo1wk8dEOgoiCg/exec

- Website root (index.html) SCRIPT_URL (used to save order from website):
  https://script.google.com/macros/s/AKfycbzcQviEyybujCo-XM-CEHQXZdMYcyv2tmNAauY2HWwQ5BCyjURVxDo1wk8dEOgoiCg/exec

- PWA app (Dhanlaxmi_App/script_app.js) SCRIPT_URL: (same URL above)

If you redeploy or move the Apps Script, update this URL in these three places.

---

Non-technical overview

- The web pages (website + app) POST order data to the Apps Script URL. The script writes orders as rows into a Google Sheet.
- The Admin Panel calls the same Apps Script with actions like `getOrders`, `updateStatus`, `deliverOrder`, `updatePayment`, `deleteOrder`, and `getRawMaterials` to read and modify orders.

---

Recommended Google Sheet layout (one sheet named `Orders`)

Suggested columns (order in sheet matters only for human readability; the script will read/return by header name):

- Timestamp (ISO string or date)
- Order ID (unique string)
- Name (customer name)
- Mobile (customer mobile)
- Address
- Items (single string, ` | ` separated if multiple)
- Total
- Advance Paid
- Balance
- Status (e.g., 'नवीन ऑर्डर', 'प्रक्रिया सुरू', 'तयार', 'डिलिव्हर')
- Priority (normal / urgent)
- Delivery Date
- Actual Delivery Date
- Note
- Row (sheet row number, optional)

You can adapt the column names; the Admin Panel is tolerant because it looks up fields by several possible localized names (see getKey function in admin.js).

---

Frontend -> Apps Script: request/response shapes (summary)

All requests in the current code use POST with a JSON string body. Content-Type used by the JS is `text/plain;charset=utf-8` but the body is JSON text. The script should parse request data as JSON.

Common actions:
- getOrders
  - Request body: { action: 'getOrders' }
  - Response: JSON array of order objects. Each object should include the columns from the sheet as keys. Example: [{ "Order ID": "ORD-123", "Timestamp": "2026-07-26T10:00:00Z", "Name": "Suresh", "Mobile": "9561297071", "Items": "रवा - 2Kg x ₹140", "Total": "140", "Status": "नवीन ऑर्डर" }, ...]

- addOrder
  - Request: { action: 'addOrder', name, mobile, address, items, deliveryDate, priority, total, note }
  - Response: { success: true, orderId: 'ORD-...' } or { error: 'message' }

- updateOrder
  - Request: { action: 'updateOrder', row: <row number or id>, ...fields... }
  - Response: { success: true }

- updateStatus
  - Request: { action: 'updateStatus', rowNumber, newStatus, actualDeliveryDate? }
  - Response: { success: true }

- deliverOrder
  - Request: { action: 'deliverOrder', row }
  - Response: { success: true, stockWarning?: 'message' }

- updatePayment
  - Request: { action: 'updatePayment', orderId, advancePaid, updatedBy }
  - Response: { success: true }

- deleteOrder
  - Request: { action: 'deleteOrder', row }
  - Response: { success: true }

- getRawMaterials
  - Request: { action: 'getRawMaterials' }
  - Response: array/object with materials data

---

Deployable Apps Script example (copy-paste)

This is a complete Google Apps Script (Code.gs). Create a new Apps Script project, paste this code and update the SHEET_ID constant to your Google Sheet ID, then deploy as a web app.

```javascript
/*
  Example Apps Script for Dhanlaxmi Foods - Order backend
  - Deploy as Web App (Execute as: Me, Who has access: Anyone, even anonymous) if you want the public website to post without signing in.
  - NOTE: allowing anonymous access means anyone can POST. If you restrict access, web pages must be authenticated.
*/

const SHEET_ID = 'REPLACE_WITH_YOUR_GOOGLE_SHEET_ID'; // e.g. '1a2b3c...'
const ORDERS_SHEET_NAME = 'Orders';

function doPost(e) {
  try {
    const raw = e.postData.contents;
    const data = JSON.parse(raw);
    const action = (data.action || '').trim();

    if (!action) return jsonResponse({ error: 'No action provided' });

    if (action === 'getOrders') return getOrders();
    if (action === 'addOrder') return addOrder(data);
    if (action === 'updateOrder') return updateOrder(data);
    if (action === 'updateStatus') return updateStatus(data);
    if (action === 'deliverOrder') return deliverOrder(data);
    if (action === 'updatePayment') return updatePayment(data);
    if (action === 'deleteOrder') return deleteOrder(data);
    if (action === 'getRawMaterials') return getRawMaterials(data);

    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// Utility: return JSON HTTP response
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Helper: get sheet and header mapping
function getSheetAndHeaders() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  if (!sheet) throw new Error('Orders sheet not found: ' + ORDERS_SHEET_NAME);

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return { sheet, headers };
}

function getOrders() {
  const { sheet, headers } = getSheetAndHeaders();
  const rows = sheet.getRange(2, 1, Math.max(0, sheet.getLastRow() - 1), headers.length).getValues();
  const orders = rows.map((row, idx) => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    // include Row number for convenient updates
    obj.Row = idx + 2; // sheet row number
    return obj;
  });
  return jsonResponse(orders);
}

function addOrder(data) {
  const { sheet, headers } = getSheetAndHeaders();

  const orderId = 'ORD-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const timestamp = new Date().toISOString();

  // Build row based on headers
  const row = headers.map(h => {
    const key = h.toString();
    if (/timestamp/i.test(key)) return timestamp;
    if (/order id/i.test(key)) return orderId;
    if (/name/i.test(key)) return data.name || '';
    if (/mobile/i.test(key)) return data.mobile || '';
    if (/address/i.test(key)) return data.address || '';
    if (/items/i.test(key)) return data.items || '';
    if (/total/i.test(key)) return data.total || '';
    if (/advance/i.test(key)) return data.advance || '';
    if (/status/i.test(key)) return data.status || 'नवीन ऑर्डर';
    if (/priority/i.test(key)) return data.priority || 'normal';
    if (/delivery date/i.test(key)) return data.deliveryDate || '';
    if (/note/i.test(key)) return data.note || '';
    return '';
  });

  sheet.appendRow(row);
  return jsonResponse({ success: true, orderId: orderId });
}

function updateOrder(data) {
  const { sheet, headers } = getSheetAndHeaders();
  const rowNumber = data.row || data.rowNumber;
  if (!rowNumber) return jsonResponse({ error: 'row number required' });

  const values = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];

  // update values from provided fields
  headers.forEach((h, i) => {
    const key = h.toString().toLowerCase();
    if (/name/.test(key) && data.name) values[i] = data.name;
    if (/mobile/.test(key) && data.mobile) values[i] = data.mobile;
    if (/address/.test(key) && data.address) values[i] = data.address;
    if (/items/.test(key) && data.items) values[i] = data.items;
    if (/total/.test(key) && data.total) values[i] = data.total;
    if (/note/.test(key) && data.note) values[i] = data.note;
    if (/status/.test(key) && data.status) values[i] = data.status;
  });

  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([values]);
  return jsonResponse({ success: true });
}

function updateStatus(data) {
  const { sheet, headers } = getSheetAndHeaders();
  const row = data.rowNumber || data.row;
  if (!row) return jsonResponse({ error: 'rowNumber required' });

  const statusIndex = headers.findIndex(h => /status/i.test(h));
  if (statusIndex === -1) return jsonResponse({ error: 'Status column not found' });

  const newStatus = data.newStatus || '';
  sheet.getRange(row, statusIndex + 1).setValue(newStatus);

  if (data.actualDeliveryDate) {
    const deliveryIndex = headers.findIndex(h => /actual delivery/i.test(h));
    if (deliveryIndex !== -1) sheet.getRange(row, deliveryIndex + 1).setValue(data.actualDeliveryDate);
  }

  return jsonResponse({ success: true });
}

function deliverOrder(data) {
  // Example: mark status delivered and optionally check stock (stock logic skipped here)
  const row = data.row;
  if (!row) return jsonResponse({ error: 'row required' });
  const now = new Date().toISOString();
  updateStatus({ rowNumber: row, newStatus: 'डिलिव्हर', actualDeliveryDate: now });

  // Stub: stock check (return a warning string if low stock)
  const stockWarning = null;

  return jsonResponse({ success: true, stockWarning: stockWarning });
}

function updatePayment(data) {
  const { sheet, headers } = getSheetAndHeaders();
  const orderId = data.orderId;
  if (!orderId) return jsonResponse({ error: 'orderId required' });

  // Find the row with matching Order ID column
  const idIndex = headers.findIndex(h => /order id/i.test(h));
  if (idIndex === -1) return jsonResponse({ error: 'Order ID column not found' });

  const rows = sheet.getRange(2, idIndex + 1, sheet.getLastRow() - 1).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] == orderId) {
      const rowNumber = i + 2;
      const advanceIndex = headers.findIndex(h => /advance/i.test(h));
      if (advanceIndex === -1) return jsonResponse({ error: 'Advance Paid column not found' });
      sheet.getRange(rowNumber, advanceIndex + 1).setValue(data.advancePaid);
      return jsonResponse({ success: true });
    }
  }
  return jsonResponse({ error: 'Order not found' });
}

function deleteOrder(data) {
  const row = data.row;
  if (!row) return jsonResponse({ error: 'row required' });
  const { sheet } = getSheetAndHeaders();
  sheet.deleteRow(row);
  return jsonResponse({ success: true });
}

function getRawMaterials() {
  // Optional: return a static list or read from a separate sheet
  return jsonResponse([{ name: 'रवा', availableKg: 100 }, { name: 'गहू', availableKg: 80 }, { name: 'मैदा', availableKg: 120 }]);
}
```

Deployment steps (standard)

1. Create a new Google Spreadsheet and name a sheet `Orders` (or the name you prefer). Create the header row matching the recommended columns.
2. Open script.google.com and create a new script project.
3. Replace `SHEET_ID` in the script with your spreadsheet ID (the long ID in the sheet URL).
4. Save the script and choose: Deploy → New deployment → select "Web app".
   - Execute as: Me (your Google account)
   - Who has access: Anyone (even anonymous) if you want the public site to POST without authentication.
     - Note: allowing anonymous makes the endpoint public — see Security notes below.
5. Once deployed, copy the Web App URL (it will end with `/exec`) and replace the SCRIPT_URL/API_URL in these files:
   - `index.html` (root)
   - `Dhanlaxmi_App/script_app.js`
   - `Admin_Panel/admin.js`
6. Test using curl or Postman: POST the JSON body { "action": "getOrders" } to the URL and expect a JSON array.

Testing checklist

- Basic connectivity: POST { action: 'getOrders' } and ensure you get an array (or empty array) back.
- Create order: POST { action: 'addOrder', name: 'Test', mobile: '9999999999', items: 'रवा - 1Kg x ₹70', total: 70 } and verify the sheet receives a new row and response includes orderId.
- Update payment: call updatePayment with returned orderId and verify the sheet updates Advance Paid column.
- Deliver order: call deliverOrder with row number — status column should update to 'डिलिव्हर' and Actual Delivery Date populated.
- Admin UI: Open `Admin_Panel/admin.html` and verify orders load and actions (edit, deliver, payment) work.

Backup & security recommendations

- Backup Google Sheet regularly: File → Make a copy, or use a scheduled script to export as CSV to Google Drive.
- Restrict Apps Script access: If you can keep the script as authenticated (not anonymous), do so; then use a server or OAuth flow to authenticate website requests.
- Sanitize inputs in Apps Script (the example is minimal) to avoid script injection or oversized payloads.
- If you need stronger security, add a secret token check: have the web pages include a shared secret in POSTs and validate it in the script (but keep the secret out of public client-side code by moving the secret to a small server-side proxy).

Troubleshooting common errors

- 403 / permission errors when calling the web app: check deployment access settings.
- `Orders sheet not found` error: ensure the `ORDERS_SHEET_NAME` matches the tab name exactly.
- Null or missing keys in UI: ensure header names in the sheet match expected patterns or the script returns consistent keys.

If you want, I can:
- Deploy a ready script for you (requires access to Google account) — otherwise I can prepare the script and you can paste & deploy.
- Add a small server-side proxy (example Node/Express) to accept form posts from the website and forward to Apps Script or to a secure backend.

---

Last updated: 2026-07-26
