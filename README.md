# 🌾 Dhanlaxmi Foods™ — Project Overview and End‑to‑End Guide

**Dhanlaxmi Foods** — घरगुती शेवई (Satara, Maharashtra). This README has been expanded to include clear, step‑by‑step end‑to‑end (E2E) details for both non‑technical users and maintainers, and to describe the website, PWA (app) and Admin Panel files found in this repository.

---

## What this is (one line)
A small business website + PWA and a lightweight Admin Panel that together let customers place orders (via the website or app) and let the owner view/save/print those orders from the Admin Panel.

### Stack
- Language(s): HTML, CSS, JavaScript (+ static assets like images)
- Hosting: GitHub Pages (static site)
- Integrations: Google Apps Script (used to save orders to Google Sheets) and WhatsApp for order notification

---

## Files and folders (what is actually in the repo)
This section lists the top-level files and important folders we inspected and what they are for.

```
/ (repo root)
├── index.html              # Main website (customer-facing) — single static HTML page
├── style.css               # Main website styles
├── README.md               # (this file) expanded with E2E and usage notes
├── Logo.jpeg               # Brand logo used in site and app
├── sitemap.xml             # Sitemap for SEO
├── images/                 # Product and asset images used by website
├── Dhanlaxmi_App/         # PWA (app-like) version of the website
│   ├── index.html         # App UI (smaller, focused order form)
│   ├── script_app.js      # App JS (order form handling, save + WhatsApp)
│   ├── style_app.css      # App CSS
│   ├── manifest.json      # PWA manifest (app install metadata)
│   └── sw.js              # App service worker (basic caching / offline support)
├── Admin_Panel/           # Admin interface to view/manage orders
│   ├── login.html         # Login page for admin
│   ├── admin.html         # Main admin dashboard (view orders)
│   ├── accounts.html      # Accounts / settings screens
│   ├── invoice.html       # Invoice print page template
│   ├── change_password.html
│   ├── admin.js           # Admin dashboard JS (order display, actions)
│   ├── accounts.js        # Accounts page JS
│   ├── auth.js            # Simple auth helpers
│   ├── admin.css, accounts.css, invoice.css  # Admin styles
│   ├── manifest.json      # PWA manifest for admin (optional)
│   └── sw.js              # service worker for admin (optional)
└── images/                # Product photos, QR codes, etc.
```

Notes:
- The repository contains the website, a PWA app folder, and a full Admin_Panel folder with HTML/CSS/JS used by the business owner.
- The README previously referenced folders like `python/` and `script.js` at the root; those are not present in the repository root we inspected. If you have offline Python automation scripts you want tracked, please add them to a `python/` folder.

---

## How the whole system works — E2E (explained for a non‑technical person)
This is written as a simple story so anyone can follow the flow from a customer clicking the website to the owner receiving and handling the order.

1. Customer visits the website (index.html) on phone or computer.
   - They see product cards (रवा, गहू, मैदा, mix packs) and a simple order form.
   - The site is mobile-first and shows price, nutrition, and an Important Notes box (minimum order, delivery area, returns policy).

2. Customer fills order details on the website or installs the PWA app (Dhanlaxmi_App) and uses that small order form.
   - They enter name, mobile, address, choose product(s), quantity (Kg), and optionally a delivery date or note.
   - The page calculates total price automatically (Live Price Calculator).

3. When the customer clicks the final "Order" (website) or "Save & WhatsApp" (app) button, three things happen:
   a. A WhatsApp message window opens pre-filled with the order summary so the customer can send the message directly to the shop (this is how many local businesses accept orders).
   b. Behind the scenes the page POSTs the order to a Google Apps Script web URL (this URL is in the site's JavaScript). That script usually saves the order into a Google Sheet. (Tip: the apps script URL is visible in the site code; it belongs to the owner.)
   c. The page shows a friendly confirmation message to the customer (order received).

4. The business owner (admin) receives the order:
   - The owner receives the WhatsApp message immediately from the customer.
   - The order is also saved automatically into a Google Sheet via Apps Script (so orders are kept in a central place).

5. Admin Panel (Admin_Panel folder) — How owner manages orders:
   - The owner logs in using the admin login page (login.html).
   - In the admin dashboard (admin.html) orders saved in the Google Sheet (or copied by hand from WhatsApp) are displayed.
   - The owner can view an order, generate an invoice (invoice.html), mark orders as completed, and manage account settings (accounts.html, change_password.html).
   - The Admin Panel provides print-ready view (invoice template) for hand paper receipts or for saving as PDF.

6. Installation as App (PWA):
   - The Dhanlaxmi_App folder contains a manifest.json and sw.js — together they allow modern phones to "Install" the website as an app icon on the home screen.
   - The service worker caches key assets so the app and certain pages load faster and can show basic content even with flaky network.

7. SEO & visibility:
   - sitemap.xml and structured data (JSON-LD inside index.html) help Google find and show the business in search results.

---

## How to run and test locally (simple steps)
For a non‑technical person: these steps let you open and click through the site on your computer.

1. Clone the repository (or download ZIP) and open the folder.
2. Open `index.html` in your browser (double-click it). That opens the full website.
3. To test the app UI, open `Dhanlaxmi_App/index.html` in your phone's browser (or on desktop).

Developer-style commands (optional):
```bash
git clone https://github.com/dhanlaxmifoods11/dhanlaxmi_shevai.git
cd dhanlaxmi_shevai
# then open index.html in your browser (no server required for basic testing)
```

Note: because the pages post to an external Google Apps Script URL, when testing, the script will run only if the deployed Apps Script URL exists and accepts anonymous POSTs. If you don't want to trigger the real Apps Script while testing, temporarily comment out the form POST in the page JS.

---

## Manual E2E test plan (step‑by‑step, non‑technical)
1. Open the website (index.html).
2. Go to "ऑर्डर करा" (Order) section.
3. Fill name, mobile (10 digits), address.
4. Add 1 or more items (choose type, size, and Kg), check total price updates.
5. Click "ऑर्डर करा". Expected outcome:
   - A WhatsApp window opens pre-filled with the order message.
   - The page shows a friendly confirmation message and order summary.
   - If Apps Script URL is active, the order is saved in Google Sheets.
6. As admin, open Admin_Panel/login.html and sign in (credentials are stored in the admin JS files; follow the owner’s instructions for the current username/password).
7. Open the dashboard and verify the new order appears (or check the linked Google Sheet where orders are saved).
8. Open invoice for the order and print/save as PDF if needed.

---

## Admin Panel — Quick how‑to (for the owner)
- Login: Open Admin_Panel/login.html in a browser. Enter your admin username & password.
- View Orders: Open Admin_Panel/admin.html (after login). You'll see list of saved orders, with details per order.
- Create / Print Invoice: Click an order and choose "Print Invoice" to open Admin_Panel/invoice.html with the order filled in. Use your browser's Print -> Save as PDF or Print to physical printer.
- Accounts & Password: Use Admin_Panel/accounts.html and change_password.html to update profile details and credentials. These pages use accounts.js / auth.js for client-side handling.

Important: The current Admin Panel is client‑side (static HTML + JS). For persistent server-side authentication you would add a small backend. Right now, the admin functionality likely depends on the owner keeping credentials private and/or the Google Sheet for persistent storage.

---

## PWA (App) details — simple explanation
- Files: Dhanlaxmi_App/manifest.json and Dhanlaxmi_App/sw.js enable the app installation experience.
- To install: Open Dhanlaxmi_App/index.html in a mobile browser (Chrome on Android) → tap browser menu → "Add to Home screen" or follow the install prompt.
- Offline behavior: Service worker caches critical files so the app shows basic pages when the network is slow. It is not a full offline order system — WhatsApp requires network and Google Apps Script requires network.

---

## Where orders are stored / integration points
- The website contains a hard-coded Google Apps Script URL (see `SCRIPT_URL` variable in index.html and Dhanlaxmi_App/script_app.js). That script typically inserts the POSTed order into a Google Sheet owned by the business.
- WhatsApp is used for immediate human confirmation — customers send a message to the shop number with the order details.

Security note: Because Apps Script endpoints can accept data, ensure the target Apps Script is owned/controlled by the business Google account. If you change that script, take a backup of the destination Google Sheet.

---

## Maintenance and common tasks (simple checklist)
- Update prices: edit the rate values in the order form options in index.html and Dhanlaxmi_App/index.html (they are in the <option value> or as data attributes). Also update the price table in the Products section.
- Update images: replace image files in `images/` and in the root (Logo.jpeg). Keep file names unchanged or update references in HTML.
- Backup orders: Make sure the Google Sheet that receives orders is regularly backed up or shared to a recovery account.
- Add automation scripts: If you have billing or automation Python scripts, create a `python/` folder and add them with a small README describing usage.

---

## What we couldn't find (and suggested next steps)
During inspection we did not find the following items mentioned in earlier documentation:
- `python/` folder with billing scripts — not present. If you have offline automation, add it under `python/`.
- A top-level `script.js` file — site uses inline JS inside `index.html` and `Dhanlaxmi_App/script_app.js` for app logic.

If you want these files tracked in the repo, please add them or tell us where they live and we can document them and wire them into the Admin Panel.

---

## Quick troubleshooting (non‑technical)
- Orders not saved to Google Sheets: check with the owner whether the Google Apps Script URL is still deployed and owned by the business account.
- WhatsApp not opening: ensure your browser allows pop-ups and you have network connectivity, or test with the WhatsApp mobile app.
- Admin panel not showing orders: confirm login details, and check the Google Sheet for saved orders.

---

## Contact / Next steps
If you want, I can:
- Add a simple developer README for the Admin Panel explaining the code structure in more detail.
- Add a `python/` folder and template scripts for automated billing (if you provide the billing rules).
- Convert the Admin Panel authentication to a small backend (Node/Python) for secure storage.

---

_Last updated: 2026-07-26_
