# Admin Panel — End-to-End (E2E) Guide

This file is a plain-language, step-by-step End-to-End (E2E) guide for the Admin Panel, Website and PWA App in this repository. It explains exactly what to do so a non-technical person can verify the full order flow: Customer → WhatsApp UI → Google Sheet → Admin Panel actions.

This guide assumes the repository root contains these folders: `Admin_Panel/`, `Dhanlaxmi_App/`, and the website `index.html` in the root.

---

## Quick summary of changes already made
- Central configuration file added: `Admin_Panel/config.js` (holds SCRIPT_URL / API_URL). Update this file after you deploy the Apps Script.
- Admin Panel (`Admin_Panel/admin.html` + `Admin_Panel/admin.js`) now reads `API_URL` from `window.APP_CONFIG` so it uses the same central URL.
- Website `index.html` now includes `Admin_Panel/config.js` so it reads `SCRIPT_URL` from `window.APP_CONFIG`.
- PWA App (`Dhanlaxmi_App/script_app.js`) now reads `SCRIPT_URL` from `window.APP_CONFIG` and attempts a JSON POST first; if that fails it falls back to a `no-cors` POST so older deployments still work. Offline orders are queued in localStorage and retried when back online.

---

## One-time setup (non-technical steps)
1. Create a Google Sheet to store orders and name the first sheet/tab `Orders`.
2. In the Google Sheet, add a header row with the columns (copy these exactly):
   - Timestamp, Order ID, Name, Mobile, Address, Items, Total, Advance Paid, Balance, Status, Priority, Delivery Date, Actual Delivery Date, Note
3. Deploy the Apps Script (instructions are below). When deployed, copy the Web App exec URL (it ends with `/exec`).
4. Edit `Admin_Panel/config.js` in the repository and set both `SCRIPT_URL` and `API_URL` to the `/exec` URL you copied. Commit and publish the repo if needed.

Note: `config.js` is public — do not put secrets there.

---

## Apps Script: minimal deploy instructions (copy-paste)
1. Open https://script.google.com and create a new project.
2. Paste the Apps Script code (there is a sample in `Admin_Panel/AppsScript_README.md` in this repo). Replace `SHEET_ID` with your Google Sheet ID (the long ID in the sheet URL).
3. Save and Test using the Run ▶ button for a simple action.
4. Deploy → New deployment → Select "Web app".
   - Execute as: Me (your Google account)
   - Who has access: Anyone (even anonymous) — this allows the website/app to POST to the script.
5. Copy the Web app URL (the one ending with `/exec`) and put it into `Admin_Panel/config.js`.

Security note: Allowing "Anyone (even anonymous)" is a simple approach for public websites. For production choose a secure proxy or server-side token approach instead.

---

## How to update the repo config (non-technical)
Open `Admin_Panel/config.js` and replace the placeholder values with your deployed URL. Example:

```js
window.APP_CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_EXEC_ID/exec',
  API_URL: 'https://script.google.com/macros/s/YOUR_EXEC_ID/exec',
  SHARED_SECRET: ''
};
```

Save the file and push/commit to GitHub. If you use GitHub Pages, the updated files will be served automatically from the repo.

---

## Simple E2E test plan (for a non-technical person)
Follow these three tests in order. Each step describes what you will do and exactly what to expect.

Test 1 — Website order flow (happy path)
- Steps:
  1. Open the website (root `index.html` or your GitHub Pages URL).
  2. Fill customer name, 10-digit mobile number, address.
  3. Add one product (for example, choose "रवा शेवई") and enter 2 Kg.
  4. Click the order/submit button (the site opens WhatsApp with the order summary).
- Expect:
  - WhatsApp opens with the order message pre-filled.
  - Within a minute, the Google Sheet should have a new row with the order details (Name, Mobile, Items, Total, Status = `नवीन ऑर्डर`).

Test 2 — PWA App / App page order flow
- Steps:
  1. Open `Dhanlaxmi_App/index.html` in a browser.
  2. Fill the form and click "Save & WhatsApp".
- Expect:
  - WhatsApp opens with the order message pre-filled.
  - Google Sheet receives a new row with the order.

Test 3 — Admin panel verify + status update
- Steps:
  1. Open `Admin_Panel/admin.html` in a browser.
  2. You should see the same order in the dashboard list.
  3. Click the order to view details.
  4. Change the order status to `डिलिव्हर` and accept prompts.
  5. When prompted, record the Payment/Advance and confirm.
- Expect:
  - The order row in the Google Sheet gets updated (Status becomes `डिलिव्हर`; `Advance Paid` updated if you entered any value; `Actual Delivery Date` recorded).
  - The Admin Panel refreshes and shows the updated values.

Offline test — local queue and retry
- Steps:
  1. Turn off the internet connection on your device.
  2. Submit an order from `Dhanlaxmi_App` or the website.
  3. The UI should show a message that the order is saved offline.
  4. Reconnect to the internet.
- Expect:
  - After reconnection, the app automatically sends the queued orders and they appear in the Google Sheet.

---

## Acceptance criteria (pass/fail rules)
- Pass if:
  - Orders submitted from website/app appear in the Google Sheet and in the Admin Panel within 60 seconds.
  - Admin Panel actions (status change, deliver, payment update) persist to the Google Sheet.
  - Offline orders are queued and automatically submitted once the device reconnects.
- Fail if:
  - No row appears in the Google Sheet and no offline queue is created when network is down.
  - Admin actions do not update the Google Sheet.

---

## Troubleshooting (simple checks)
- If no new row appears in the sheet:
  - Confirm `Admin_Panel/config.js` contains your deployed `/exec` URL.
  - Confirm the Apps Script is deployed and the Web app URL is the same used in `config.js`.
  - In the Apps Script editor, open Executions (left sidebar) to see errors and logs.
- If you see CORS errors in browser console:
  - Either enable CORS in Apps Script (return the `Access-Control-Allow-Origin: *` header) or rely on the `no-cors` fallback (the code already tries `no-cors` when JSON fetch fails). The `no-cors` fallback makes the request opaque (browser will not show response) but the Apps Script can still write to the sheet.
- If the Admin Panel shows no orders or errors:
  - Make sure `API_URL` in `Admin_Panel/config.js` points to the same exec URL.
  - Open browser console to inspect the failing requests and errors.

---

## Safe next steps & improvements (recommended)
- For production, replace anonymous Apps Script access with a secure server proxy that keeps a token secret.
- Add a small automated test (Cypress or Playwright) for the three main flows to make checks repeatable.
- Optionally, add a small “Self-check” page in the Admin Panel that requests `action: getOrders` and shows a quick success/failure indicator.

---

If you want, I will also copy this content into the main `README.md` root file. I can do either:
- Keep this file under `Admin_Panel/E2E_README.md` (recommended: keeps admin docs together), or
- Merge into the main README so the high-level E2E instructions show at the project root.

Reply with one of:
- `leave` — keep this file under Admin_Panel (standard approach)
- `merge` — also copy into root README.md

