// =====================================================
// ========== धनलक्ष्मी - ORDER DASHBOARD v4.6 ==========
// ========== 2 Dropdown Items + Auto Rate =============
// =====================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbzcQviEyybujCo-XM-CEHQXZdMYcyv2tmNAauY2HWwQ5BCyjURVxDo1wk8dEOgoiCg/exec';

// Global Variables
let allOrders = [];
let allMaterials = [];
let selectedOrders = new Set();
let currentFilters = { period: 'month', status: 'all', search: '' };
let editingOrderId = null;

// =====================================================
// ========== PAGE LOAD ================================
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Order Dashboard Loading...');
    loadOrders();
    loadMaterials();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('orderForm')?.addEventListener('submit', handleOrderSubmit);
    document.getElementById('orderPeriod')?.addEventListener('change', handlePeriodChange);
    document.getElementById('orderDatePicker')?.addEventListener('change', filterOrders);
    document.getElementById('orderEndDatePicker')?.addEventListener('change', filterOrders);
    document.getElementById('searchInput')?.addEventListener('keyup', filterOrders);
    document.getElementById('statusFilter')?.addEventListener('change', filterOrders);
}

// =====================================================
// ========== LOAD ORDERS ==============================
// =====================================================

async function loadOrders() {
    try {
        showLoading();
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getOrders' })
        });
        const data = await res.json();

        if (data.error) {
            showError('Error: ' + data.error);
            return;
        }

        allOrders = data;
        updateDashboardStats();
        filterOrders();
    } catch (error) {
        console.error('Load Orders Error:', error);
        showError('Orders लोड करताना Error आला: ' + error.message);
    }
}

async function loadMaterials() {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getRawMaterials' })
        });
        allMaterials = await res.json();
    } catch (error) {
        console.error('Load Materials Error:', error);
    }
}

function showLoading() {
    document.getElementById('ordersBody').innerHTML = '<tr><td colspan="12" class="loading">लोड होत आहे...</td></tr>';
}

function showError(msg) {
    document.getElementById('ordersBody').innerHTML = `<tr><td colspan="12" class="loading">${msg}</td></tr>`;
}

// =====================================================
// ========== DASHBOARD STATS - TIMEZONE FIX ==========
// =====================================================

function updateDashboardStats() {
    // FIX: IST Timezone - भारताचा वेळ
    const now = new Date();
    const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    istDate.setHours(0, 0, 0, 0);

    const todayOrders = allOrders.filter(o => {
        const orderDate = new Date(getKey(o, ['Timestamp', 'Date']));
        const orderIST = new Date(orderDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        orderIST.setHours(0, 0, 0, 0);
        return orderIST.getTime() === istDate.getTime();
    });

    const pendingOrders = allOrders.filter(o =>
        getKey(o, ['Status'])?.trim()!== 'डिलिव्हर'
    );

    // FIX: आजची विक्री - Actual Delivery Date वरून IST मध्ये
    const todaySales = allOrders
     .filter(o => {
            const deliveryDateStr = getKey(o, ['Actual Delivery Date', 'ActualDeliveryDate']);
            if (!deliveryDateStr) return false;

            const deliveryDate = new Date(deliveryDateStr);
            const deliveryIST = new Date(deliveryDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
            deliveryIST.setHours(0, 0, 0, 0);

            return deliveryIST.getTime() === istDate.getTime() && getKey(o, ['Status'])?.trim() === 'डिलिव्हर';
        })
     .reduce((sum, o) => sum + (parseFloat(getKey(o, ['एकूण', 'Total'])) || 0), 0);

    document.getElementById('todayCount').textContent = todayOrders.length;
    document.getElementById('pendingCount').textContent = pendingOrders.length;
    document.getElementById('todaySales').textContent = todaySales.toFixed(0);
}

// =====================================================
// ========== FILTERS ==================================
// =====================================================

function handlePeriodChange() {
    const period = document.getElementById('orderPeriod').value;
    const datePicker = document.getElementById('orderDatePicker');
    const endDatePicker = document.getElementById('orderEndDatePicker');

    datePicker.style.display = 'none';
    endDatePicker.style.display = 'none';

    if (period === 'custom') {
        datePicker.style.display = 'block';
        endDatePicker.style.display = 'block';
    } else {
        filterOrders();
    }
}

function filterByCard(type) {
    const period = document.getElementById('orderPeriod');
    const status = document.getElementById('statusFilter');

    if (type === 'today') {
        period.value = 'today';
        status.value = 'all';
    } else if (type === 'pending') {
        period.value = 'all';
        status.value = 'नवीन ऑर्डर';
    } else if (type === 'sales') {
        period.value = 'today';
        status.value = 'डिलिव्हर';
    }

    filterOrders();
}

function filterOrders() {
    let filtered = [...allOrders];
    const period = document.getElementById('orderPeriod').value;
    const status = document.getElementById('statusFilter').value;
    const search = document.getElementById('searchInput').value.toLowerCase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (period === 'today') {
        filtered = filtered.filter(o => {
            const d = new Date(getKey(o, ['Timestamp', 'Date']));
            d.setHours(0, 0, 0, 0);
            return d.getTime() === today.getTime();
        });
    } else if (period === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1);
        filtered = filtered.filter(o => new Date(getKey(o, ['Timestamp'])) >= weekStart);
    } else if (period === 'month') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        filtered = filtered.filter(o => new Date(getKey(o, ['Timestamp'])) >= monthStart);
    } else if (period === 'year') {
        const yearStart = new Date(today.getFullYear(), 0, 1);
        filtered = filtered.filter(o => new Date(getKey(o, ['Timestamp'])) >= yearStart);
    } else if (period === 'custom') {
        const start = new Date(document.getElementById('orderDatePicker').value);
        const end = new Date(document.getElementById('orderEndDatePicker').value);
        if (start && end) {
            end.setHours(23, 59, 999);
            filtered = filtered.filter(o => {
                const d = new Date(getKey(o, ['Timestamp']));
                return d >= start && d <= end;
            });
        }
    }

    if (status!== 'all') {
        filtered = filtered.filter(o => getKey(o, ['Status'])?.trim() === status);
    }

    if (search) {
        filtered = filtered.filter(o => {
            return getKey(o, ['Order ID', 'OrderID'])?.toLowerCase().includes(search) ||
                   getKey(o, ['नाव', 'Name'])?.toLowerCase().includes(search) ||
                   getKey(o, ['मोबाईल', 'Mobile'])?.includes(search) ||
                   getKey(o, ['ऑर्डर डिटेल्स', 'Items'])?.toLowerCase().includes(search);
        });
    }

    displayOrders(filtered);
}

// =====================================================
// ========== DISPLAY ORDERS - INVOICE UPDATED =========
// =====================================================

function displayOrders(orders) {
    const tbody = document.getElementById('ordersBody');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" class="loading">Orders नाहीत</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map((order, index) => {
        const orderId = getKey(order, ['Order ID', 'OrderID']);
        const date = formatDate(getKey(order, ['Timestamp', 'Date']));
        const name = getKey(order, ['नाव', 'Name']);
        const mobile = getKey(order, ['मोबाईल', 'Mobile']);
        const items = getKey(order, ['ऑर्डर डिटेल्स', 'Items']);
        const total = parseFloat(getKey(order, ['एकूण', 'Total'])) || 0;
        const status = getKey(order, ['Status'])?.trim();
        const priority = getKey(order, ['Priority']) || 'normal';
        const row = order.rowNumber || getKey(order, ['Row']) || (index + 2);

        // Payment Logic - Advance Paid Column वरून
        const advancePaid = parseFloat(getKey(order, ['Advance Paid', 'Advance'])) || 0;
        const balance = total - advancePaid;
        let paymentStatus = 'unpaid';
        let paymentText = `Unpaid ₹${total}`;

        if (advancePaid >= total && total > 0) {
            paymentStatus = 'paid';
            paymentText = `Paid ₹${total}`;
        } else if (advancePaid > 0) {
            paymentStatus = 'partial';
            paymentText = `Partial ₹${advancePaid} / ₹${total}`;
        }

        const isChecked = selectedOrders.has(row)? 'checked' : '';
        const priorityIcon = priority === 'urgent'? '🚩' : '';
        const priorityClass = priority === 'urgent'? 'urgent' : '';
        const orderData = JSON.stringify(order).replace(/'/g, "&apos;");

        const isDelivered = status === 'डिलिव्हर';
        const editButton = isDelivered
         ? `<button class="action-btn-sm" disabled style="opacity: 0.5; cursor: not-allowed;" title="Delivered Order Edit करू शकत नाही">✏️</button>`
            : `<button class="action-btn-sm" onclick="editOrderModal('${row}')">✏️</button>`;

        // FIX: Payment Button - फक्त Partial असेल तरच दाखव
        const paymentButton = isDelivered && balance > 0
         ? `<button class="action-btn-sm" style="background:#28a745; border-color:#28a745;" onclick="showPaymentModal('${orderId}')" title="Payment Update करा">💰</button>`
            : '';

        return `
            <tr>
                <td><input type="checkbox" onchange="toggleSelect('${row}')" ${isChecked}></td>
                <td><span class="priority-flag ${priorityClass}" onclick="togglePriority('${row}')">${priorityIcon}</span></td>
                <td><span class="order-id-link" onclick='showOrderDetails(${orderData})'>${orderId}</span></td>
                <td>${date}</td>
                <td>${name}</td>
                <td>${mobile}</td>
                <td style="white-space: pre-wrap; max-width: 300px; font-size: 13px;">${items}</td>
                <td><b>₹${total}</b></td>
                <td><span class="payment-badge ${paymentStatus}">${paymentText}</span></td>
                <td>
                    <select class="status-dropdown" onchange="handleStatusChange('${row}', this.value)">
                        <option value="नवीन ऑर्डर" ${status === 'नवीन ऑर्डर'? 'selected' : ''}>नवीन ऑर्डर</option>
                        <option value="प्रक्रिया सुरू" ${status === 'प्रक्रिया सुरू'? 'selected' : ''}>प्रक्रिया सुरू</option>
                        <option value="तयार" ${status === 'तयार'? 'selected' : ''}>तयार</option>
                        <option value="डिलिव्हर" ${status === 'डिलिव्हर'? 'selected' : ''}>डिलिव्हर</option>
                    </select>
                </td>
                <td>
                    <button class="action-btn-sm whatsapp" onclick="sendWhatsApp('${row}')">📱</button>
                    <button class="action-btn-sm print" onclick="printInvoice('${orderId}')">🖨️</button>
                    ${editButton}
                    ${paymentButton}
                </td>
                <td>
                    ${!isDelivered?
                        `<button class="action-btn-sm stock" onclick="deliverOrder('${row}')">📦 स्टॉक व Delivery</button>` :
                        '<span style="color:#28a745;">✓ Done</span>'
                    }
                </td>
            </tr>
        `;
    }).join('');
}

// =====================================================
// ========== STATUS CHANGE ============================
// =====================================================

async function handleStatusChange(rowNumber, newStatus) {
    if (!newStatus) return;

    if (newStatus === 'डिलिव्हर') {
        if (!confirm('Order Deliver करायचा का?\n\nStock Cut होईल + Payment Entry करायला लागेल.')) {
            loadOrders();
            return;
        }
        await deliverOrder(rowNumber);
    } else {
        await changeStatus(rowNumber, newStatus);
    }
}

async function changeStatus(rowNumber, newStatus, reload = true) {
    try {
        showToast('Updating status...');
        let bodyData = {
            action: 'updateStatus',
            rowNumber: rowNumber,
            newStatus: newStatus
        };

        if (newStatus === 'डिलिव्हर') {
            bodyData.actualDeliveryDate = new Date().toISOString();
        }

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(bodyData)
        });

        const result = await response.json();
        if (result.success) {
            if (reload) loadOrders();
            showToast('✅ Status Updated!');
            return true;
        } else {
            alert('Error: ' + result.error);
            return false;
        }
    } catch (error) {
        alert('API Error: ' + error.message);
        return false;
    }
}

// =====================================================
// ========== DELIVER ORDER + WA RECEIPT ===============
// =====================================================

async function deliverOrder(row) {
    try {
        showToast('Processing Delivery...');
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'deliverOrder', row: row })
        });
        const data = await res.json();

        if (data.success) {
            // Stock Warning असेल तर दाखव
            if (data.stockWarning) {
                alert('✅ Order Delivered!\n\n⚠️ Stock Warning:\n' + data.stockWarning);
            } else {
                showToast('✅ Order Delivered!');
            }

            // Data Refresh कर
            await loadOrders();

            // FIX: Order ID काढ आणि Payment Modal उघड
            const order = allOrders.find(o => (o.rowNumber || getKey(o, ['Row'])) == row);
            const orderId = getKey(order, ['Order ID', 'OrderID']);
            setTimeout(() => {
                showPaymentModal(orderId);
            }, 500);

        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error);
    }
}

// =====================================================
// ========== PAYMENT MODAL - ORDER ID BASED ===========
// =====================================================

function showPaymentModal(orderId) {
    const order = allOrders.find(o => getKey(o, ['Order ID', 'OrderID']) === orderId);
    if (!order) {
        alert('Order सापडला नाही');
        return;
    }

    const totalAmount = parseFloat(getKey(order, ['एकूण', 'Total'])) || 0;
    const currentAdvance = parseFloat(getKey(order, ['Advance Paid', 'Advance'])) || 0;
    const remaining = totalAmount - currentAdvance;

    // FIX: Delivery नंतर असेल तर Remaining Amount Suggest कर, 0 पण टाकू शकतो
    const suggestedAmount = remaining > 0? remaining : 0;

    const amount = prompt(
        `💰 Payment Entry\n\n` +
        `Order: ${getKey(order, ['Order ID', 'OrderID'])}\n` +
        `Customer: ${getKey(order, ['नाव', 'Name'])}\n` +
        `Total: ₹${totalAmount}\n` +
        `Already Paid: ₹${currentAdvance}\n` +
        `Remaining: ₹${remaining}\n\n` +
        `किती Amount Add करायचा?\n(0 टाकू शकता, नंतर 💰 Button ने Update करा)`,
        suggestedAmount
    );

    if (amount === null) return; // Cancel केला

    const newAmount = parseFloat(amount) || 0;

    // FIX: जुना + नवीन Payment Add करून पाठव
    const totalPaidAmount = currentAdvance + newAmount;

    if (totalPaidAmount > totalAmount) {
        alert(`Error: Total Payment ₹${totalPaidAmount} हा Total Amount ₹${totalAmount} पेक्षा जास्त होतोय!`);
        return;
    }

    updatePayment(orderId, totalPaidAmount);
}

// ✅ FIXED: Order ID वापरून Payment Update
async function updatePayment(orderId, totalPaidAmount) {
  try {
    showToast('Payment Updating...');
    console.log('Updating Order ID:', orderId, 'Amount:', totalPaidAmount);

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'updatePayment',
        orderId: orderId, // ✅ Order ID पाठव, Row नाही
        advancePaid: totalPaidAmount,
        updatedBy: getCurrentUser()?.name || 'Unknown'
      })
    });

    const result = await res.json();
    console.log('API Result:', result);

    if (result.success) {
      loadOrders();
      showToast('✅ Payment Updated!');
    } else {
      alert('Error: ' + result.error);
    }
  } catch (error) {
    console.error(error);
    alert('Error: ' + error);
  }
}

// =====================================================
// ========== PRINT INVOICE - NEW FUNCTION =============
// =====================================================
function printInvoice(orderId) {
    const invoiceUrl = `invoice.html?ids=${orderId}`;
    window.open(invoiceUrl, '_blank');
}

// =====================================================
// ========== WHATSAPP - WITH INVOICE LINK =============
// =====================================================
function sendWhatsApp(row) {
    const order = allOrders.find(o => (o.rowNumber || getKey(o, ['Row'])) == row);
    if (!order) return;

    const name = getKey(order, ['नाव', 'Name']);
    const mobile = getKey(order, ['मोबाईल', 'Mobile']);
    const orderId = getKey(order, ['Order ID', 'OrderID']);
    const items = getKey(order, ['ऑर्डर डिटेल्स', 'Items']);
    const total = parseFloat(getKey(order, ['एकूण', 'Total'])) || 0;
    const advancePaid = parseFloat(getKey(order, ['Advance Paid', 'Advance'])) || 0;
    const balance = total - advancePaid;
    const status = getKey(order, ['Status'])?.trim();

    // ✅ Same folder मध्ये आहे - Full URL Auto बनेल
    const invoiceUrl = window.location.href.replace('admin.html', 'invoice.html') + `?ids=${orderId}`;

    // ✅ Payment Status Line
    let paymentLine = '';
    if (balance === 0 && status === 'डिलिव्हर') {
        paymentLine = `✅ *Payment: Fully Paid*`;
    } else if (advancePaid > 0) {
        paymentLine = `⚠️ *Payment: Partial*%0A*Balance Due:* ₹${balance}`;
    } else {
        paymentLine = `❌ *Payment: Unpaid*%0A*Total Due:* ₹${balance}`;
    }

    const msg = `*धनलक्ष्मी शेवई*%0A%0Aनमस्कार ${name},%0A%0A` +
        `*Order ID:* ${orderId}%0A` +
        `*Items:*%0A${items.replace(/\n/g, '%0A')}%0A%0A` +
        `*Total:* ₹${total}%0A` +
        `*Paid:* ₹${advancePaid}%0A` +
        `*Balance:* ₹${balance}%0A%0A` +
        `${paymentLine}%0A%0A` +
        `🧾 *Invoice बघण्यासाठी:*%0A${invoiceUrl}%0A%0A` +
        `*FSSAI Lic No:* 30260428124289835%0A%0A` +
        `धन्यवाद! 🙏`;

    window.open(`https://wa.me/91${mobile}?text=${msg}`, '_blank');
}

// =====================================================
// ========== BULK ACTIONS - INVOICE UPDATED ===========
// =====================================================

function toggleSelect(row) {
    if (selectedOrders.has(row)) {
        selectedOrders.delete(row);
    } else {
        selectedOrders.add(row);
    }
    updateBulkBar();
}

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('#ordersBody input[type="checkbox"]');
    const selectAll = document.getElementById('selectAll').checked;

    checkboxes.forEach(cb => {
        const row = cb.getAttribute('onchange').match(/'([^']+)'/)[1];
        if (selectAll) {
            selectedOrders.add(row);
            cb.checked = true;
        } else {
            selectedOrders.delete(row);
            cb.checked = false;
        }
    });
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkActionBar');
    const count = document.getElementById('selectedCount');
    count.textContent = selectedOrders.size;
    bar.style.display = selectedOrders.size > 0? 'flex' : 'none';
}

function clearSelection() {
    selectedOrders.clear();
    document.querySelectorAll('#ordersBody input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('selectAll').checked = false;
    updateBulkBar();
}

async function bulkUpdateStatus() {
    const newStatus = document.getElementById('bulkStatusChange').value;
    if (!newStatus || selectedOrders.size === 0) {
        alert('Status Select करा आणि Orders Select करा');
        return;
    }

    if (!confirm(`${selectedOrders.size} Orders चे Status "${newStatus}" करायचे का?`)) return;

    try {
        showToast('Updating...');
        const promises = Array.from(selectedOrders).map(row =>
            changeStatus(row, newStatus, false)
        );

        await Promise.all(promises);
        clearSelection();
        loadOrders();
        showToast('✅ Status Updated!');
    } catch (error) {
        alert('Error: ' + error);
    }
}

// FIX: Bulk Print - Order IDs ने Invoice Open करतो
function bulkPrint() {
    if (selectedOrders.size === 0) {
        alert('Print करायला Orders Select करा');
        return;
    }

    // Row मधून Order IDs काढ
    const orderIds = Array.from(selectedOrders).map(row => {
        const order = allOrders.find(o => (o.rowNumber || getKey(o, ['Row'])) == row);
        return getKey(order, ['Order ID', 'OrderID']);
    }).filter(id => id);

    if (orderIds.length === 0) {
        alert('Order IDs मिळाले नाहीत');
        return;
    }

    const ids = orderIds.join(',');
    window.open(`invoice.html?ids=${ids}`, '_blank');
}

async function bulkDelete() {
    if (selectedOrders.size === 0) {
        alert('Delete करायला Orders Select करा');
        return;
    }
    if (!confirm(`${selectedOrders.size} Orders Delete करायचे का? हे Undo होणार नाही!`)) return;

    try {
        showToast('Deleting...');
        const promises = Array.from(selectedOrders).map(row =>
            fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'deleteOrder', row: row })
            })
        );

        await Promise.all(promises);
        clearSelection();
        loadOrders();
        showToast('✅ Deleted!');
    } catch (error) {
        alert('Error: ' + error);
    }
}

// =====================================================
// ========== PRIORITY TOGGLE ==========================
// =====================================================

async function togglePriority(row) {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'togglePriority', row: row })
        });
        loadOrders();
    } catch (error) {
        console.error(error);
    }
}

// =====================================================
// ========== ORDER MODAL - ADD/EDIT ===================
// =====================================================

function openOrderModal() {
    editingOrderId = null;
    document.getElementById('addOrderModalTitle').textContent = 'नवीन ऑर्डर';
    document.getElementById('orderForm').reset();
    document.getElementById('itemsContainer').innerHTML = '';
    addItemRow();
    document.getElementById('addOrderModal').style.display = 'flex';
}

function closeAddOrderModal() {
    document.getElementById('addOrderModal').style.display = 'none';
}

// ✅ UPDATED: 2 Dropdown - प्रकार + बारीक/मध्यम/जाड
function addItemRow() {
    const container = document.getElementById('itemsContainer');
    const rowId = Date.now();
    const row = document.createElement('div');
    row.className = 'item-row';
    row.id = 'item-' + rowId;
    row.innerHTML = `
        <select class="item-type" onchange="updateItemRate(${rowId})">
            <option value="">प्रकार निवडा</option>
            <option value="गव्हाची शेवई" data-rate="90">गव्हाची शेवई (₹90)</option>
            <option value="रवा शेवई" data-rate="70">रवा शेवई (₹70)</option>
            <option value="मैदा शेवई" data-rate="90">मैदा शेवई (₹90)</option>
            <option value="रवा + गहू" data-rate="90">रवा + गहू (₹90)</option>
            <option value="रवा + मैदा" data-rate="90">रवा + मैदा (₹90)</option>
        </select>
        <select class="item-size" onchange="calculateTotal()">
            <option value="बारीक">बारीक</option>
            <option value="मध्यम">मध्यम</option>
            <option value="जाड">जाड</option>
        </select>
        <input type="number" class="item-qty" placeholder="Kg" step="0.1" oninput="calculateTotal()">
        <input type="number" class="item-rate" placeholder="Rate" step="0.01" readonly>
        <input type="number" class="item-total" placeholder="Total" readonly>
        <button type="button" class="remove-item-btn" onclick="removeItemRow(${rowId})">✖</button>
    `;
    container.appendChild(row);
}

// ✅ NEW: Auto Rate Set करतो
function updateItemRate(rowId) {
    const row = document.getElementById('item-' + rowId);
    const typeSelect = row.querySelector('.item-type');
    const rateInput = row.querySelector('.item-rate');

    const selectedOption = typeSelect.options[typeSelect.selectedIndex];
    const rate = selectedOption.getAttribute('data-rate') || 0;

    rateInput.value = rate;
    calculateTotal();
}

function removeItemRow(id) {
    document.getElementById('item-' + id)?.remove();
    calculateTotal();
}

// ✅ UPDATED: Qty x Rate Calculation
function calculateTotal() {
    let grandTotal = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
        const total = qty * rate;
        row.querySelector('.item-total').value = total.toFixed(2);
        grandTotal += total;
    });
    document.getElementById('totalAmount').value = grandTotal.toFixed(2);
}

// ✅ UPDATED: Items Format - प्रकार (Size) सहित Save
async function handleOrderSubmit(e) {
    e.preventDefault();

    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const type = row.querySelector('.item-type').value;
        const size = row.querySelector('.item-size').value;
        const qty = row.querySelector('.item-qty').value;
        const rate = row.querySelector('.item-rate').value;
        const total = row.querySelector('.item-total').value;

        if (type && qty) {
            items.push(`${type} (${size}) - ${qty}Kg x ₹${rate} = ₹${total}`);
        }
    });

    const data = {
        action: editingOrderId? 'updateOrder' : 'addOrder',
        row: editingOrderId,
        name: document.getElementById('custName').value,
        mobile: document.getElementById('custMobile').value,
        address: document.getElementById('custAddress').value,
        items: items.join(' | '), // ✅ FIX: \n ऐवजी | वापरला
        deliveryDate: document.getElementById('deliveryDate').value,
        priority: document.getElementById('orderPriority').value,
        total: document.getElementById('totalAmount').value,
        note: document.getElementById('orderNote').value
    };

    try {
        showToast('Saving...');
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
        });
        const result = await res.json();

        if (result.error) {
            alert('Error: ' + result.error);
            return;
        }

        closeAddOrderModal();
        loadOrders();
        showToast('✅ Order Saved!');
    } catch (error) {
        alert('Error: ' + error);
    }
}

function editOrderModal(row) {
    const order = allOrders.find(o => (o.rowNumber || getKey(o, ['Row'])) == row);
    if (!order) return;

    const status = getKey(order, ['Status'])?.trim();
    if (status === 'डिलिव्हर') {
        alert('Delivered Order Edit करू शकत नाही!');
        return;
    }

    editingOrderId = row;
    document.getElementById('addOrderModalTitle').textContent = 'Edit Order';
    document.getElementById('custName').value = getKey(order, ['नाव', 'Name']);
    document.getElementById('custMobile').value = getKey(order, ['मोबाईल', 'Mobile']);
    document.getElementById('custAddress').value = getKey(order, ['पत्ता', 'Address']) || '';
    document.getElementById('deliveryDate').value = getKey(order, ['Delivery Date', 'DeliveryDate']);
    document.getElementById('orderPriority').value = getKey(order, ['Priority']) || 'normal';
    document.getElementById('totalAmount').value = getKey(order, ['एकूण', 'Total']);
    document.getElementById('orderNote').value = getKey(order, ['Note', 'note', 'टीप']) || '';

    document.getElementById('itemsContainer').innerHTML = '';
    addItemRow();

    document.getElementById('addOrderModal').style.display = 'flex';
}

// =====================================================
// ========== UTILITY FUNCTIONS ========================
// =====================================================

function getKey(order, possibleKeys) {
    for (const key of possibleKeys) {
        for (const orderKey in order) {
            if (orderKey.trim() === key.trim()) {
                return order[orderKey];
            }
        }
    }
    return '';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString('mr-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch (e) {
        return '-';
    }
}

function showToast(msg) {
    console.log(msg);
}

// ===== POPUP FUNCTIONS =====
function showOrderDetails(order) {
    document.getElementById('modalOrderId').textContent = `Order: ${getKey(order, ['Order ID', 'OrderID'])}`;
    document.getElementById('modalName').textContent = getKey(order, ['नाव', 'Name']) || '-';
    document.getElementById('modalMobile').textContent = getKey(order, ['मोबाईल', 'Mobile']) || '-';
    document.getElementById('modalAddress').textContent = getKey(order, ['पत्ता', 'Address']) || 'पत्ता उपलब्ध नाही';
    document.getElementById('modalItems').textContent = getKey(order, ['ऑर्डर डिटेल्स', 'Items']) || 'आयटम्स नाहीत';
    document.getElementById('modalTotal').textContent = `₹${getKey(order, ['एकूण', 'Total']) || '0'}`;

    const timestamp = getKey(order, ['Timestamp']);
    const orderDateText = formatDate(timestamp);

    const actualDelivery = getKey(order, ['Actual Delivery Date', 'ActualDeliveryDate']);
    const deliveryText = actualDelivery? formatDate(actualDelivery) : 'अजून डिलिव्हर नाही';

    const modalBody = document.querySelector('.modal-body');
    const existingOrderDate = document.getElementById('modalOrderDate');
    if (existingOrderDate) existingOrderDate.remove();

    const orderDateP = document.createElement('p');
    orderDateP.id = 'modalOrderDate';
    orderDateP.innerHTML = `<strong>ऑर्डर तारीख:</strong> <span>${orderDateText}</span>`;

    const deliveryP = Array.from(modalBody.querySelectorAll('p')).find(p => p.textContent.includes('डिलिव्हरी तारीख'));
    if (deliveryP) {
        modalBody.insertBefore(orderDateP, deliveryP);
    }

    document.getElementById('modalDelivery').textContent = deliveryText;
    document.getElementById('modalNote').textContent = getKey(order, ['note', 'Note', 'टीप']) || 'काही टीप नाही';
    document.getElementById('orderModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('orderModal').style.display = 'none';
}

window.onclick = function(event) {
    const modal1 = document.getElementById('orderModal');
    const modal2 = document.getElementById('addOrderModal');
    if (event.target == modal1) modal1.style.display = 'none';
    if (event.target == modal2) modal2.style.display = 'none';
}

// ===== EXPORT ORDERS =====
function exportOrders() {
    const filtered = getCurrentFilteredOrders();
    if (filtered.length === 0) {
        alert('Export करायला Orders नाहीत!');
        return;
    }

    let csv = 'Order ID,Date,Name,Mobile,Items,Total,Advance Paid,Balance,Status,Payment\n';
    filtered.forEach(o => {
        const orderId = getKey(o, ['Order ID', 'OrderID']);
        const date = formatDate(getKey(o, ['Timestamp']));
        const name = getKey(o, ['नाव', 'Name']);
        const mobile = getKey(o, ['मोबाईल', 'Mobile']);
        const items = getKey(o, ['ऑर्डर डिटेल्स', 'Items']).replace(/,/g, ';');
        const total = parseFloat(getKey(o, ['एकूण', 'Total'])) || 0;
        const advancePaid = parseFloat(getKey(o, ['Advance Paid', 'Advance'])) || 0;
        const balance = total - advancePaid;
        const status = getKey(o, ['Status'])?.trim();
        const payment = advancePaid >= total? 'Paid' : advancePaid > 0? 'Partial' : 'Unpaid';

        csv += `${orderId},${date},${name},${mobile},"${items}",${total},${advancePaid},${balance},${status},${payment}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

function getCurrentFilteredOrders() {
    const rows = document.querySelectorAll('#ordersBody tr');
    const filtered = [];
    rows.forEach(row => {
        const orderId = row.querySelector('.order-id-link')?.textContent;
        if (orderId) {
            const order = allOrders.find(o => getKey(o, ['Order ID', 'OrderID']) === orderId);
            if (order) filtered.push(order);
        }
    });
    return filtered.length > 0? filtered : allOrders;
}

// ✅ Dummy function - Login system नसेल तर
function getCurrentUser() {
    return { name: 'Admin' }; // किंवा localStorage मधून घे
}