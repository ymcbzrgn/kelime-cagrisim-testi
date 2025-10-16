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

        console.log('Starting test with ID:', currentTestId);

        try {
            const response = await fetch(`/api/admin/test/${currentTestId}/start`, {
                method: 'POST'
            });

            const data = await response.json();
            console.log('Start test response:', data);

            if (data.success) {
                updateTestStatus('active');
                startBtn.disabled = true;
                finishBtn.disabled = false;
                showAlert('Test başlatıldı!', 'success');
            } else {
                console.error('Start test failed:', data.error);
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
async function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';

    // Initialize socket first
    initializeSocket();

    // Wait for dashboard data to load
    await loadDashboardData();

    // Then load test history
    await loadAllTests();
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
        } else if (data.readyTest) {
            currentTestId = data.readyTest.id;
            currentWordSpan.textContent = data.readyTest.word;
            testIdSpan.textContent = data.readyTest.id;
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
            const { activeTest, readyTest, latestTest, connectedUsers, usersList } = data.data;

            if (activeTest) {
                currentTestId = activeTest.id;
                currentWordSpan.textContent = activeTest.word;
                testIdSpan.textContent = activeTest.id;
                updateTestStatus('active');
                startBtn.disabled = true;
                finishBtn.disabled = false;
            } else if (readyTest) {
                // Use the ready test if available
                currentTestId = readyTest.id;
                currentWordSpan.textContent = readyTest.word;
                testIdSpan.textContent = readyTest.id;
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

    // Update cancel button visibility
    updateTestControlButtons();
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
        case 'cancelled':
            return '<span class="badge badge-cancelled">İptal Edildi</span>';
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

// NEW ADMIN FEATURES

// Load all tests with history
async function loadAllTests() {
    try {
        const response = await fetch('/api/admin/all-tests?page=1&limit=50');
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            const tbody = document.getElementById('testHistoryBody');
            let html = '';

            data.data.forEach(test => {
                const statusBadge = getStatusBadge(test.status);
                const date = new Date(test.created_at).toLocaleDateString('tr-TR');

                html += `
                    <tr>
                        <td style="padding: 10px;">${test.id}</td>
                        <td style="padding: 10px;"><strong>${test.word}</strong></td>
                        <td style="padding: 10px;">${statusBadge}</td>
                        <td style="padding: 10px; text-align: center;">${test.user_count || 0}</td>
                        <td style="padding: 10px;">${date}</td>
                        <td style="padding: 10px;">
                            <button class="btn btn-sm btn-primary" onclick="showTestDetails(${test.id})">
                                👁️ Detay
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        } else {
            document.getElementById('testHistoryBody').innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px; color: #999;">
                        Henüz test geçmişi yok
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Load all tests error:', error);
        showAlert('Test geçmişi yüklenemedi', 'error');
    }
}

// Show test details modal
let currentModalTestId = null;
let modalCharts = {};

async function showTestDetails(testId) {
    currentModalTestId = testId;
    const modal = document.getElementById('testDetailModal');
    modal.style.display = 'block';

    // Reset tabs
    showTab('general');

    // Load test details
    try {
        const response = await fetch(`/api/admin/test-details/${testId}`);
        const data = await response.json();

        if (data.success) {
            const details = data.data;
            document.getElementById('modalTitle').textContent = `Test #${testId} - "${details.test.word}"`;

            // Load general tab
            loadGeneralTab(details);

            // Load other tabs
            loadParticipantsTab(testId);
            loadWordsTab(testId);
            loadChartsTab(testId);
        }
    } catch (error) {
        console.error('Load test details error:', error);
        showAlert('Test detayları yüklenemedi', 'error');
    }
}

// Load general tab
function loadGeneralTab(details) {
    const content = document.getElementById('generalContent');
    const test = details.test;
    const stats = details.statistics;

    content.innerHTML = `
        <div style="padding: 20px;">
            <h3>📊 Genel Bilgiler</h3>
            <table style="width: 100%; margin-top: 15px;">
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Test Kelimesi:</td>
                    <td style="padding: 10px;">${test.word}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Durum:</td>
                    <td style="padding: 10px;">${getStatusBadge(test.status)}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Başlama Zamanı:</td>
                    <td style="padding: 10px;">${test.started_at ? new Date(test.started_at).toLocaleString('tr-TR') : '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Bitiş Zamanı:</td>
                    <td style="padding: 10px;">${test.finished_at ? new Date(test.finished_at).toLocaleString('tr-TR') : '-'}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Katılımcı Sayısı:</td>
                    <td style="padding: 10px;">${stats.userCount}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Toplam Kelime:</td>
                    <td style="padding: 10px;">${stats.totalWords}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Benzersiz Kelime:</td>
                    <td style="padding: 10px;">${stats.uniqueWords}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; font-weight: bold;">Ortalama Kelime/Kişi:</td>
                    <td style="padding: 10px;">${stats.averageWordsPerUser}</td>
                </tr>
            </table>
        </div>
    `;
}

// Load participants tab
async function loadParticipantsTab(testId) {
    try {
        const response = await fetch(`/api/admin/test-participants/${testId}`);
        const data = await response.json();

        if (data.success) {
            const content = document.getElementById('participantsContent');
            let html = `
                <div style="padding: 20px;">
                    <h3>👥 Katılımcılar</h3>
                    <div style="max-height: 400px; overflow-y: auto; margin-top: 15px;">
            `;

            data.data.forEach(participant => {
                const words = participant.words.map(w => w.word).join(', ');
                html += `
                    <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                        <h4>${participant.username}</h4>
                        <p><strong>Kelime Sayısı:</strong> ${participant.words.length}</p>
                        <details>
                            <summary style="cursor: pointer; color: #0066cc;">Kelimeleri Göster</summary>
                            <p style="margin-top: 10px; color: #666;">${words || 'Kelime yok'}</p>
                        </details>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;

            content.innerHTML = html;
        }
    } catch (error) {
        console.error('Load participants error:', error);
    }
}

// Load words tab
async function loadWordsTab(testId) {
    try {
        const response = await fetch(`/api/admin/test-analysis/${testId}`);
        const data = await response.json();

        if (data.success) {
            const content = document.getElementById('wordsContent');
            const analysis = data.data.wordAnalysis;

            let html = `
                <div style="padding: 20px;">
                    <h3>💬 Kelime Analizi</h3>
                    <table style="width: 100%; margin-top: 15px;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 10px;">Kelime</th>
                                <th style="padding: 10px;">Tekrar</th>
                                <th style="padding: 10px;">Kim Yazdı</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            analysis.slice(0, 30).forEach(item => {
                html += `
                    <tr>
                        <td style="padding: 10px;"><strong>${item.word}</strong></td>
                        <td style="padding: 10px; text-align: center;">${item.count}</td>
                        <td style="padding: 10px; font-size: 12px; color: #666;">${item.users}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;

            content.innerHTML = html;
        }
    } catch (error) {
        console.error('Load words error:', error);
    }
}

// Load charts tab
async function loadChartsTab(testId) {
    try {
        const response = await fetch(`/api/admin/test-analysis/${testId}`);
        const data = await response.json();

        if (data.success) {
            const frequency = data.data.wordFrequency;

            // Prepare data
            const pieData = frequency.slice(0, 15).map(item => ({
                name: item.word,
                value: item.count
            }));

            const barData = {
                categories: frequency.slice(0, 20).map(item => item.word),
                values: frequency.slice(0, 20).map(item => item.count)
            };

            // Render charts
            setTimeout(() => {
                renderModalPieChart(pieData);
                renderModalBarChart(barData);
            }, 100);
        }
    } catch (error) {
        console.error('Load charts error:', error);
    }
}

// Render modal pie chart
function renderModalPieChart(data) {
    const container = document.getElementById('modalPieChart');

    if (modalCharts.pie) {
        modalCharts.pie.dispose();
    }

    modalCharts.pie = echarts.init(container);

    const option = {
        title: {
            text: 'En Popüler Kelimeler',
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        series: [{
            type: 'pie',
            radius: '60%',
            center: ['50%', '50%'],
            data: data,
            emphasis: {
                itemStyle: {
                    shadowBlur: 10,
                    shadowOffsetX: 0,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
            }
        }]
    };

    modalCharts.pie.setOption(option);
}

// Render modal bar chart
function renderModalBarChart(data) {
    const container = document.getElementById('modalBarChart');

    if (modalCharts.bar) {
        modalCharts.bar.dispose();
    }

    modalCharts.bar = echarts.init(container);

    const option = {
        title: {
            text: 'Kelime Sıklığı',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis'
        },
        xAxis: {
            type: 'category',
            data: data.categories,
            axisLabel: {
                rotate: 45
            }
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            type: 'bar',
            data: data.values,
            itemStyle: {
                color: '#0066cc'
            }
        }]
    };

    modalCharts.bar.setOption(option);
}

// Modal tab functionality
function showTab(tabName, clickEvent) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`${tabName}Tab`).style.display = 'block';

    // Add active class to clicked button
    if (clickEvent && clickEvent.target) {
        clickEvent.target.classList.add('active');
    } else {
        // Fallback: find button by data attribute or text
        const activeBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('testDetailModal');
    modal.style.display = 'none';

    // Dispose charts
    if (modalCharts.pie) modalCharts.pie.dispose();
    if (modalCharts.bar) modalCharts.bar.dispose();
    modalCharts = {};
}

// RESET FUNCTIONS

// Soft reset - refresh connections
async function softReset() {
    if (confirm('Tum kullanicilar isim girme ekranina dondurulecek. Emin misiniz?')) {
        try {
            const response = await fetch('/api/admin/soft-reset', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                showAlert('Kullanicilar basa donduruldu', 'success');
                setTimeout(() => loadDashboardData(), 1000);
            } else {
                showAlert(data.error || 'Reset islemi basarisiz', 'error');
            }
        } catch (error) {
            console.error('Soft reset error:', error);
            showAlert('Reset islemi hatasi', 'error');
        }
    }
}

// Cancel test
async function cancelTest() {
    if (!currentTestId) {
        showAlert('Aktif test yok', 'error');
        return;
    }

    if (confirm('Testi iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
        try {
            const response = await fetch(`/api/admin/cancel-test/${currentTestId}`, { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                showAlert('Test iptal edildi', 'success');
                currentTestId = null;
                currentWordSpan.textContent = '-';
                testIdSpan.textContent = '-';
                updateTestStatus('ready');
                loadDashboardData();
            } else {
                showAlert(data.error || 'İptal başarısız', 'error');
            }
        } catch (error) {
            console.error('Cancel test error:', error);
            showAlert('İptal hatası', 'error');
        }
    }
}

// Emergency reset with detailed feedback
async function emergencyReset() {
    if (confirm('🚨 ACİL RESET yapılacak!\n\nŞunlar sıfırlanacak:\n- Tüm aktif ve hazır testler iptal edilecek\n- Kullanıcı veritabanı resetlenecek\n- Tüm oturumlar sonlandırılacak\n- Cache tamamen temizlenecek\n\nEmin misiniz?')) {
        if (confirm('⚠️ Bu işlem geri alınamaz!\n\nTÜM KULLANICILAR sistemden atılacak.\nTekrar onaylayın.')) {
            try {
                // Show loading indicator
                const loadingAlert = document.createElement('div');
                loadingAlert.className = 'alert alert-info';
                loadingAlert.id = 'resetLoading';
                loadingAlert.innerHTML = '🔄 Acil reset işlemi devam ediyor...<br>Lütfen bekleyin...';
                loadingAlert.style.position = 'fixed';
                loadingAlert.style.top = '50%';
                loadingAlert.style.left = '50%';
                loadingAlert.style.transform = 'translate(-50%, -50%)';
                loadingAlert.style.zIndex = '10000';
                loadingAlert.style.padding = '30px';
                loadingAlert.style.fontSize = '18px';
                document.body.appendChild(loadingAlert);

                console.log('🚨 Sending emergency reset request...');
                const response = await fetch('/api/admin/emergency-reset', { method: 'POST' });
                const data = await response.json();

                // Remove loading indicator
                document.getElementById('resetLoading')?.remove();

                if (data.success) {
                    console.log('✅ Emergency reset successful:', data);
                    showAlert('✅ Acil reset tamamlandı!\n\n' +
                             '• Database sıfırlandı\n' +
                             '• Oturumlar temizlendi\n' +
                             '• Cache silindi\n\n' +
                             'Sayfa yenileniyor...', 'success');

                    // Clear local state
                    currentTestId = null;
                    currentWordSpan.textContent = '-';
                    testIdSpan.textContent = '-';
                    updateTestStatus('ready');

                    // Reload after 3 seconds
                    setTimeout(() => {
                        window.location.href = window.location.href.split('?')[0] + '?_=' + Date.now();
                    }, 3000);
                } else {
                    console.error('❌ Emergency reset failed:', data);
                    showAlert('❌ Acil reset başarısız:\n' + (data.error || 'Bilinmeyen hata'), 'error');
                }
            } catch (error) {
                console.error('❌ Emergency reset error:', error);
                document.getElementById('resetLoading')?.remove();
                showAlert('❌ Acil reset hatası: ' + error.message, 'error');
            }
        }
    }
}

// Update UI when test status changes
function updateTestControlButtons() {
    const cancelBtn = document.getElementById('cancelBtn');

    if (testStatus === 'active') {
        cancelBtn.style.display = 'inline-block';
    } else {
        cancelBtn.style.display = 'none';
    }
}