const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzcQviEyybujCo-XM-CEHQXZdMYcyv2tmNAauY2HWwQ5BCyjURVxDo1wk8dEOgoiCg/exec";
document.getElementById('deliveryDate').valueAsDate = new Date();

// पेज लोड झाल्यावर पेंडिंग ऑर्डर चेक कर
window.addEventListener('load', () => {
    syncPendingOrders();
});

// नेट आल्यावर ऑटो sync कर
window.addEventListener('online', () => {
    console.log('Back online - syncing orders');
    syncPendingOrders();
});

document.addEventListener('change', function(e) {
    if (e.target.classList.contains('type')) {
        const row = e.target.closest('.item-row');
        const selectedOption = e.target.options[e.target.selectedIndex];
        const rate = selectedOption.getAttribute('data-rate') || 0;
        row.querySelector('.rate').value = rate;
        toggleMixInputs(e.target);
        calculateTotal();
    }
});

// मिक्स आहे की सिंगल ते चेक करून इनपुट दाखव/लपव
function toggleMixInputs(selectElement) {
    const row = selectElement.closest('.item-row');
    const type = selectElement.value;
    const singleDiv = row.querySelector('.single-qty');
    const mixDiv = row.querySelector('.mix-qty');
    const qty2Input = row.querySelector('.qty2');
    
    if (type === 'रवा + गहू' || type === 'रवा + मैदा') {
        singleDiv.style.display = 'none';
        mixDiv.style.display = 'block';
        // Placeholder बदल
        if (type === 'रवा + गहू') {
            qty2Input.placeholder = 'गहू Kg';
        } else {
            qty2Input.placeholder = 'मैदा Kg';
        }
        // सिंगल qty क्लियर कर
        row.querySelector('.qty').value = '';
    } else {
        singleDiv.style.display = 'block';
        mixDiv.style.display = 'none';
        // मिक्स qty क्लियर कर
        row.querySelector('.qty1').value = '';
        row.querySelector('.qty2').value = '';
    }
    calculateTotal();
}

function addItem() {
    const container = document.getElementById('itemsContainer');
    const newRow = document.createElement('div');
    newRow.className = 'item-row';
    newRow.innerHTML = `
        <select class="type" onchange="toggleMixInputs(this)">
            <option value="">प्रकार</option>
            <option value="गव्हाची शेवई" data-rate="90">गव्हाची शेवई (९० ₹)</option>
            <option value="रवा शेवई" data-rate="70">रवा शेवई (७० ₹)</option>
            <option value="मैदा शेवई" data-rate="80">मैदा शेवई (८० ₹)</option>
            <option value="रवा + गहू" data-rate="90">रवा + गहू (९० ₹/Kg)</option>
            <option value="रवा + मैदा" data-rate="90">रवा + मैदा (९० ₹/Kg)</option>
        </select>
        <select class="size">
            <option value="बारीक">बारीक</option>
            <option value="मध्यम">मध्यम</option>
            <option value="जाड">जाड</option>
        </select>
        
        <!-- सिंगल शेवईसाठी Kg -->
        <div class="single-qty">
            <input type="number" class="qty" placeholder="Kg" min="0" step="0.5" oninput="calculateTotal()">
        </div>

        <!-- मिक्स शेवईसाठी Kg - सुरुवातीला लपलेलं -->
        <div class="mix-qty" style="display:none;">
            <input type="number" class="qty1" placeholder="रवा Kg" min="1" step="0.5" oninput="calculateTotal()">
            <input type="number" class="qty2" placeholder="गहू/मैदा Kg" min="1" step="0.5" oninput="calculateTotal()">
        </div>
        
        <input type="hidden" class="rate">
        <button type="button" class="remove-btn" onclick="removeItem(this)">×</button>
    `;
    container.appendChild(newRow);
}

function removeItem(btn) {
    if (document.querySelectorAll('.item-row').length > 1) {
        btn.closest('.item-row').remove();
        calculateTotal();
    } else {
        showMsg('किमान एक आयटम पाहिजे!', 'error');
    }
}

function getCurrentOrderItems() {
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const type = row.querySelector('.type').value;
        const size = row.querySelector('.size').value;
        const rate = Number(row.querySelector('.rate').value);
        
        if (!type || rate === 0) return;
        
        // मिक्स शेवई चेक कर
        if (type === 'रवा + गहू' || type === 'रवा + मैदा') {
            const qty1 = Number(row.querySelector('.qty1').value) || 0;
            const qty2 = Number(row.querySelector('.qty2').value) || 0;
            const totalQty = qty1 + qty2;
            
            // Validation: मिनिमम 1-1 Kg
            if (qty1 < 1 || qty2 < 1) return;
            
            const item1Name = 'रवा';
            const item2Name = type === 'रवा + गहू' ? 'गहू' : 'मैदा';
            const sizeDetail = `${item1Name} ${qty1}Kg + ${item2Name} ${qty2}Kg`;
            
            items.push({ 
                type: type, 
                size: sizeDetail, 
                qty: totalQty, 
                rate: rate, 
                total: totalQty * rate 
            });
        } else {
            // सिंगल शेवई
            const qty = Number(row.querySelector('.qty').value);
            if (qty > 0) {
                items.push({ type: type, size: size, qty: qty, rate: rate, total: qty * rate });
            }
        }
    });
    return items;
}

function calculateTotal() {
    let total = 0;
    document.querySelectorAll('.item-row').forEach(row => {
        const type = row.querySelector('.type').value;
        const rate = Number(row.querySelector('.rate').value) || 0;
        
        if (type === 'रवा + गहू' || type === 'रवा + मैदा') {
            const qty1 = Number(row.querySelector('.qty1').value) || 0;
            const qty2 = Number(row.querySelector('.qty2').value) || 0;
            total += (qty1 + qty2) * rate;
        } else {
            const qty = Number(row.querySelector('.qty').value) || 0;
            total += qty * rate;
        }
    });
    document.getElementById('finalTotal').innerText = total;
    return total;
}

function resetOrderItems() {
    const container = document.getElementById('itemsContainer');
    container.innerHTML = `
        <div class="item-row" data-item-id="1">
            <select class="type" onchange="toggleMixInputs(this)">
                <option value="">प्रकार</option>
                <option value="गव्हाची शेवई" data-rate="90">गव्हाची शेवई (९० ₹)</option>
                <option value="रवा शेवई" data-rate="70">रवा शेवई (७० ₹)</option>
                <option value="मैदा शेवई" data-rate="80">मैदा शेवई (८० ₹)</option>
                <option value="रवा + गहू" data-rate="90">रवा + गहू (९० ₹/Kg)</option>
                <option value="रवा + मैदा" data-rate="90">रवा + मैदा (९० ₹/Kg)</option>
            </select>
            <select class="size">
                <option value="बारीक">बारीक</option>
                <option value="मध्यम">मध्यम</option>
                <option value="जाड">जाड</option>
            </select>
            
            <!-- सिंगल शेवईसाठी Kg -->
            <div class="single-qty">
                <input type="number" class="qty" placeholder="Kg" min="0" step="0.5" oninput="calculateTotal()">
            </div>

            <!-- मिक्स शेवईसाठी Kg - सुरुवातीला लपलेलं -->
            <div class="mix-qty" style="display:none;">
                <input type="number" class="qty1" placeholder="रवा Kg" min="1" step="0.5" oninput="calculateTotal()">
                <input type="number" class="qty2" placeholder="गहू/मैदा Kg" min="1" step="0.5" oninput="calculateTotal()">
            </div>
            
            <input type="hidden" class="rate">
            <button type="button" class="remove-btn" onclick="removeItem(this)">×</button>
        </div>
    `;
    calculateTotal();
}

function showMsg(text, type) {
    const msgBox = document.getElementById('msgBox');
    msgBox.className = 'msg ' + type;
    msgBox.innerText = text;
    msgBox.style.display = 'block';
    setTimeout(() => { msgBox.style.display = 'none'; }, 4000);
}

function saveAndWhatsApp() {
    const custName = document.getElementById('custName').value.trim();
    const custMobile = document.getElementById('custMobile').value.trim();
    const custAddress = document.getElementById('custAddress').value.trim();
    const deliveryDate = document.getElementById('deliveryDate').value;
    
    if (!custName || !custMobile || !custAddress || !deliveryDate) {
        showMsg('कृपया सर्व माहिती भरा!', 'error');
        return;
    }
    if (custMobile.length !== 10) {
        showMsg('मोबाईल नंबर 10 अंकी असावा!', 'error');
        return;
    }
    
    // मिक्स Validation चेक
    let mixError = false;
    document.querySelectorAll('.item-row').forEach(row => {
        const type = row.querySelector('.type').value;
        if (type === 'रवा + गहू' || type === 'रवा + मैदा') {
            const qty1 = Number(row.querySelector('.qty1').value) || 0;
            const qty2 = Number(row.querySelector('.qty2').value) || 0;
            if (qty1 < 1 || qty2 < 1) {
                mixError = true;
            }
        }
    });
    
    if (mixError) {
        showMsg('मिक्स शेवईसाठी प्रत्येकी कमीत कमी 1 Kg पाहिजे!', 'error');
        return;
    }
    
    const orderItems = getCurrentOrderItems();
    if (orderItems.length === 0) {
        showMsg('कृपया किमान एक प्रॉडक्ट निवडा!', 'error');
        return;
    }
    
    const finalTotal = calculateTotal();
    
    const payload = {
        name: custName,
        mobile: custMobile,
        address: custAddress,
        items: orderItems,
        total: finalTotal,
        deliveryDate: deliveryDate,
        source: 'App',
        clientOrderId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        timestamp: new Date().toISOString()
    };

    // ऑफलाईन आहे का चेक कर
    if (!navigator.onLine) {
        saveOrderOffline(payload);
        showMsg('📴 ऑफलाईन आहात. ऑर्डर सेव्ह झाली. नेट आल्यावर ऑटो सबमिट होईल.', 'success');
    } else {
        sendToSheet(payload);
    }

    let itemsText = '';
    orderItems.forEach(item => {
        itemsText += `- ${item.type} (${item.size}) - ${item.qty}Kg x ₹${item.rate} = ₹${item.total}%0A`;
    });

    const msg = `✅ धन्यवाद ${custName}! तुमची ऑर्डर नोंद झाली आहे.%0A%0A` +
        `*ऑर्डर डिटेल्स:*%0A${itemsText}%0A` +
        `💰 एकूण रक्कम: ₹${finalTotal}%0A` +
        `📅 Est. Delivery Date: ${deliveryDate}%0A%0A` +
        `आम्ही लवकरच तुमच्याशी संपर्क करू. 🙏%0A- धनलक्ष्मी फूड्स`;
    
    window.open(`https://wa.me/91${custMobile}?text=${msg}`, '_blank');
    
    if (navigator.onLine) {
        showMsg('✅ ऑर्डर सेव्ह झाली! कस्टमरला WhatsApp पाठवला.', 'success');
    }
    
    document.getElementById('custName').value = '';
    document.getElementById('custMobile').value = '';
    document.getElementById('custAddress').value = '';
    document.getElementById('deliveryDate').valueAsDate = new Date();
    resetOrderItems();
}

// ऑफलाईन ऑर्डर सेव्ह कर
function saveOrderOffline(order) {
    let pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    pendingOrders.push(order);
    localStorage.setItem('pendingOrders', JSON.stringify(pendingOrders));
    console.log('Order saved offline:', order);
}

// Google Sheet ला पाठव
function sendToSheet(payload) {
    return fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
    }).catch(err => {
        console.log('Sheet save error:', err);
        saveOrderOffline(payload);
    });
}

// पेंडिंग ऑर्डर sync कर
function syncPendingOrders() {
    if (!navigator.onLine) return;
    
    let pendingOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
    if (pendingOrders.length === 0) return;
    
    console.log('Syncing', pendingOrders.length, 'pending orders');
    
    pendingOrders.forEach(order => {
        sendToSheet(order);
    });
    
    localStorage.removeItem('pendingOrders');
    showMsg(`✅ ${pendingOrders.length} पेंडिंग ऑर्डर सबमिट झाल्या`, 'success');
}
