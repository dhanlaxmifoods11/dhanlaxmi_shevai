// Apps Script for Dhanlaxmi Foods — Google Sheet Order API
// Paste this code into a new project at script.google.com
// Replace SHEET_ID with your Google Sheet ID (the long ID in the sheet URL)

const SHEET_ID = 'REPLACE_WITH_YOUR_SHEET_ID';
const ORDERS_SHEET_NAME = 'Orders';

function _getSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(ORDERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ORDERS_SHEET_NAME);
    const headers = ['Timestamp','Order ID','Name','Mobile','Address','Items','Total','Advance Paid','Balance','Status','Priority','Delivery Date','Actual Delivery Date','Note'];
    sheet.appendRow(headers);
  }
  return sheet;
}

function doGet(e) {
  // Simple health / query: ?action=getOrders
  try {
    const params = e.parameter || {};
    const action = params.action || 'ping';
    if (action === 'getOrders') {
      const sheet = _getSheet();
      const data = sheet.getDataRange().getValues();
      const headers = data.shift();
      const rows = data.map(r => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return obj;
      });
      return ContentService.createTextOutput(JSON.stringify({ok:true, orders: rows})).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ok:true, message:'Dhanlaxmi Foods Apps Script'})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  // Accept JSON payloads (application/json) or form posts.
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      const content = e.postData.contents;
      try {
        payload = JSON.parse(content);
      } catch (err) {
        // If not JSON, try parse as URL encoded params
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    const action = payload.action || payload.type || 'addOrder';

    if (action === 'addOrder') {
      return _handleAddOrder(payload);
    }

    if (action === 'getOrders') {
      return doGet({parameter: { action: 'getOrders' }});
    }

    if (action === 'updateOrder') {
      return _handleUpdateOrder(payload);
    }

    if (action === 'updatePayment') {
      return _handleUpdatePayment(payload);
    }

    return ContentService.createTextOutput(JSON.stringify({ok:false, error:'Unknown action'})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false, error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function _handleAddOrder(payload) {
  const sheet = _getSheet();

  const timestamp = payload.timestamp || new Date().toISOString();
  const orderId = payload.clientOrderId || ('ORD-' + new Date().getTime());
  const name = payload.name || '';
  const mobile = payload.mobile || '';
  const address = payload.address || '';
  const items = Array.isArray(payload.items) ? JSON.stringify(payload.items) : (payload.items || '');
  const total = payload.total || '';
  const advance = payload.advance || '';
  const balance = payload.balance || '';
  const status = payload.status || 'नवीन ऑर्डर';
  const priority = payload.priority || '';
  const deliveryDate = payload.deliveryDate || '';
  const actualDelivery = payload.actualDeliveryDate || '';
  const note = payload.note || payload.custNote || '';

  const row = [timestamp, orderId, name, mobile, address, items, total, advance, balance, status, priority, deliveryDate, actualDelivery, note];
  sheet.appendRow(row);

  return ContentService.createTextOutput(JSON.stringify({ok:true, orderId: orderId})).setMimeType(ContentService.MimeType.JSON);
}

function _findRowByOrderId(sheet, orderId) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(orderId)) {
      return {rowIndex: i+1, row: data[i], headers: headers};
    }
  }
  return null;
}

function _handleUpdateOrder(payload) {
  const sheet = _getSheet();
  if (!payload.orderId) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'orderId missing'})).setMimeType(ContentService.MimeType.JSON);
  const found = _findRowByOrderId(sheet, payload.orderId);
  if (!found) return ContentService.createTextOutput(JSON.stringify({ok:false, error:'order not found'})).setMimeType(ContentService.MimeType.JSON);

  const colIndex = {
    'Status': 9,
    'Advance Paid': 7,
    'Actual Delivery Date': 12
  };

  // Update provided fields
  const updates = [];
  if (payload.status) {
    sheet.getRange(found.rowIndex, 10).setValue(payload.status);
    updates.push('status');
  }
  if (payload.advance !== undefined) {
    sheet.getRange(found.rowIndex, 8).setValue(payload.advance);
    updates.push('advance');
  }
  if (payload.actualDeliveryDate) {
    sheet.getRange(found.rowIndex, 13).setValue(payload.actualDeliveryDate);
    updates.push('actualDeliveryDate');
  }

  return ContentService.createTextOutput(JSON.stringify({ok:true, updated: updates})).setMimeType(ContentService.MimeType.JSON);
}

function _handleUpdatePayment(payload) {
  // For convenience — same as updateOrder but focuses on payment
  payload.action = 'updateOrder';
  return _handleUpdateOrder(payload);
}
