// =====================================================
// ========== धनलक्ष्मी - ORDER DASHBOARD v4.7 ==========
// ========== Mixed Shevai Support + Website Like UI ===
// =====================================================

const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) ? window.APP_CONFIG.API_URL : 'https://script.google.com/macros/s/AKfycbzcQviEyybujCo-XM-CEHQXZdMYcyv2tmNAauY2HWwQ5BCyjURVxDo1wk8dEO[...]

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

        // Log raw response to help debugging
        console.log('loadOrders api raw response:', data);

        // If API returned an explicit error field, show it
        if (data && data.error) {
            showError('Error: ' + data.error);
            allOrders = [];
            return;
        }

        // Normalize response into an array (handle multiple API shapes)
        let ordersArray = [];
        if (!data) {
            ordersArray = [];
        } else if (Array.isArray(data)) {
            ordersArray = data;
        } else if (Array.isArray(data.orders)) {
            ordersArray = data.orders;
        } else if (data.ok && Array.isArray(data.orders)) {
            ordersArray = data.orders;
        } else if (Array.isArray(data.result)) {
            // some endpoints return { result: [...] }
            ordersArray = data.result;
        } else {
            // Defensive: if the object itself looks like a single order, wrap it
            const maybeOrderKeys = ['Order ID','OrderID','Timestamp','Name','नाव'];
            const hasOrderLike = Object.keys(data || {}).some(k => maybeOrderKeys.includes(k));
            if (hasOrderLike) ordersArray = [data];
            else ordersArray = [];
        }

        // Ensure allOrders is an array and add rowNumber fallback
        allOrders = ordersArray.map((o, idx) => {
            if (o && !o.rowNumber) {
                o.rowNumber = o.Row || o.rowNumber || (idx + 2);
            }
            return o;
        });

        updateDashboardStats();
        filterOrders();
    } catch (error) {
        console.error('Load Orders Error:', error);
        showError('Orders लोड करताना Error आला: ' + (error.message || error));
        allOrders = [];
    }
}

async function loadMaterials() {
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getRawMaterials' })
        });
        const json = await res.json();
        // Accept either array or {ok:true, materials:[]}
        if (Array.isArray(json)) allMaterials = json;
        else if (json && Array.isArray(json.materials)) allMaterials = json.materials;
        else allMaterials = [];
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
                        <option value="प्रक्रिया सुरू" ${status === 'प्रक्रिया सुरू'? 'selected' : ''}>प्रक्रिया सुरू[...]`
, 