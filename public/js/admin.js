// Admin Page JavaScript
let socket = null;
let currentTestId = null;
let testStatus = 'ready';

// DOM Elements
const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const adminLoginForm = document.getElementById('adminLoginForm');
const testForm = document.getElementById('testForm');
const startBtn = document.getElementById('startBtn');
const finishBtn = document.getElementById('finishBtn');
const saveWordBtn = document.getElementById('saveWordBtn');
const testWordInput = document.getElementById('testWord');
const currentWordSpan = document.getElementById('currentWord');
const testIdSpan = document.getElementById('testId');
const userCountSpan = document.getElementById('userCount');
const userListDiv = document.getElementById('userList');
const recentTestsDiv = document.getElementById('recentTests');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAdminStatus();
    setupEventListeners();
});

// Check admin status
async function checkAdminStatus() {
    try {
        const response = await fetch('/api/admin/status');
        const data = await response.json();

        if (data.isAdmin) {
            showDashboard();
        } else {
            showLogin();
        }
    } catch (error) {
        console.error('Status check error:', error);
        showLogin();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Admin login
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                showDashboard();
                showAlert('Giriş başarılı!', 'success');
            } else {
                showAlert(data.error || 'Giriş başarısız', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Giriş hatası', 'error');
        }
    });

    // Save test word
    testForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const word = testWordInput.value.trim();

        if (!word) {
            showAlert('Lütfen bir kelime girin', 'error');
            return;
        }

        try {
            const response = await fetch('/api/admin/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word })
            });

            const data = await response.json();

            if (data.success) {
                currentTestId = data.data.testId;
                currentWordSpan.textContent = data.data.word;
                testIdSpan.textContent = data.data.testId;
                updateTestStatus('ready');
                startBtn.disabled = false;
                showAlert('Test kelimesi kaydedildi!', 'success');
                testWordInput.value = '';
            } else {
                showAlert(data.error || 'Kaydetme hatası', 'error');
            }
        } catch (error) {
            console.error('Save word error:', error);
            showAlert('Kaydetme hatası', 'error');
        }
    });

    // Start test
    startBtn.addEventListener('click', async () => {
        if (!currentTestId) {
            showAlert('Önce test kelimesi kaydedin', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/admin/test/${currentTestId}/start`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                updateTestStatus('active');
                startBtn.disabled = true;
                finishBtn.disabled = false;
                showAlert('Test başlatıldı!', 'success');
            } else {
                showAlert(data.error || 'Başlatma hatası', 'error');
            }
        } catch (error) {
            console.error('Start test error:', error);
            showAlert('Başlatma hatası', 'error');
        }
    });

    // Finish test
    finishBtn.addEventListener('click', async () => {
        if (!currentTestId || testStatus !== 'active') {
            showAlert('Aktif test yok', 'error');
            return;
        }

        if (confirm('Testi bitirmek istediğinize emin misiniz?')) {
            try {
                const response = await fetch(`/api/admin/test/${currentTestId}/finish`, {
                    method: 'POST'
                });

                const data = await response.json();

                if (data.success) {
                    updateTestStatus('finished');
                    finishBtn.disabled = true;
                    currentTestId = null;
                    showAlert('Test bitirildi! Kullanıcılar sonuçlara yönlendiriliyor...', 'success');

                    // Reset form
                    setTimeout(() => {
                        currentWordSpan.textContent = '-';
                        testIdSpan.textContent = '-';
                        updateTestStatus('ready');
                        loadDashboardData();
                    }, 3000);
                } else {
                    showAlert(data.error || 'Bitirme hatası', 'error');
                }
            } catch (error) {
                console.error('Finish test error:', error);
                showAlert('Bitirme hatası', 'error');
            }
        }
    });
}

// Show login section
function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
}

// Show dashboard section
function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    initializeSocket();
    loadDashboardData();
}

// Initialize WebSocket
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('WebSocket connected');
        socket.emit('admin-connected');
    });

    socket.on('admin-status', (data) => {
        if (data.activeTest) {
            currentTestId = data.activeTest.id;
            currentWordSpan.textContent = data.activeTest.word;
            testIdSpan.textContent = data.activeTest.id;
            updateTestStatus('active');
            startBtn.disabled = true;
            finishBtn.disabled = false;
        } else if (data.latestTest && data.latestTest.status === 'ready') {
            currentTestId = data.latestTest.id;
            currentWordSpan.textContent = data.latestTest.word;
            testIdSpan.textContent = data.latestTest.id;
            updateTestStatus('ready');
            startBtn.disabled = false;
            finishBtn.disabled = true;
        }

        userCountSpan.textContent = data.userCount;
        updateUserList(data.users);
    });

    socket.on('user-list-update', (data) => {
        userCountSpan.textContent = data.users.length;
        updateUserList(data.users);
    });

    socket.on('user-submitted', (data) => {
        showAlert(`${data.username} cevaplarını gönderdi (${data.wordCount} kelime)`, 'info');
    });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const response = await fetch('/api/admin/dashboard');
        const data = await response.json();

        if (data.success) {
            const { activeTest, latestTest, connectedUsers, usersList } = data.data;

            if (activeTest) {
                currentTestId = activeTest.id;
                currentWordSpan.textContent = activeTest.word;
                testIdSpan.textContent = activeTest.id;
                updateTestStatus('active');
                startBtn.disabled = true;
                finishBtn.disabled = false;
            } else if (latestTest && latestTest.status === 'ready') {
                currentTestId = latestTest.id;
                currentWordSpan.textContent = latestTest.word;
                testIdSpan.textContent = latestTest.id;
                updateTestStatus('ready');
                startBtn.disabled = false;
                finishBtn.disabled = true;
            } else {
                currentWordSpan.textContent = '-';
                testIdSpan.textContent = '-';
                updateTestStatus('ready');
                startBtn.disabled = true;
                finishBtn.disabled = true;
            }

            userCountSpan.textContent = connectedUsers;
            updateUserList(usersList);
        }

        // Load recent tests
        loadRecentTests();
    } catch (error) {
        console.error('Dashboard load error:', error);
        showAlert('Dashboard verileri yüklenemedi', 'error');
    }
}

// Load recent tests
async function loadRecentTests() {
    try {
        const response = await fetch('/api/admin/tests');
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            let html = '<table><thead><tr><th>ID</th><th>Kelime</th><th>Durum</th><th>Tarih</th></tr></thead><tbody>';

            data.data.forEach(test => {
                const statusBadge = getStatusBadge(test.status);
                const date = new Date(test.created_at).toLocaleDateString('tr-TR');
                html += `
                    <tr>
                        <td>${test.id}</td>
                        <td><strong>${test.word}</strong></td>
                        <td>${statusBadge}</td>
                        <td>${date}</td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            recentTestsDiv.innerHTML = html;
        } else {
            recentTestsDiv.innerHTML = '<p style="text-align: center; color: #999;">Henüz test yok</p>';
        }
    } catch (error) {
        console.error('Recent tests error:', error);
    }
}

// Update user list
function updateUserList(users) {
    if (!users || users.length === 0) {
        userListDiv.innerHTML = '<p style="text-align: center; color: #999;">Henüz kullanıcı yok</p>';
        return;
    }

    let html = '';
    users.forEach(user => {
        const badge = user.hasSubmitted
            ? '<span class="submitted-badge">Gönderdi</span>'
            : '<span style="color: #999;">Bekliyor</span>';

        html += `
            <div class="user-item">
                <span>${user.username}</span>
                ${badge}
            </div>
        `;
    });

    userListDiv.innerHTML = html;
}

// Update test status display
function updateTestStatus(status) {
    testStatus = status;
    const statusElement = document.querySelector('.status-indicator');

    statusElement.className = 'status-indicator';

    switch (status) {
        case 'ready':
            statusElement.classList.add('status-ready');
            statusElement.textContent = 'Hazır';
            break;
        case 'active':
            statusElement.classList.add('status-active');
            statusElement.textContent = 'Aktif';
            break;
        case 'finished':
            statusElement.classList.add('status-finished');
            statusElement.textContent = 'Tamamlandı';
            break;
    }
}

// Get status badge HTML
function getStatusBadge(status) {
    switch (status) {
        case 'ready':
            return '<span class="badge badge-warning">Hazır</span>';
        case 'active':
            return '<span class="badge badge-success">Aktif</span>';
        case 'finished':
            return '<span class="badge badge-secondary">Tamamlandı</span>';
        default:
            return '<span class="badge">Bilinmiyor</span>';
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        showLogin();
        showAlert('Çıkış yapıldı', 'info');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';

    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}