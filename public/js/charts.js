// Charts Page JavaScript
let currentTestId = null;
let chartInstances = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadChartData();
    loadTestList();
});

// Load chart data
async function loadChartData(testId = null) {
    const loading = document.getElementById('loading');
    const statisticsSection = document.getElementById('statisticsSection');

    loading.style.display = 'block';
    statisticsSection.style.display = 'none';

    try {
        // Use latest test if no ID provided
        const url = testId
            ? `/api/charts/data/${testId}`
            : '/api/charts/latest';

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
            currentTestId = testId || result.data.statistics.testId;
            displayStatistics(result.data.statistics);
            renderCharts(result.data);
            loading.style.display = 'none';
            statisticsSection.style.display = 'block';
        } else {
            showError('Grafik verileri yüklenemedi');
        }
    } catch (error) {
        console.error('Load chart data error:', error);
        showError('Veri yükleme hatası');
    }
}

// Load test list for selector
async function loadTestList() {
    try {
        const response = await fetch('/api/charts/tests');
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            const testSelector = document.getElementById('testSelector');
            const testSelect = document.getElementById('testSelect');

            testSelector.style.display = 'block';

            let options = '<option value="">Son Test</option>';
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
    renderPieChart(data.pieChartData);
    renderBarChart(data.barChartData);
    renderLineChart(data.lineChartData);
    renderWordCloud(data.wordCloudData);

    // Handle window resize
    window.addEventListener('resize', () => {
        Object.values(chartInstances).forEach(chart => {
            if (chart && !chart.isDisposed()) {
                chart.resize();
            }
        });
    });
}

// Render pie chart
function renderPieChart(data) {
    const container = document.getElementById('pieChart');
    const chart = echarts.init(container);
    chartInstances.pie = chart;

    const option = {
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c} ({d}%)'
        },
        legend: {
            type: 'scroll',
            orient: 'vertical',
            right: 10,
            top: 20,
            bottom: 20
        },
        series: [
            {
                name: 'Kelimeler',
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['40%', '50%'],
                avoidLabelOverlap: true,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '20',
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: data
            }
        ]
    };

    chart.setOption(option);
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
            data: data.categories.reverse(),
            axisLabel: {
                interval: 0,
                rotate: 0
            }
        },
        series: [
            {
                name: 'Tekrar Sayısı',
                type: 'bar',
                data: data.values.reverse(),
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: '#83bff6' },
                        { offset: 0.5, color: '#188df0' },
                        { offset: 1, color: '#188df0' }
                    ])
                },
                emphasis: {
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                            { offset: 0, color: '#2378f7' },
                            { offset: 0.7, color: '#2378f7' },
                            { offset: 1, color: '#83bff6' }
                        ])
                    }
                }
            }
        ]
    };

    chart.setOption(option);
}

// Render line chart
function renderLineChart(data) {
    const container = document.getElementById('lineChart');
    const chart = echarts.init(container);
    chartInstances.line = chart;

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                const param = params[0];
                const date = new Date(param.axisValue);
                const time = date.toLocaleTimeString('tr-TR');
                return `${time}<br/>Benzersiz Kelime: ${param.value}`;
            }
        },
        xAxis: {
            type: 'category',
            data: data.times,
            axisLabel: {
                formatter: function(value) {
                    const date = new Date(value);
                    return date.toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                }
            }
        },
        yAxis: {
            type: 'value',
            name: 'Benzersiz Kelime Sayısı'
        },
        series: [
            {
                name: 'Benzersiz Kelimeler',
                type: 'line',
                data: data.values,
                smooth: true,
                symbol: 'none',
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(34, 193, 195, 0.8)' },
                        { offset: 1, color: 'rgba(34, 193, 195, 0.1)' }
                    ])
                },
                lineStyle: {
                    width: 3,
                    color: 'rgb(34, 193, 195)'
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
                        '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
                        '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'
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
    const loading = document.getElementById('loading');
    loading.innerHTML = `
        <div style="color: #f44336; font-size: 18px;">
            ⚠️ ${message}
        </div>
    `;
}