// User Page JavaScript
let socket = null;
let sessionId = localStorage.getItem('sessionId');
let username = localStorage.getItem('username');
let hasSubmitted = false;
let testActive = false;

// DOM Elements
const loginSection = document.getElementById('loginSection');
const waitingSection = document.getElementById('waitingSection');
const testSection = document.getElementById('testSection');
const submittedSection = document.getElementById('submittedSection');
const loginForm = document.getElementById('loginForm');
const testForm = document.getElementById('testForm');
const testWord = document.getElementById('testWord');
const wordInputsContainer = document.getElementById('wordInputsContainer');
const userCount = document.getElementById('userCount');
const userCountSubmitted = document.getElementById('userCountSubmitted');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus();
    initializeSocket();
    setupEventListeners();
    createWordInputs();
});

// Check user status on page load
async function checkUserStatus() {
    try {
        const response = await fetch('/api/user/status');
        const data = await response.json();

        if (data.connected) {
            username = data.data.username;
            hasSubmitted = data.data.hasSubmitted;
            testActive = data.data.testActive;

            showSection(hasSubmitted ? 'submitted' : (testActive ? 'test' : 'waiting'));

            if (testActive && data.data.testWord) {
                testWord.textContent = data.data.testWord;
            }

            if (data.data.shouldRedirect) {
                window.location.href = '/charts';
            }
        } else {
            showSection('login');
        }
    } catch (error) {
        console.error('Status check error:', error);
        showSection('login');
    }

    // Note: Redirect is handled by WebSocket 'test-finished' event (line 105-110)
    // No need for polling as it's redundant and wastes server resources
}

// Initialize WebSocket connection
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('WebSocket connected');
        if (username && sessionId) {
            socket.emit('user-connected', { username, sessionId });
        }
    });

    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
    });

    socket.on('user-status', (data) => {
        if (data.connected) {
            hasSubmitted = data.hasSubmitted;
            testActive = data.testActive;

            if (hasSubmitted) {
                showSection('submitted');
            } else if (testActive && data.testWord) {
                testWord.textContent = data.testWord;
                showSection('test');
            } else {
                showSection('waiting');
            }
        }
    });

    socket.on('user-count', (data) => {
        userCount.textContent = data.count;
        userCountSubmitted.textContent = data.count;
    });

    socket.on('test-started', (data) => {
        if (!hasSubmitted) {
            testWord.textContent = data.word;
            testActive = true;
            showSection('test');
            showAlert('Test başladı! Kelimelerinizi yazabilirsiniz.', 'success');
        }
    });

    socket.on('test-finished', (data) => {
        showAlert('Test bitti! Sonuçlar sayfasına yönlendiriliyorsunuz...', 'info');
        setTimeout(() => {
            window.location.href = '/charts';
        }, 2000);
    });

    socket.on('submission-confirmed', (data) => {
        if (data.success) {
            hasSubmitted = true;
            showSection('submitted');
            showAlert('Cevaplarınız başarıyla kaydedildi!', 'success');
        }
    });

    socket.on('error', (data) => {
        showAlert(data.message, 'error');
    });

    // Handle reset events
    socket.on('force-refresh', () => {
        showAlert('Admin yenileme isteği alındı. Sayfa yenileniyor...', 'info');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    });
    socket.on('user-reset', () => {
        showAlert('Admin sizi baslangic ekranina gonderiyor. Lutfen isminizi yeniden girin.', 'warning');

        localStorage.removeItem('sessionId');
        localStorage.removeItem('username');

        sessionId = null;
        username = null;
        hasSubmitted = false;
        testActive = false;

        setTimeout(() => {
            if (socket && socket.connected) {
                socket.disconnect();
            }
            window.location.href = '/';
        }, 1500);
    });

    socket.on('test-cancelled', (data) => {
        showAlert('Test iptal edildi. Ana sayfaya yönlendiriliyorsunuz...', 'warning');
        hasSubmitted = false;
        testActive = false;
        localStorage.removeItem('sessionId');
        localStorage.removeItem('username');
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    });

    socket.on('emergency-reset', (data) => {
        console.log('🚨 EMERGENCY RESET received:', data);
        showAlert('Acil reset! Sistem tamamen sıfırlanıyor...', 'error');

        // Step 1: Clear all browser storage
        try {
            localStorage.clear();
            sessionStorage.clear();
            console.log('✓ Storage cleared');
        } catch (e) {
            console.error('Storage clear error:', e);
        }

        // Step 2: Clear cookies (best effort)
        try {
            document.cookie.split(";").forEach(function(c) {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
            console.log('✓ Cookies cleared');
        } catch (e) {
            console.error('Cookie clear error:', e);
        }

        // Step 3: Disconnect socket
        if (socket) {
            socket.disconnect();
            console.log('✓ Socket disconnected');
        }

        // Step 4: Force reload with cache bypass
        setTimeout(() => {
            // location.reload(true) is deprecated but still works
            // Use cache-control header bypass
            window.location.href = window.location.href.split('?')[0] + '?_=' + Date.now();
        }, 2000);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('username').value.trim();

        if (!usernameInput) {
            showAlert('Lütfen kullanıcı adı girin', 'error');
            return;
        }

        try {
            const response = await fetch('/api/user/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput })
            });

            const data = await response.json();

            if (data.success) {
                username = data.data.username;
                sessionId = data.data.sessionId;
                hasSubmitted = data.data.hasSubmitted;
                testActive = data.data.testActive;

                // Store in localStorage
                localStorage.setItem('username', username);
                localStorage.setItem('sessionId', sessionId);

                // Connect to WebSocket
                socket.emit('user-connected', { username, sessionId });

                // Show appropriate section
                if (hasSubmitted) {
                    showSection('submitted');
                } else if (testActive && data.data.testWord) {
                    testWord.textContent = data.data.testWord;
                    showSection('test');
                } else {
                    showSection('waiting');
                }
            } else {
                showAlert(data.error || 'Bağlantı hatası', 'error');
            }
        } catch (error) {
            console.error('Connect error:', error);
            showAlert('Bağlantı hatası', 'error');
        }
    });

    // Test form
    testForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (hasSubmitted) {
            showAlert('Zaten cevap gönderdiniz', 'error');
            return;
        }

        const words = [];
        const inputs = document.querySelectorAll('.word-input');

        inputs.forEach(input => {
            if (input.value.trim()) {
                words.push(input.value.trim());
            }
        });

        if (words.length === 0) {
            showAlert('En az bir kelime girmelisiniz', 'error');
            return;
        }

        // Disable form
        document.getElementById('submitBtn').disabled = true;

        try {
            // Send via API only (API handles WebSocket notification internally)
            const response = await fetch('/api/user/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words })
            });

            const data = await response.json();

            if (!data.success) {
                showAlert(data.error || 'Gönderme hatası', 'error');
                document.getElementById('submitBtn').disabled = false;
            }
        } catch (error) {
            console.error('Submit error:', error);
            showAlert('Gönderme hatası', 'error');
            document.getElementById('submitBtn').disabled = false;
        }
    });
}

// Create 15 word input fields
function createWordInputs() {
    wordInputsContainer.innerHTML = '';
    for (let i = 1; i <= 15; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'word-input';
        input.placeholder = `${i}. kelime`;
        input.maxLength = 50;
        wordInputsContainer.appendChild(input);
    }
}

// Show specific section and hide others
function showSection(section) {
    loginSection.style.display = 'none';
    waitingSection.style.display = 'none';
    testSection.style.display = 'none';
    submittedSection.style.display = 'none';

    switch (section) {
        case 'login':
            loginSection.style.display = 'block';
            break;
        case 'waiting':
            waitingSection.style.display = 'block';
            break;
        case 'test':
            testSection.style.display = 'block';
            break;
        case 'submitted':
            submittedSection.style.display = 'block';
            break;
    }
}

// Check if should redirect to charts
async function checkRedirect() {
    if (!sessionId) return;

    try {
        const response = await fetch('/api/user/check-redirect');
        const data = await response.json();

        if (data.shouldRedirect) {
            window.location.href = '/charts';
        }
    } catch (error) {
        console.error('Redirect check error:', error);
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    document.body.insertBefore(alert, document.body.firstChild);

    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}
