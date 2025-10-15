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

    // Check for redirect periodically
    setInterval(checkRedirect, 5000);
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
            // Send via API
            const response = await fetch('/api/user/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ words })
            });

            const data = await response.json();

            if (data.success) {
                // Also send via WebSocket for real-time update
                socket.emit('submit-words', { words });
            } else {
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