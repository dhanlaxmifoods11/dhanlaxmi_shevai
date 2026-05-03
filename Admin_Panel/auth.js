// ========================================
// AUTH SYSTEM - धनलक्ष्मी शेवई - FIXED VERSION
// 2-3 Users | Changeable Password | 30 Min Auto Logout
// ========================================

// 1️⃣ DEFAULT USERS SETUP - पहिल्यांदा एकदा Run होईल
function initializeUsers() {
    if (!localStorage.getItem('adminUsers')) {
        const defaultUsers = [
            { username: 'admin', password: 'admin@123', role: 'owner', name: 'Owner' },
            { username: 'staff1', password: 'staff@123', role: 'staff', name: 'Staff 1' },
            { username: 'staff2', password: 'staff@123', role: 'staff', name: 'Staff 2' }
        ];
        localStorage.setItem('adminUsers', JSON.stringify(defaultUsers));
    }
}
initializeUsers();

// 2️⃣ LOGIN FUNCTION - फक्त login.html मध्ये Run होईल
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('errorMsg');

        // Users Fetch कर
        const users = JSON.parse(localStorage.getItem('adminUsers')) || [];

        // User Match कर
        const validUser = users.find(user =>
            user.username === username && user.password === password
        );

        if (validUser) {
            // Login Success
            sessionStorage.setItem('adminLoggedIn', 'true');
            sessionStorage.setItem('currentUser', JSON.stringify({
                username: validUser.username,
                name: validUser.name,
                role: validUser.role,
                loginTime: new Date().toISOString()
            }));

            // Admin Page वर Redirect
            window.location.href = 'admin.html';
        } else {
            // Login Failed
            errorMsg.style.display = 'block';
            document.getElementById('password').value = '';

            setTimeout(() => {
                errorMsg.style.display = 'none';
            }, 3000);
        }
    });
}

// 3️⃣ CHECK AUTH - Admin Pages साठी
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

// 4️⃣ GET CURRENT USER INFO
function getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user? JSON.parse(user) : null;
}
window.getCurrentUser = getCurrentUser; // Global बनव

// 5️⃣ LOGOUT FUNCTION - FIXED
function logout() {
    if (confirm('खरंच Logout करायचं?')) {
        // Session Clear कर
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('currentUser');

        // Timer पण बंद कर
        if (inactivityTimer) {
            clearTimeout(inactivityTimer);
        }

        // Force Redirect
        window.location.replace('login.html');
    }
}
window.logout = logout; // 🔥 Global बनव - हे Important आहे

// 6️⃣ CHANGE PASSWORD FUNCTION
function changePassword(oldPass, newPass) {
    const currentUser = getCurrentUser();
    if (!currentUser) return { success: false, msg: 'Login करा आधी' };

    let users = JSON.parse(localStorage.getItem('adminUsers'));
    const userIndex = users.findIndex(u => u.username === currentUser.username);

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

// 7️⃣ AUTO LOGOUT - 30 Min Inactive - FIXED
let inactivityTimer;

function startInactivityTimer() {
    // फक्त Login असेल तरच Timer चालू
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            alert('30 मिनिटं Inactive राहिल्यामुळे Auto Logout झालं');
            sessionStorage.removeItem('adminLoggedIn');
            sessionStorage.removeItem('currentUser');
            window.location.replace('login.html');
        }, 30 * 60 * 1000); // 30 Minutes
    }
}

// User Activity Track कर - फक्त Admin Page वर
if (window.location.pathname.includes('admin.html')) {
    ['click', 'keypress', 'scroll', 'mousemove', 'touchstart'].forEach(event => {
        document.addEventListener(event, startInactivityTimer);
    });
    startInactivityTimer();
}