// Admin Routes
const express = require('express');
const router = express.Router();
const database = require('../database/db');
const { checkAdminAuth, adminLogin, adminLogout, checkAdminStatus } = require('../middleware/auth');
const socketHandler = require('../websocket/socket');

// Admin login
router.post('/login', adminLogin);

// Admin logout
router.post('/logout', adminLogout);

// Check admin status
router.get('/status', checkAdminStatus);

// Get dashboard data (protected)
router.get('/dashboard', checkAdminAuth, async (req, res) => {
    try {
        const activeTest = await database.getActiveTest();
        const latestTest = await database.getLatestTest();
        const connectedUsers = socketHandler.getConnectedUsersCount();
        const usersList = socketHandler.getConnectedUsersList();

        res.json({
            success: true,
            data: {
                activeTest,
                latestTest,
                connectedUsers,
                usersList: usersList.map(user => ({
                    username: user.username,
                    hasSubmitted: user.has_submitted,
                    connectedAt: user.connected_at
                }))
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Dashboard verileri alınamadı' });
    }
});

// Create new test (protected)
router.post('/test', checkAdminAuth, async (req, res) => {
    try {
        const { word } = req.body;

        if (!word || !word.trim()) {
            return res.status(400).json({ error: 'Kelime boş olamaz' });
        }

        // Check if there's an active test
        const activeTest = await database.getActiveTest();
        if (activeTest) {
            return res.status(400).json({ error: 'Zaten aktif bir test var' });
        }

        // Create new test
        const testId = await database.createTest(word.trim());

        res.json({
            success: true,
            data: {
                testId,
                word: word.trim(),
                status: 'ready'
            }
        });
    } catch (error) {
        console.error('Create test error:', error);
        res.status(500).json({ error: 'Test oluşturulamadı' });
    }
});

// Start test (protected)
router.post('/test/:id/start', checkAdminAuth, async (req, res) => {
    try {
        const testId = parseInt(req.params.id);

        // Check if test exists
        const test = await database.getLatestTest();
        if (!test || test.id !== testId) {
            return res.status(404).json({ error: 'Test bulunamadı' });
        }

        if (test.status !== 'ready') {
            return res.status(400).json({ error: 'Test zaten başlatılmış veya bitmiş' });
        }

        // Start test
        await database.startTest(testId);

        // Emit socket event (handled in socket.js)
        const io = socketHandler.io;
        if (io) {
            io.emit('test-started', {
                testId,
                word: test.word
            });
        }

        res.json({
            success: true,
            message: 'Test başlatıldı'
        });
    } catch (error) {
        console.error('Start test error:', error);
        res.status(500).json({ error: 'Test başlatılamadı' });
    }
});

// Finish test (protected)
router.post('/test/:id/finish', checkAdminAuth, async (req, res) => {
    try {
        const testId = parseInt(req.params.id);

        // Check if test exists and is active
        const test = await database.getActiveTest();
        if (!test || test.id !== testId) {
            return res.status(404).json({ error: 'Aktif test bulunamadı' });
        }

        // Finish test
        await database.finishTest(testId);

        // Emit socket event
        const io = socketHandler.io;
        if (io) {
            io.emit('test-finished', { testId });
        }

        res.json({
            success: true,
            message: 'Test bitirildi'
        });
    } catch (error) {
        console.error('Finish test error:', error);
        res.status(500).json({ error: 'Test bitirilemedi' });
    }
});

// Get test list (protected)
router.get('/tests', checkAdminAuth, async (req, res) => {
    try {
        const tests = await new Promise((resolve, reject) => {
            database.db.all(
                'SELECT * FROM tests ORDER BY created_at DESC LIMIT 20',
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
        res.status(500).json({ error: 'Testler alınamadı' });
    }
});

module.exports = router;