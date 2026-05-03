// ===== CONFIG =====
const API_URL = 'https://script.google.com/macros/s/AKfycbzcQviEyybujCo-XM-CEHQXZdMYcyv2tmNAauY2HWwQ5BCyjURVxDo1wk8dEOgoiCg/exec';

// ===== GLOBAL STATE =====
let allMaterials = [];
let allExpenses = [];
let allOrders = [];
let allMaterialMaster = [];
let allCategoryMaster = [];
let isSavingMaterial = false;
let isSavingExpense = false;
let editingMaterialRow = null;
let editingExpenseRow = null;
let profitChart = null;
let masterDataLoaded = false;

// ===== पेज लोड झाल्यावर - OPTIMIZED =====
document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    document.getElementById('expDate').value = today;
    const currentMonth = new Date().toISOString().slice(0, 7);
    document.getElementById('monthPicker').value = currentMonth;

    if(document.getElementById('materialMonthPicker')) {
        document.getElementById('materialMonthPicker').value = currentMonth;
        document.getElementById('materialDatePicker').value = today;
        document.getElementById('materialYearPicker').value = new Date().getFullYear();
    }
    if(document.getElementById('expenseMonthPicker')) {
        document.getElementById('expenseMonthPicker').value = currentMonth;
        document.getElementById('expenseDatePicker').value = today;
        document.getElementById('expenseYearPicker').value = new Date().getFullYear();
    }

    if(document.getElementById('profitPeriod')) {
        document.getElementById('profitDatePicker').value = today;
        document.getElementById('yearPicker').value = new Date().getFullYear();
        document.getElementById('profitPeriod').addEventListener('change', handlePeriodChange);
        document.getElementById('profitDatePicker').addEventListener('change', loadProfitLoss);
        document.getElementById('monthPicker').addEventListener('change', loadProfitLoss);
        document.getElementById('yearPicker').addEventListener('change', loadProfitLoss);
    }

    if(document.getElementById('materialPeriod')) {
        document.getElementById('materialPeriod').addEventListener('change', handleMaterialPeriodChange);
        document.getElementById('materialDatePicker').addEventListener('change', () => displayMaterials(allMaterials));
        document.getElementById('materialMonthPicker').addEventListener('change', () => displayMaterials(allMaterials));
        document.getElementById('materialYearPicker').addEventListener('change', () => displayMaterials(allMaterials));
    }
    if(document.getElementById('expensePeriod')) {
        document.getElementById('expensePeriod').addEventListener('change', handleExpensePeriodChange);
        document.getElementById('expenseDatePicker').addEventListener('change', () => {
            updateExpenseStats(allExpenses, allMaterials);
            displayExpenses(allExpenses, allMaterials);
        });
        document.getElementById('expenseMonthPicker').addEventListener('change', () => {
            updateExpenseStats(allExpenses, allMaterials);
            displayExpenses(allExpenses, allMaterials);
        });
        document.getElementById('expenseYearPicker').addEventListener('change', () => {
            updateExpenseStats(allExpenses, allMaterials);
            displayExpenses(allExpenses, allMaterials);
        });
    }

    document.getElementById('materialForm').addEventListener('submit', saveMaterial);
    document.getElementById('expenseForm').addEventListener('submit', saveExpense);

    // SPEED: Master Data आधीच Load कर
    showLoadingToast('डेटा लोड होतोय...');
    await Promise.all([loadMaterialMaster(), loadCategoryMaster()]);
    masterDataLoaded = true;
    hideLoadingToast();

    loadRawMaterials();
    loadExpenses();
    loadProfitLoss();
});

// ===== TOAST HELPER =====
function showLoadingToast(msg) {
    let toast = document.getElementById('loadingToast');
    if(!toast) {
        toast = document.createElement('div');
        toast.id = 'loadingToast';
        toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#333;color:#fff;padding:12px 20px;border-radius:8px;z-index:9999;font-size:14px;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.display = 'block';
}
function hideLoadingToast() {
    const toast = document.getElementById('loadingToast');
    if(toast) toast.style.display = 'none';
}

// ===== TAB SWITCH करणे - FIXED =====
function showTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if(event && event.target) event.target.classList.add('active');
}

// ===== KEY FINDER =====
function getKey(obj, keys) {
    for (const key of keys) {
        for (const objKey in obj) {
            if (objKey.trim() === key.trim()) return obj[objKey];
        }
    }
    return '';
}

// ===== DATE FORMATTER =====
function formatDate(dateString) {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString('mr-IN', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    } catch (e) { return dateString; }
}

// ===== Get Date Range Helper =====
function getDateRange(period, dateInput, monthInput, yearInput) {
    let startDate, endDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if(period === 'daily') {
        const selectedDate = new Date(dateInput.value || today);
        startDate = new Date(selectedDate);
        endDate = new Date(selectedDate);
    }
    else if(period === 'weekly') {
        const selectedDate = new Date(dateInput.value || today);
        const day = selectedDate.getDay();
        const diff = selectedDate.getDate() - day + (day === 0? -6 : 1);
        startDate = new Date(selectedDate.setDate(diff));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
    }
    else if(period === 'monthly') {
        const [year, month] = monthInput.value.split('-');
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0);
    }
    else if(period === 'yearly') {
        const year = yearInput.value || today.getFullYear();
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
    }
    else if(period === 'all') return null;
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
}

// ===== SEARCH FUNCTIONALITY =====
let searchTimeout;
function handleSearch(tabName) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const searchInput = document.getElementById(tabName + 'Search');
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (tabName === 'rawmaterial') displayMaterials(allMaterials, searchTerm);
        else if (tabName === 'expenses') displayExpenses(allExpenses, allMaterials, searchTerm);
    }, 300);
}

// =====================================================
// ========== MASTER DATA - CACHED =====================
// =====================================================

async function loadMaterialMaster(silent = false) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getMaterialMaster' })
        });
        const data = await response.json();
        if (!data.error) {
            allMaterialMaster = data;
            populateMaterialDropdown();
        }
    } catch (error) {
        if(!silent) console.error('Material Master Load Error:', error);
    }
}

function populateMaterialDropdown() {
    const select = document.getElementById('matName');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">Select Material</option>';
    allMaterialMaster.forEach(mat => {
        const name = getKey(mat, ['MaterialName', 'Material']);
        if (name) select.innerHTML += `<option value="${name}">${name}</option>`;
    });
    if(currentVal) select.value = currentVal;
}

async function addNewMaterial() {
    const newMat = prompt('नवीन मालाचे नाव टाका:');
    if (!newMat ||!newMat.trim()) return;
    const exists = allMaterialMaster.some(m =>
        getKey(m, ['MaterialName', 'Material']).toLowerCase() === newMat.trim().toLowerCase()
    );
    if (exists) {
        alert('हा माल आधीच आहे!');
        return;
    }
    try {
        showLoadingToast('माल ॲड होतोय...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addMaterialMaster', materialName: newMat.trim() })
        });
        const result = await response.json();
        if (result.success) {
            allMaterialMaster.push({ MaterialName: newMat.trim() });
            populateMaterialDropdown();
            document.getElementById('matName').value = newMat.trim();
            hideLoadingToast();
        } else {
            hideLoadingToast();
            alert('Error: ' + result.error);
        }
    } catch (error) {
        hideLoadingToast();
        alert('API Error: ' + error.message);
    }
}

async function loadCategoryMaster(silent = false) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getCategoryMaster' })
        });
        const data = await response.json();
        if (!data.error) {
            allCategoryMaster = data;
            populateCategoryDropdown();
        }
    } catch (error) {
        if(!silent) console.error('Category Master Load Error:', error);
    }
}

function populateCategoryDropdown() {
    const select = document.getElementById('expCategory');
    if (!select) return;
    const currentVal = select.value;
    const defaults = ['कच्चा माल', 'लाईट बिल', 'पाणी बिल', 'गॅस', 'पगार', 'भाडं', 'पॅकिंग मटेरियल', 'पेट्रोल', 'इतर'];
    const masterCats = allCategoryMaster.map(c => getKey(c, ['CategoryName', 'Category'])).filter(c => c);
    const allCats = [...new Set([...defaults,...masterCats])];
    select.innerHTML = '<option value="">Select</option>';
    allCats.forEach(cat => select.innerHTML += `<option value="${cat}">${cat}</option>`);
    if(currentVal) select.value = currentVal;
}

async function addNewCategory() {
    const newCat = prompt('नवीन Category नाव टाका:');
    if (!newCat ||!newCat.trim()) return;
    const exists = allCategoryMaster.some(c =>
        getKey(c, ['CategoryName', 'Category']).toLowerCase() === newCat.trim().toLowerCase()
    );
    if (exists) {
        alert('ही Category आधीच आहे!');
        return;
    }
    try {
        showLoadingToast('Category ॲड होतेय...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'addCategoryMaster', categoryName: newCat.trim() })
        });
        const result = await response.json();
        if (result.success) {
            allCategoryMaster.push({ CategoryName: newCat.trim() });
            populateCategoryDropdown();
            document.getElementById('expCategory').value = newCat.trim();
            hideLoadingToast();
        } else {
            hideLoadingToast();
            alert('Error: ' + result.error);
        }
    } catch (error) {
        hideLoadingToast();
        alert('API Error: ' + error.message);
    }
}

// =====================================================
// ========== RAW MATERIAL SECTION =====================
// =====================================================

function handleMaterialPeriodChange() {
    const period = document.getElementById('materialPeriod').value;
    const datePicker = document.getElementById('materialDatePicker');
    const monthPicker = document.getElementById('materialMonthPicker');
    const yearPicker = document.getElementById('materialYearPicker');
    datePicker.style.display = 'none';
    monthPicker.style.display = 'none';
    yearPicker.style.display = 'none';
    if(period === 'daily' || period === 'weekly') datePicker.style.display = 'block';
    else if(period === 'monthly') monthPicker.style.display = 'block';
    else if(period === 'yearly') yearPicker.style.display = 'block';
    displayMaterials(allMaterials);
}

async function loadRawMaterials() {
    const tbody = document.getElementById('materialBody');
    tbody.innerHTML = '<tr><td colspan="9" class="loading">लोड होत आहे...</td></tr>';
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getRawMaterials' })
        });
        const data = await response.json();
        if (data.error) {
            tbody.innerHTML = `<tr><td colspan="9" class="loading">Error: ${data.error}</td></tr>`;
            return;
        }
        allMaterials = data;
        displayMaterials(allMaterials);
        checkLowStock(allMaterials);
        updateExpenseStats(allExpenses, allMaterials);
        displayExpenses(allExpenses, allMaterials);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="9" class="loading">API Error: ${error.message}</td></tr>`;
    }
}

function displayMaterials(materials, searchTerm = '') {
    const tbody = document.getElementById('materialBody');
    const period = document.getElementById('materialPeriod')?.value || 'all';
    let filteredMaterials = materials;
    if (period!== 'all') {
        const dateRange = getDateRange(
            period,
            document.getElementById('materialDatePicker'),
            document.getElementById('materialMonthPicker'),
            document.getElementById('materialYearPicker')
        );
        if (dateRange) {
            filteredMaterials = materials.filter(m => {
                const d = new Date(getKey(m, ['Date']));
                return d >= dateRange.startDate && d <= dateRange.endDate;
            });
        }
    }
    if (searchTerm) {
        filteredMaterials = filteredMaterials.filter(m => {
            const name = getKey(m, ['Material']).toLowerCase();
            const supplier = getKey(m, ['Supplier']).toLowerCase();
            return name.includes(searchTerm) || supplier.includes(searchTerm);
        });
    }
    if (filteredMaterials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading">माल सापडला नाही</td></tr>';
        return;
    }
    tbody.innerHTML = filteredMaterials.map(mat => {
        const date = formatDate(getKey(mat, ['Date']));
        const name = getKey(mat, ['Material']) || '-';
        const qty = getKey(mat, ['Qty']) || '0';
        const unit = getKey(mat, ['Unit']) || '-';
        const rate = getKey(mat, ['Rate']) || '0';
        const total = getKey(mat, ['Total']) || '0';
        const supplier = getKey(mat, ['Supplier']) || '-';
        const minStock = parseFloat(getKey(mat, ['MinStock']) || '0');
        const currentStock = parseFloat(getKey(mat, ['CurrentStock']) || '0');
        const isLowStock = currentStock <= minStock && minStock > 0;
        const rowClass = isLowStock? 'low-stock' : '';
        return `
            <tr class="${rowClass}">
                <td>${date}</td>
                <td><b>${name}</b></td>
                <td>${qty}</td>
                <td>${unit}</td>
                <td>₹${rate}</td>
                <td><b>₹${total}</b></td>
                <td>${supplier}</td>
                <td>${currentStock} ${unit} ${isLowStock? '⚠️' : ''}</td>
                <td>
                    <button class="action-btn-sm" onclick="editMaterial(${mat.rowNumber})">Edit</button>
                    <button class="action-btn-sm" onclick="useMaterial(${mat.rowNumber})">वापरा</button>
                    <button class="action-btn-sm delete" onclick="deleteMaterial(${mat.rowNumber})">Del</button>
                </td>
            </tr>
        `;
    }).join('');
    const totalAmount = filteredMaterials.reduce((sum, m) => sum + (parseFloat(getKey(m, ['Total'])) || 0), 0);
    tbody.innerHTML += `
        <tr style="background:#fff3e0; font-weight:700;">
            <td colspan="5" style="text-align:right;">एकूण:</td>
            <td><b>₹${totalAmount.toFixed(2)}</b></td>
            <td colspan="3"></td>
        </tr>
    `;
}

function checkLowStock(materials) {
    const lowStockItems = materials.filter(mat => {
        const minStock = parseFloat(getKey(mat, ['MinStock']) || '0');
        const currentStock = parseFloat(getKey(mat, ['CurrentStock']) || '0');
        return currentStock <= minStock && minStock > 0;
    });
    if (lowStockItems.length > 0) {
        const alertDiv = document.getElementById('lowStockAlert');
        const listSpan = document.getElementById('lowStockList');
        const uniqueNames = [...new Set(lowStockItems.map(m => getKey(m, ['Material'])))];
        listSpan.textContent = uniqueNames.join(', ');
        alertDiv.style.display = 'block';
    } else {
        document.getElementById('lowStockAlert').style.display = 'none';
    }
}

function editMaterial(rowNumber) {
    const material = allMaterials.find(m => m.rowNumber === rowNumber);
    if (!material) return;
    editingMaterialRow = rowNumber;
    document.getElementById('materialModalTitle').textContent = 'माल Edit करा';
    document.getElementById('matName').value = getKey(material, ['Material']);
    document.getElementById('matQty').value = getKey(material, ['Qty']);
    document.getElementById('matUnit').value = getKey(material, ['Unit']);
    document.getElementById('matRate').value = getKey(material, ['Rate']);
    document.getElementById('matSupplier').value = getKey(material, ['Supplier']);
    document.getElementById('matMinStock').value = getKey(material, ['MinStock']);
    document.getElementById('matName').disabled = true;
    document.getElementById('matQty').disabled = true;
    document.getElementById('matUnit').disabled = true;
    document.getElementById('matRate').disabled = true;
    document.getElementById('matSupplier').disabled = true;
    openMaterialModal();
}

async function saveMaterial(e) {
    e.preventDefault();
    if (isSavingMaterial) return;
    isSavingMaterial = true;
    const submitBtn = e.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'सेव्ह होत आहे...';
    const isEditing = editingMaterialRow!== null;
    const material = {
        date: new Date().toLocaleDateString('en-CA'),
        name: document.getElementById('matName').value,
        qty: parseFloat(document.getElementById('matQty').value),
        unit: document.getElementById('matUnit').value,
        rate: parseFloat(document.getElementById('matRate').value),
        total: parseFloat(document.getElementById('matQty').value) * parseFloat(document.getElementById('matRate').value),
        supplier: document.getElementById('matSupplier').value,
        minStock: parseFloat(document.getElementById('matMinStock').value) || 0,
        currentStock: parseFloat(document.getElementById('matQty').value)
    };
    try {
        if (isEditing) {
            const idx = allMaterials.findIndex(m => m.rowNumber === editingMaterialRow);
            if(idx!== -1) allMaterials[idx].MinStock = material.minStock;
            displayMaterials(allMaterials);
            closeMaterialModal();
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'updateMaterial', rowNumber: editingMaterialRow, minStock: material.minStock })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
        } else {
            const tempRow = {...material, rowNumber: Date.now(), Date: material.date, Material: material.name, Qty: material.qty, Unit: material.unit, Rate: material.rate, Total: material.total, Supplier: material.supplier, MinStock: material.minStock, CurrentStock: material.currentStock };
            allMaterials.unshift(tempRow);
            displayMaterials(allMaterials);
            closeMaterialModal();
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'addRawMaterial', material: material })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            if(result.rowNumber) tempRow.rowNumber = result.rowNumber;
        }
        loadRawMaterials();
        loadProfitLoss();
    } catch (error) {
        alert('Error: ' + error.message);
        loadRawMaterials();
    } finally {
        isSavingMaterial = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'सेव्ह करा';
        editingMaterialRow = null;
        document.getElementById('matName').disabled = false;
        document.getElementById('matQty').disabled = false;
        document.getElementById('matUnit').disabled = false;
        document.getElementById('matRate').disabled = false;
        document.getElementById('matSupplier').disabled = false;
        document.getElementById('materialModalTitle').textContent = 'नवीन माल ॲड करा';
        document.getElementById('materialForm').reset();
    }
}

async function useMaterial(rowNumber) {
    const qty = prompt('किती वापरला?');
    if (!qty || isNaN(qty) || parseFloat(qty) <= 0) return;
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'useMaterial', rowNumber: rowNumber, usedQty: parseFloat(qty) })
        });
        const result = await response.json();
        if (result.success) await loadRawMaterials();
        else alert('Error: ' + result.error);
    } catch (error) {
        alert('API Error: ' + error.message);
    }
}

async function deleteMaterial(rowNumber) {
    if (!confirm('हा माल डिलीट करायचा का?')) return;
    try {
        allMaterials = allMaterials.filter(m => m.rowNumber!== rowNumber);
        displayMaterials(allMaterials);
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'deleteMaterial', rowNumber: rowNumber })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        loadProfitLoss();
    } catch (error) {
        alert('Error: ' + error.message);
        loadRawMaterials();
    }
}

// =====================================================
// ========== EXPENSES SECTION =========================
// =====================================================

function handleExpensePeriodChange() {
    const period = document.getElementById('expensePeriod').value;
    const datePicker = document.getElementById('expenseDatePicker');
    const monthPicker = document.getElementById('expenseMonthPicker');
    const yearPicker = document.getElementById('expenseYearPicker');
    datePicker.style.display = 'none';
    monthPicker.style.display = 'none';
    yearPicker.style.display = 'none';
    if(period === 'daily' || period === 'weekly') datePicker.style.display = 'block';
    else if(period === 'monthly') monthPicker.style.display = 'block';
    else if(period === 'yearly') yearPicker.style.display = 'block';
    updateExpenseStats(allExpenses, allMaterials);
    displayExpenses(allExpenses, allMaterials);
}

async function loadExpenses() {
    const tbody = document.getElementById('expenseBody');
    tbody.innerHTML = '<tr><td colspan="7" class="loading">लोड होत आहे...</td></tr>';
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'getExpenses' })
        });
        const data = await response.json();
        if (data.error) {
            tbody.innerHTML = `<tr><td colspan="7" class="loading">Error: ${data.error}</td></tr>`;
            return;
        }
        allExpenses = data;
        displayExpenses(allExpenses, allMaterials);
        updateExpenseStats(allExpenses, allMaterials);
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="loading">API Error: ${error.message}</td></tr>`;
    }
}

function displayExpenses(expenses, materials = [], searchTerm = '') {
    const tbody = document.getElementById('expenseBody');
    const period = document.getElementById('expensePeriod')?.value || 'monthly';
    const dateRange = getDateRange(
        period,
        document.getElementById('expenseDatePicker'),
        document.getElementById('expenseMonthPicker'),
        document.getElementById('expenseYearPicker')
    );
    const monthExpenses = expenses.filter(e => {
        const d = new Date(getKey(e, ['Date']));
        if (!dateRange) return true;
        return d >= dateRange.startDate && d <= dateRange.endDate;
    });
    const monthMaterials = materials.filter(m => {
        const d = new Date(getKey(m, ['Date']));
        if (!dateRange) return true;
        return d >= dateRange.startDate && d <= dateRange.endDate;
    });
    let combinedList = [];
    monthExpenses.forEach(exp => {
        combinedList.push({
            date: getKey(exp, ['Date']),
            category: getKey(exp, ['Category']) || '-',
            description: getKey(exp, ['Description']) || '-',
            amount: getKey(exp, ['Amount']) || '0',
            payment: getKey(exp, ['PaymentMode']) || '-',
            note: getKey(exp, ['Note']) || '-',
            rowNumber: exp.rowNumber,
            type: 'expense'
        });
    });
    monthMaterials.forEach(mat => {
        combinedList.push({
            date: getKey(mat, ['Date']),
            category: 'कच्चा माल',
            description: getKey(mat, ['Material']) || '-',
            amount: getKey(mat, ['Total']) || '0',
            payment: 'Cash',
            note: `Supplier: ${getKey(mat, ['Supplier']) || '-'}`,
            rowNumber: mat.rowNumber,
            type: 'material'
        });
    });
    if (searchTerm) {
        combinedList = combinedList.filter(item => {
            const desc = item.description.toLowerCase();
            const cat = item.category.toLowerCase();
            return desc.includes(searchTerm) || cat.includes(searchTerm);
        });
    }
    combinedList.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (combinedList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">खर्च सापडला नाही</td></tr>';
        return;
    }
    tbody.innerHTML = combinedList.map(item => {
        const date = formatDate(item.date);
        let actionButtons = '';
        if (item.type === 'expense') {
            actionButtons = `
                <button class="action-btn-sm" onclick="editExpense(${item.rowNumber})">Edit</button>
                <button class="action-btn-sm delete" onclick="deleteExpense(${item.rowNumber})">Del</button>
            `;
        } else {
            actionButtons = `<button class="action-btn-sm delete" onclick="deleteMaterial(${item.rowNumber})">Del</button>`;
        }
        return `
            <tr>
                <td>${date}</td>
                <td><b>${item.category}</b></td>
                <td>${item.description}</td>
                <td><b>₹${item.amount}</b></td>
                <td>${item.payment}</td>
                <td>${item.note}</td>
                <td>${actionButtons}</td>
            </tr>
        `;
    }).join('');
    const totalAmount = combinedList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    tbody.innerHTML += `
        <tr style="background:#fff3e0; font-weight:700;">
            <td colspan="3" style="text-align:right;">एकूण:</td>
            <td><b>₹${totalAmount.toFixed(2)}</b></td>
            <td colspan="3"></td>
        </tr>
    `;
}

function updateExpenseStats(expenses, materials = []) {
    const today = new Date().toDateString();
    const period = document.getElementById('expensePeriod')?.value || 'monthly';
    const dateRange = getDateRange(
        period,
        document.getElementById('expenseDatePicker'),
        document.getElementById('expenseMonthPicker'),
        document.getElementById('expenseYearPicker')
    );
    const todayExpenseTotal = expenses
   .filter(e => new Date(getKey(e, ['Date'])).toDateString() === today)
   .reduce((sum, e) => sum + (parseFloat(getKey(e, ['Amount'])) || 0), 0);
    const todayMaterialTotal = materials
   .filter(m => new Date(getKey(m, ['Date'])).toDateString() === today)
   .reduce((sum, m) => sum + (parseFloat(getKey(m, ['Total'])) || 0), 0);
    const todayTotal = todayExpenseTotal + todayMaterialTotal;
    const periodExpenseTotal = expenses
   .filter(e => {
            const d = new Date(getKey(e, ['Date']));
            if (!dateRange) return true;
            return d >= dateRange.startDate && d <= dateRange.endDate;
        })
   .reduce((sum, e) => sum + (parseFloat(getKey(e, ['Amount'])) || 0), 0);
    const periodMaterialTotal = materials
   .filter(m => {
            const d = new Date(getKey(m, ['Date']));
            if (!dateRange) return true;
            return d >= dateRange.startDate && d <= dateRange.endDate;
        })
   .reduce((sum, m) => sum + (parseFloat(getKey(m, ['Total'])) || 0), 0);
    const periodTotal = periodExpenseTotal + periodMaterialTotal;
    document.getElementById('todayExpense').textContent = todayTotal.toFixed(2);
    document.getElementById('monthExpense').textContent = periodTotal.toFixed(2);
}

function editExpense(rowNumber) {
    const expense = allExpenses.find(e => e.rowNumber === rowNumber);
    if (!expense) return;
    editingExpenseRow = rowNumber;
    document.getElementById('expenseModalTitle').textContent = 'खर्च Edit करा';
    document.getElementById('expDate').value = new Date(getKey(expense, ['Date'])).toLocaleDateString('en-CA');
    document.getElementById('expCategory').value = getKey(expense, ['Category']);
    document.getElementById('expDesc').value = getKey(expense, ['Description']);
    document.getElementById('expAmount').value = getKey(expense, ['Amount']);
    document.getElementById('expPayment').value = getKey(expense, ['PaymentMode']);
    document.getElementById('expNote').value = getKey(expense, ['Note']);
    openExpenseModal();
}

async function saveExpense(e) {
    e.preventDefault();
    if (isSavingExpense) return;
    isSavingExpense = true;
    const submitBtn = e.target.querySelector('.submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'सेव्ह होत आहे...';
    const isEditing = editingExpenseRow!== null;
    const expense = {
        date: document.getElementById('expDate').value,
        category: document.getElementById('expCategory').value,
        description: document.getElementById('expDesc').value,
        amount: parseFloat(document.getElementById('expAmount').value),
        paymentMode: document.getElementById('expPayment').value,
        note: document.getElementById('expNote').value
    };
    try {
        if (isEditing) {
            const idx = allExpenses.findIndex(e => e.rowNumber === editingExpenseRow);
            if(idx!== -1) Object.assign(allExpenses[idx], expense);
            displayExpenses(allExpenses, allMaterials);
            updateExpenseStats(allExpenses, allMaterials);
            closeExpenseModal();
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'updateExpense', rowNumber: editingExpenseRow, expense: expense })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
        } else {
            const tempRow = {...expense, rowNumber: Date.now(), Date: expense.date, Category: expense.category, Description: expense.description, Amount: expense.amount, PaymentMode: expense.paymentMode, Note: expense.note };
            allExpenses.unshift(tempRow);
            displayExpenses(allExpenses, allMaterials);
            updateExpenseStats(allExpenses, allMaterials);
            closeExpenseModal();
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'addExpense', expense: expense })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error);
            if(result.rowNumber) tempRow.rowNumber = result.rowNumber;
        }
        loadExpenses();
        loadProfitLoss();
    } catch (error) {
        alert('Error: ' + error.message);
        loadExpenses();
    } finally {
        isSavingExpense = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'सेव्ह करा';
        editingExpenseRow = null;
        document.getElementById('expenseModalTitle').textContent = 'नवीन खर्च ॲड करा';
        document.getElementById('expenseForm').reset();
        document.getElementById('expDate').value = new Date().toLocaleDateString('en-CA');
    }
}

async function deleteExpense(rowNumber) {
    if (!confirm('हा खर्च डिलीट करायचा का?')) return;
    try {
        allExpenses = allExpenses.filter(e => e.rowNumber!== rowNumber);
        displayExpenses(allExpenses, allMaterials);
        updateExpenseStats(allExpenses, allMaterials);
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'deleteExpense', rowNumber: rowNumber })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        loadProfitLoss();
    } catch (error) {
        alert('Error: ' + error.message);
        loadExpenses();
    }
}

// =====================================================
// ========== EXPORT TO EXCEL FUNCTION =================
// =====================================================

function exportToExcel(tabName) {
    let data, filename, headers;
    if (tabName === 'rawmaterial') {
        data = allMaterials;
                filename = 'Raw_Materials_' + new Date().toLocaleDateString('en-CA') + '.csv';
        headers = ['Date', 'Material', 'Qty', 'Unit', 'Rate', 'Total', 'Supplier', 'CurrentStock', 'MinStock'];
    } else if (tabName === 'expenses') {
        data = allExpenses;
        filename = 'Expenses_' + new Date().toLocaleDateString('en-CA') + '.csv';
        headers = ['Date', 'Category', 'Description', 'Amount', 'PaymentMode', 'Note'];
    } else {
        return;
    }
    if (data.length === 0) {
        alert('Export करायला Data नाही!');
        return;
    }
    let csv = headers.join(',') + '\n';
    data.forEach(row => {
        const values = headers.map(h => {
            let val = getKey(row, [h]) || '';
            if (val.toString().includes(',')) val = `"${val}"`;
            return val;
        });
        csv += values.join(',') + '\n';
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// =====================================================
// ========== STOCK HISTORY MODAL ======================
// =====================================================

async function showStockHistory(materialName) {
    alert('Stock History Feature - Code.gs मध्ये addMaterialHistory Function बनवायचं आहे. मी पुढच्या File मध्ये देतो!');
}

// =====================================================
// ========== PROFIT/LOSS SECTION - FIXED ==============
// =====================================================

function handlePeriodChange() {
    const period = document.getElementById('profitPeriod').value;
    const datePicker = document.getElementById('profitDatePicker');
    const monthPicker = document.getElementById('monthPicker');
    const yearPicker = document.getElementById('yearPicker');
    datePicker.style.display = 'none';
    monthPicker.style.display = 'none';
    yearPicker.style.display = 'none';
    if(period === 'daily') datePicker.style.display = 'block';
    else if(period === 'weekly') datePicker.style.display = 'block';
    else if(period === 'monthly') monthPicker.style.display = 'block';
    else if(period === 'yearly') yearPicker.style.display = 'block';
    loadProfitLoss();
}

async function loadProfitLoss() {
    const period = document.getElementById('profitPeriod')? document.getElementById('profitPeriod').value : 'monthly';
    let startDate, endDate;
    const today = new Date();
    if(period === 'daily') {
        const selectedDate = document.getElementById('profitDatePicker').value || today.toLocaleDateString('en-CA');
        startDate = new Date(selectedDate);
        endDate = new Date(selectedDate);
    }
    else if(period === 'weekly') {
        const selectedDate = new Date(document.getElementById('profitDatePicker').value || today);
        const day = selectedDate.getDay();
        const diff = selectedDate.getDate() - day + (day === 0? -6 : 1);
        startDate = new Date(selectedDate.setDate(diff));
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
    }
    else if(period === 'monthly') {
        const [year, month] = document.getElementById('monthPicker').value.split('-');
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0);
    }
    else if(period === 'yearly') {
        const year = document.getElementById('yearPicker').value || today.getFullYear();
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
    }
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    try {
        showLoadingToast('Profit/Loss लोड होतोय...');
        const [ordersRes, expensesRes, materialsRes] = await Promise.all([
            fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getOrders' }) }),
            fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getExpenses' }) }),
            fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'getRawMaterials' }) })
        ]);
        const [ordersData, expensesData, materialsData] = await Promise.all([
            ordersRes.json(), expensesRes.json(), materialsRes.json()
        ]);
        if (ordersData.error || expensesData.error || materialsData.error) {
            hideLoadingToast();
            alert('डेटा लोड Error');
            return;
        }
        const periodOrders = ordersData.filter(o => {
            const d = new Date(getKey(o, ['Actual Delivery Date', 'ActualDeliveryDate']) || getKey(o, ['Timestamp']));
            return d >= startDate && d <= endDate;
        });
        const periodExpenses = expensesData.filter(e => {
            const d = new Date(getKey(e, ['Date']));
            return d >= startDate && d <= endDate;
        });
        const periodMaterials = materialsData.filter(m => {
            const d = new Date(getKey(m, ['Date']));
            return d >= startDate && d <= endDate;
        });
        const totalSales = periodOrders.reduce((sum, o) => {
            const status = getKey(o, ['Status']);
            const actualDelivery = getKey(o, ['Actual Delivery Date', 'ActualDeliveryDate']);
            if (status === 'डिलिव्हर' && actualDelivery) {
                return sum + (parseFloat(getKey(o, ['एकूण', 'Total'])) || 0);
            }
            return sum;
        }, 0);
        const otherExpenses = periodExpenses.reduce((sum, e) => sum + (parseFloat(getKey(e, ['Amount'])) || 0), 0);
        const materialExpenses = periodMaterials.reduce((sum, m) => sum + (parseFloat(getKey(m, ['Total'])) || 0), 0);
        const totalExpenses = otherExpenses + materialExpenses;
        const netProfit = totalSales - totalExpenses;

        // FIXED: Safe Selector - Error येणार नाही
        const profitHeader = document.querySelector('#profitloss h2');
        if(profitHeader) {
            const periodLabels = { 'daily': 'आजचा', 'weekly': 'या आठवड्याचा', 'monthly': 'या महिन्याचा', 'yearly': 'या वर्षाचा' };
            profitHeader.textContent = `नफा-तोटा रिपोर्ट - ${periodLabels[period]}`;
        }

        document.getElementById('totalSales').textContent = totalSales.toFixed(2);
        document.getElementById('totalExpenses').textContent = totalExpenses.toFixed(2);
        document.getElementById('netProfit').textContent = netProfit.toFixed(2);
        document.getElementById('netProfit').style.color = netProfit >= 0? '#28a745' : '#dc3545';
        displayExpenseBreakdown(periodExpenses, periodMaterials, totalExpenses);
        updateProfitChart(totalSales, totalExpenses, netProfit);
        hideLoadingToast();
    } catch (error) {
        hideLoadingToast();
        console.error('Profit/Loss Error:', error);
    }
}

function updateProfitChart(sales, expenses, profit) {
    const ctx = document.getElementById('profitChart');
    if (!ctx) return;
    if (profitChart) profitChart.destroy();
    profitChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['एकूण विक्री', 'एकूण खर्च', 'निव्वळ नफा'],
            datasets: [{
                label: 'रक्कम (₹)',
                data: [sales, expenses, profit],
                backgroundColor: ['#28a745', '#dc3545', profit >= 0? '#007bff' : '#ff6b6b'],
                borderColor: '#333',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'नफा-तोटा Overview', font: { size: 16, family: 'Poppins' } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: value => '₹' + value } }
            }
        }
    });
}

function displayExpenseBreakdown(expenses, materials, total) {
    const tbody = document.getElementById('breakdownBody');
    if (expenses.length === 0 && materials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading">या कालावधीत खर्च नाही</td></tr>';
        return;
    }
    const grouped = {};
    expenses.forEach(e => {
        const cat = getKey(e, ['Category']) || 'इतर';
        const amount = parseFloat(getKey(e, ['Amount'])) || 0;
        grouped[cat] = (grouped[cat] || 0) + amount;
    });
    const materialTotal = materials.reduce((sum, m) => sum + (parseFloat(getKey(m, ['Total'])) || 0), 0);
    if (materialTotal > 0) grouped['कच्चा माल'] = materialTotal;
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    tbody.innerHTML = sorted.map(([cat, amount]) => {
        const percent = total > 0? ((amount / total) * 100).toFixed(1) : 0;
        return `<tr><td><b>${cat}</b></td><td>₹${amount.toFixed(2)}</td><td>${percent}%</td></tr>`;
    }).join('');
}

// =====================================================
// ========== MODAL FUNCTIONS - 100% FIXED =============
// =====================================================

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
}

function openExpenseModal() {
    closeAllModals();
    const modal = document.getElementById('expenseModal');
    if(modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
    }
    if(masterDataLoaded) loadCategoryMaster(true);
}

function openMaterialModal() {
    closeAllModals();
    const modal = document.getElementById('materialModal');
    if(modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
    }
    if(masterDataLoaded) loadMaterialMaster(true);
}

function closeExpenseModal() {
    const modal = document.getElementById('expenseModal');
    if(modal) modal.style.display = 'none';
    editingExpenseRow = null;
    document.getElementById('expenseModalTitle').textContent = 'नवीन खर्च ॲड करा';
    document.getElementById('expenseForm').reset();
    document.getElementById('expDate').value = new Date().toLocaleDateString('en-CA');
}

function closeMaterialModal() {
    const modal = document.getElementById('materialModal');
    if(modal) modal.style.display = 'none';
    editingMaterialRow = null;
    document.getElementById('matName').disabled = false;
    document.getElementById('matQty').disabled = false;
    document.getElementById('matUnit').disabled = false;
    document.getElementById('matRate').disabled = false;
    document.getElementById('matSupplier').disabled = false;
    document.getElementById('materialModalTitle').textContent = 'नवीन माल ॲड करा';
    document.getElementById('materialForm').reset();
}

// बाहेर क्लिक केलं की मोडल बंद
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// ===== Logout =====
function logout() {
    if (confirm('Logout करायचं का?')) {
        window.location.href = 'admin.html';
    }
}

// ===== GLOBAL BINDING - CRITICAL FOR HTML onclick =====
window.openExpenseModal = openExpenseModal;
window.closeExpenseModal = closeExpenseModal;
window.openMaterialModal = openMaterialModal;
window.closeMaterialModal = closeMaterialModal;
window.addNewCategory = addNewCategory;
window.addNewMaterial = addNewMaterial;
window.showTab = showTab;
window.handleSearch = handleSearch;
window.exportToExcel = exportToExcel;
window.editMaterial = editMaterial;
window.useMaterial = useMaterial;
window.deleteMaterial = deleteMaterial;
window.editExpense = editExpense;
window.deleteExpense = deleteExpense;
window.showStockHistory = showStockHistory;
window.logout = logout;