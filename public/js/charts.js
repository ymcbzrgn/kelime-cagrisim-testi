// Charts Page JavaScript
let currentTestId = null;
let chartInstances = {};
let socket = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('Charts page loaded, initializing...');
    loadChartData();
    loadTestList();
    initializeSocket();
    setupChartResize();
});

// Setup chart resize handler (only once)
function setupChartResize() {
    window.addEventListener('resize', () => {
        Object.values(chartInstances).forEach(chart => {
            if (chart && !chart.isDisposed()) {
                chart.resize();
            }
        });
    });
}

function initializeSocket() {
    if (typeof io !== 'function') {
        console.warn('Socket.io not available, skipping realtime reset listener');
        return;
    }

    socket = io();

    const redirectToNameEntry = (reason) => {
        console.log('Redirecting to name entry due to:', reason);

        try {
            localStorage.removeItem('sessionId');
            localStorage.removeItem('username');
        } catch (err) {
            console.error('Local storage clear error:', err);
        }

        try {
            sessionStorage?.clear();
        } catch (err) {
            console.error('Session storage clear error:', err);
        }

        if (socket && socket.connected) {
            socket.disconnect();
        }

        window.location.href = '/';
    };

    socket.on('user-reset', () => redirectToNameEntry('user-reset'));
    socket.on('emergency-reset', () => redirectToNameEntry('emergency-reset'));
}

// Load chart data
async function loadChartData(testId = null) {
    console.log('Loading chart data... TestId:', testId);
    const loading = document.getElementById('loading');
    const statisticsSection = document.getElementById('statisticsSection');

    loading.style.display = 'block';
    statisticsSection.style.display = 'none';

    try {
        // Use latest test if no ID provided
        const url = testId
            ? `/api/charts/data/${testId}`
            : '/api/charts/latest';

        console.log('Fetching from URL:', url);
        const response = await fetch(url);
        console.log('Response status:', response.status);

        if (!response.ok) {
            if (response.status === 404) {
                showError('Henüz tamamlanmış test bulunmuyor. Lütfen önce bir test yapın.');
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Result received:', result);

        if (result.success && result.data) {
            currentTestId = testId || result.data.statistics.testId;
            console.log('Current test ID:', currentTestId);
            console.log('Statistics:', result.data.statistics);
            console.log('Chart data available:', {
                pieChart: result.data.pieChartData?.length || 0,
                barChart: result.data.barChartData?.categories?.length || 0,
                wordCloud: result.data.wordCloudData?.length || 0
            });

            displayStatistics(result.data.statistics);
            renderCharts(result.data);
            loading.style.display = 'none';
            statisticsSection.style.display = 'block';
        } else {
            console.error('Invalid result structure:', result);
            showError('Grafik verileri yüklenemedi. Veri yapısı hatalı.');
        }
    } catch (error) {
        console.error('Load chart data error:', error);
        showError(`Veri yükleme hatası: ${error.message}`);
    }
}

// Load test list for selector
async function loadTestList() {
    try {
        // First try to load user's tests
        const response = await fetch('/api/charts/my-tests');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const testSelector = document.getElementById('testSelector');
            const testSelect = document.getElementById('testSelect');

            testSelector.style.display = 'block';

            let options = '<option value="">Katıldığınız Son Test</option>';
            result.data.forEach(test => {
                const date = new Date(test.finished_at).toLocaleDateString('tr-TR');
                options += `<option value="${test.id}">
                    ${test.word} - ${date} (${test.user_count} kişi)
                </option>`;
            });

            testSelect.innerHTML = options;

            // Add change event listener
            testSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    loadChartData(parseInt(e.target.value));
                } else {
                    loadChartData();
                }
            });
        }
    } catch (error) {
        console.error('Load test list error:', error);
    }
}

// Display statistics
function displayStatistics(stats) {
    document.getElementById('testInfo').textContent = `Test Kelimesi: "${stats.testWord}"`;
    document.getElementById('statUsers').textContent = stats.userCount;
    document.getElementById('statTotal').textContent = stats.totalWords;
    document.getElementById('statUnique').textContent = stats.uniqueWords;
    document.getElementById('statAverage').textContent = stats.averageWordsPerUser;
}

// Render all charts
function renderCharts(data) {
    // Dispose existing charts
    Object.values(chartInstances).forEach(chart => {
        if (chart && !chart.isDisposed()) {
            chart.dispose();
        }
    });
    chartInstances = {};

    // Render each chart
    renderBarChart(data.barChartData);
    renderWordCloud(data.wordCloudData);

    // Note: Resize handler is set up once in setupChartResize()
}

// Render bar chart
function renderBarChart(data) {
    const container = document.getElementById('barChart');
    const chart = echarts.init(container);
    chartInstances.bar = chart;

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'value'
        },
        yAxis: {
            type: 'category',
            data: [...data.categories].reverse(), // Fix: Create copy before reversing
            axisLabel: {
                interval: 0,
                rotate: 0
            }
        },
        series: [
            {
                name: 'Tekrar Sayısı',
                type: 'bar',
                data: [...data.values].reverse(), // Fix: Create copy before reversing
                itemStyle: {
                    color: '#0066cc',
                    borderRadius: [0, 4, 4, 0]
                },
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}'
                },
                emphasis: {
                    itemStyle: {
                        color: '#0052a3',
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 102, 204, 0.3)'
                    }
                }
            }
        ]
    };

    chart.setOption(option);
}

// Render word cloud
function renderWordCloud(data) {
    const container = document.getElementById('wordCloudChart');
    const chart = echarts.init(container);
    chartInstances.wordCloud = chart;

    // Calculate size range
    const maxWeight = Math.max(...data.map(item => item.weight));
    const minWeight = Math.min(...data.map(item => item.weight));

    const option = {
        tooltip: {
            show: true,
            formatter: function(params) {
                return `${params.name}: ${params.value} kez`;
            }
        },
        series: [{
            type: 'wordCloud',
            shape: 'circle',
            left: 'center',
            top: 'center',
            width: '90%',
            height: '90%',
            right: null,
            bottom: null,
            sizeRange: [14, 60],
            rotationRange: [-45, 45],
            rotationStep: 45,
            gridSize: 15,
            drawOutOfBound: false,
            textStyle: {
                fontFamily: 'sans-serif',
                fontWeight: 'bold',
                color: function() {
                    const colors = [
                        '#0066cc', '#4a90e2', '#003d7a', '#1e3a5f', '#2c5282',
                        '#0052a3', '#003366', '#4169e1', '#1e90ff', '#4682b4'
                    ];
                    return colors[Math.floor(Math.random() * colors.length)];
                }
            },
            emphasis: {
                focus: 'self',
                textStyle: {
                    shadowBlur: 10,
                    shadowColor: '#333'
                }
            },
            data: data.map(item => ({
                name: item.text,
                value: item.weight
            }))
        }]
    };

    chart.setOption(option);
}

// Export data as CSV
async function exportData() {
    if (!currentTestId) {
        showError('Test seçilmedi');
        return;
    }

    try {
        window.location.href = `/api/charts/export/${currentTestId}`;
    } catch (error) {
        console.error('Export error:', error);
        showError('Dışa aktarma hatası');
    }
}

// Show error message
function showError(message) {
    console.error('Error displayed:', message);
    const loading = document.getElementById('loading');
    const statisticsSection = document.getElementById('statisticsSection');

    // Hide statistics section
    statisticsSection.style.display = 'none';

    // Show error in loading section
    loading.style.display = 'block';
    loading.innerHTML = `
        <div style="color: #f44336; font-size: 18px; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <div>${message}</div>
            <div style="margin-top: 20px; font-size: 14px; color: #666;">
                <p>Hata devam ederse:</p>
                <ul style="text-align: left; display: inline-block;">
                    <li>Önce bir test yapın (Admin panelinden)</li>
                    <li>Testi bitirdiğinizden emin olun</li>
                    <li>Sayfayı yenileyin (F5)</li>
                    <li>Console'da hata detaylarını kontrol edin (F12)</li>
                </ul>
            </div>
        </div>
    `;
}
