// ========================================
// AUTH SYSTEM - धनलक्ष्मी शेवई - SERVER-BACKED + FALLBACK
// Roles: superadmin, admin, user
// ========================================

// Server API URL
const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL) ? window.APP_CONFIG.API_URL : '';

// 1️⃣ DEFAULT USERS SETUP - local fallback for emergencies
function initializeUsers() {
    if (!localStorage.getItem('adminUsers')) {
        const defaultUsers = [
            { email: 'admin@local', password: 'admin@123', role: 'superadmin', name: 'Owner' },
            { email: 'staff1@local', password: 'staff@123', role: 'admin', name: 'Staff 1' }
        ];
        localStorage.setItem('adminUsers', JSON.stringify(defaultUsers));
    }
}
initializeUsers();

// 2️⃣ HELPER: show error
function showLoginError(msg) {
    const errorMsg = document.getElementById('errorMsg');
    if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.display = 'block';
        setTimeout(() => { errorMsg.style.display = 'none'; errorMsg.textContent = 'चुकीचा Username किंवा Password!'; }, 4000);
    } else {
        alert(msg);
    }
}

// 3️⃣ LOGIN - tries server first, falls back to localStorage for emergency
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('username').value.trim().toLowerCase();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showLoginError('कृपया Email आणि Password द्या');
            return;
        }

        // Try server login
        if (API_URL) {
            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', email: email, password: password })
                });
                const data = await res.json();

                if (data && data.ok && data.user) {
                    // Successful server-auth
                    sessionStorage.setItem('adminLoggedIn', 'true');
                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));
                    window.location.href = 'admin.html';
                    return;
                }

                // if server returned error, show it but do not stop fallback
                if (data && data.error) {
                    console.warn('Server login error:', data.error);
                }
            } catch (err) {
                console.warn('Server login failed, falling back to local:', err.message);
            }
        }

        // Local fallback (emergency) — check localStorage users
        const users = JSON.parse(localStorage.getItem('adminUsers')) || [];
        const validUser = users.find(u => u.email.toLowerCase() === email && u.password === password);
        if (validUser) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('currentUser', JSON.stringify({
                email: validUser.email,
                name: validUser.name,
                role: validUser.role,
                loginTime: new Date().toISOString()
            }));
            window.location.href = 'admin.html';
            return;
        }

        showLoginError('Credentials invalid');
    });
}

// 4️⃣ REGISTRATION - submit request to server
function openRegisterModal() {
    // basic modal implementation
    const html = `\
      <div id="regModal" style="position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;">\
        <div style="background:#fff;padding:20px;border-radius:8px;max-width:420px;width:100%;">\
          <h3>Register for Admin Panel</h3>\
          <p>Please provide your full name and email. Super Admin will approve your request.</p>\
          <input id="regName" placeholder="Full name" style="width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;">\
          <input id="regEmail" placeholder="Email" style="width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;">\
          <input id="regPassword" placeholder="Password" type="password" style="width:100%;padding:10px;margin:6px 0;border:1px solid #ccc;border-radius:6px;">\
          <div style="display:flex;gap:8px;margin-top:10px;">\
            <button id="regSubmitBtn">Submit Request</button>\
            <button id="regCancelBtn">Cancel</button>\
          </div>\
        </div>\
      </div>`;
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div);

    document.getElementById('regCancelBtn').addEventListener('click', () => document.getElementById('regModal').remove());
    document.getElementById('regSubmitBtn').addEventListener('click', submitRegistration);
}

async function submitRegistration() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;

    if (!name || !email || !password) {
        alert('सर्व फील्ड भरावेत');
        return;
    }

    if (!API_URL) {
        alert('Registration unavailable (server not configured). Contact owner.');
        document.getElementById('regModal').remove();
        return;
    }

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'submitRegistration', name, email, password })
        });
        const data = await res.json();
        if (data && data.ok) {
            alert('Registration submitted. Super Admin will review and approve.');
            document.getElementById('regModal').remove();
        } else {
            alert('Error: ' + (data && data.error ? data.error : 'Unknown error'));
        }
    } catch (err) {
        alert('Registration failed: ' + err.message);
    }
}

// 5️⃣ CHECK AUTH - Admin Pages साठी
function checkAuth() {
    const isLoggedIn = sessionStorage.getItem('adminLoggedIn');

    if (isLoggedIn!== 'true') {
        alert('⚠️ Please Login First!');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}
window.checkAuth = checkAuth; // Global बनव

// 6️⃣ GET CURRENT USER INFO
function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user? JSON.parse(user) : null;
}
window.getCurrentUser = getCurrentUser; // Global बनव

// 7️⃣ LOGOUT FUNCTION
function logout() {
    if (confirm('खरंच Logout करायचं?')) {
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('currentUser');
        if (inactivityTimer) clearTimeout(inactivityTimer);
        window.location.replace('login.html');
    }
}
window.logout = logout;

// 8️⃣ CHANGE PASSWORD - local fallback only (server-managed change can be added later)
function changePassword(oldPass, newPass) {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, msg: 'Login करा आधी' };

    let users = JSON.parse(localStorage.getItem('adminUsers'));
    const userIndex = users.findIndex(u => u.email.toLowerCase() === currentUser.email.toLowerCase());

    if (userIndex === -1) {
        return { success: false, msg: 'User सापडला नाही' };
    }

    if (users[userIndex].password!== oldPass) {
        return { success: false, msg: 'जुना Password चुकीचा आहे' };
    }

    if (newPass.length < 6) {
        return { success: false, msg: 'Password किमान 6 अक्षरी पाहिजे' };
    }

    users[userIndex].password = newPass;
    localStorage.setItem('adminUsers', JSON.stringify(users));
    return { success: true, msg: 'Password बदलला ✅' };
}
window.changePassword = changePassword;

// 9️⃣ AUTO LOGOUT - 30 Min Inactive
let inactivityTimer;
function startInactivityTimer() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            alert('30 मिनिटं Inactive राहिल्यामुळे Auto Logout झालं');
            sessionStorage.removeItem('adminLoggedIn');
            sessionStorage.removeItem('currentUser');
            window.location.replace('login.html');
        }, 30 * 60 * 1000);
    }
}
if (window.location.pathname.includes('admin.html')) {
    ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'].forEach(event => {
        document.addEventListener(event, startInactivityTimer);
    });
    startInactivityTimer();
}
