// Charts Routes
const express = require('express');
const router = express.Router();
const database = require('../database/db');

// Get chart data for a specific test
router.get('/data/:testId', async (req, res) => {
    try {
        const testId = parseInt(req.params.testId);

        // Get test statistics
        const stats = await database.getTestStatistics(testId);
        if (!stats.test) {
            return res.status(404).json({ error: 'Test bulunamadı' });
        }

        // Get word frequency
        const wordFrequency = await database.getWordFrequency(testId);

        // Get all responses for timeline
        const allResponses = await database.getTestResponses(testId);

        // Process data for charts
        const chartData = {
            // Basic statistics
            statistics: {
                testWord: stats.test.word,
                testDate: stats.test.started_at || stats.test.created_at,
                userCount: stats.userCount,
                totalWords: stats.totalWords,
                uniqueWords: stats.uniqueWords,
                averageWordsPerUser: stats.userCount > 0 ? Math.round(stats.totalWords / stats.userCount) : 0
            },

            // Pie chart data (top 15-20 words)
            pieChartData: wordFrequency.slice(0, 20).map(item => ({
                name: item.word,
                value: item.count
            })),

            // Bar chart data (top 30 words)
            barChartData: {
                categories: wordFrequency.slice(0, 30).map(item => item.word),
                values: wordFrequency.slice(0, 30).map(item => item.count)
            },

            // Word cloud data (all words)
            wordCloudData: wordFrequency.map(item => ({
                text: item.word,
                weight: item.count
            })),

            // Line chart data (cumulative unique words over time)
            lineChartData: processTimelineData(allResponses),

            // Raw frequency data
            wordFrequency: wordFrequency
        };

        res.json({
            success: true,
            data: chartData
        });
    } catch (error) {
        console.error('Chart data error:', error);
        res.status(500).json({ error: 'Grafik verileri alınamadı' });
    }
});

// Get latest test data
router.get('/latest', async (req, res) => {
    try {
        const latestTest = await database.getLatestTest();
        if (!latestTest || latestTest.status !== 'finished') {
            return res.status(404).json({ error: 'Tamamlanmış test bulunamadı' });
        }

        // Redirect to specific test data
        res.redirect(`/api/charts/data/${latestTest.id}`);
    } catch (error) {
        console.error('Latest chart error:', error);
        res.status(500).json({ error: 'Son test verileri alınamadı' });
    }
});

// Get list of completed tests
router.get('/tests', async (req, res) => {
    try {
        const tests = await new Promise((resolve, reject) => {
            database.db.all(
                `SELECT t.*,
                        (SELECT COUNT(DISTINCT user_id) FROM responses WHERE test_id = t.id) as user_count,
                        (SELECT COUNT(*) FROM responses WHERE test_id = t.id) as response_count
                 FROM tests t
                 WHERE t.status = 'finished'
                 ORDER BY t.finished_at DESC
                 LIMIT 20`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        res.json({
            success: true,
            data: tests
        });
    } catch (error) {
        console.error('Get tests error:', error);
        res.status(500).json({ error: 'Test listesi alınamadı' });
    }
});

// Export data as CSV
router.get('/export/:testId', async (req, res) => {
    try {
        const testId = parseInt(req.params.testId);

        const stats = await database.getTestStatistics(testId);
        if (!stats.test) {
            return res.status(404).json({ error: 'Test bulunamadı' });
        }

        const responses = await database.getTestResponses(testId);

        // Create CSV content
        let csv = 'Test Kelimesi,Kullanıcı,Kelime,Sıra,Zaman\n';
        responses.forEach(response => {
            csv += `"${stats.test.word}","${response.username}","${response.word}",${response.position},"${response.created_at}"\n`;
        });

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=test-${testId}-sonuclari.csv`);

        // Add BOM for UTF-8 to ensure Excel displays Turkish characters correctly
        res.send('\uFEFF' + csv);
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Veri dışa aktarılamadı' });
    }
});

// Helper function to process timeline data
function processTimelineData(responses) {
    if (!responses || responses.length === 0) {
        return { times: [], values: [] };
    }

    // Group responses by time intervals
    const uniqueWords = new Set();
    const timeline = [];

    responses.forEach(response => {
        uniqueWords.add(response.word.toLowerCase());
        const time = new Date(response.created_at);
        timeline.push({
            time,
            uniqueCount: uniqueWords.size
        });
    });

    // Sample data points for smooth line chart (max 50 points)
    const sampleSize = Math.min(50, timeline.length);
    const step = Math.floor(timeline.length / sampleSize);

    const sampledData = [];
    for (let i = 0; i < timeline.length; i += step) {
        sampledData.push(timeline[i]);
    }

    // Always include the last point
    if (timeline.length > 0 && sampledData[sampledData.length - 1] !== timeline[timeline.length - 1]) {
        sampledData.push(timeline[timeline.length - 1]);
    }

    return {
        times: sampledData.map(d => d.time),
        values: sampledData.map(d => d.uniqueCount)
    };
}

module.exports = router;