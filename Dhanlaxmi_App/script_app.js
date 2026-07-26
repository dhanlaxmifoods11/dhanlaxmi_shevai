// Centralized script URL (reads from Admin_Panel/config.js when available)
const SCRIPT_URL = (window.APP_CONFIG && window.APP_CONFIG.SCRIPT_URL) ? window.APP_CONFIG.SCRIPT_URL : "https://script.google.com/macros/s/AKfycbzcQviEyybujCo-XM-CEHQXZdMYcyv2tmNAauY2HWwQ5BCyjURVxDo1wk8dEOgoiCg/exec";

// Save order to localStorage when offline
function saveOrderOffline(order) {
  const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
  pending.push(order);
  localStorage.setItem('pendingOrders', JSON.stringify(pending));
}

// Preferred send: try JSON fetch and parse response; fallback to no-cors POST if necessary
function sendToSheet(payload) {
  try {
    return fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => {
      if (res.ok) {
        return res.json().catch(() => null);
      }
      return null;
    }).catch(err => {
      console.warn('JSON fetch failed, trying no-cors fallback:', err);
      // fallback: post with no-cors so browser will still attempt the send (opaque response)
      return fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      }).catch(e => {
        console.error('Fallback no-cors failed:', e);
        saveOrderOffline(payload);
      });
    });
  } catch (err) {
    console.error('sendToSheet unexpected error:', err);
    // last resort fallback
    return fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    }).catch(e => {
      console.error('Final fallback no-cors failed:', e);
      saveOrderOffline(payload);
    });
  }
}

// Try syncing pending orders when online
function syncPendingOrders() {
  const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
  if (!Array.isArray(pending) || pending.length === 0) return;
  const copy = [...pending];
  Promise.all(copy.map(p => sendToSheet(p))).then(results => {
    // assume success if fetch didn't throw; clear pending
    localStorage.removeItem('pendingOrders');
  }).catch(err => console.error('Sync failed:', err));
}

// Attempt sync on load
window.addEventListener('load', () => {
  syncPendingOrders();
});
