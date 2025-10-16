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
        const readyTest = await database.getReadyTest();
        const latestTest = await database.getLatestTest();
        const connectedUsers = socketHandler.getConnectedUsersCount();
        const usersList = socketHandler.getConnectedUsersList();

        res.json({
            success: true,
            data: {
                activeTest,
                readyTest,
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
        console.log('Starting test with ID:', testId);

        // Get the specific test by ID
        const test = await database.getTestById(testId);
        console.log('Found test:', test);

        if (!test) {
            console.error('Test not found with ID:', testId);
            return res.status(404).json({ error: 'Test bulunamadı' });
        }

        if (test.status !== 'ready') {
            console.error(`Test status is '${test.status}', not 'ready'`);
            return res.status(400).json({ error: `Test durumu: ${test.status}. Sadece 'ready' durumundaki testler başlatılabilir.` });
        }

        // Start test
        await database.startTest(testId);
        console.log('Test started successfully:', testId);

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
        res.status(500).json({ error: 'Test başlatılamadı: ' + error.message });
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
        // Use proper Database method instead of direct db access
        const tests = await database.getRecentTests(20);

        res.json({
            success: true,
            data: tests
        });
    } catch (error) {
        console.error('Get tests error:', error);
        res.status(500).json({ error: 'Testler alınamadı' });
    }
});

// Get all tests with pagination (protected)
router.get('/all-tests', checkAdminAuth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;

        const tests = await database.getAllTests(page, limit);

        res.json({
            success: true,
            data: tests,
            page,
            limit
        });
    } catch (error) {
        console.error('Get all tests error:', error);
        res.status(500).json({ error: 'Test listesi alınamadı' });
    }
});

// Get test details (protected)
router.get('/test-details/:id', checkAdminAuth, async (req, res) => {
    try {
        const testId = parseInt(req.params.id);
        const details = await database.getTestDetails(testId);

        if (!details.test) {
            return res.status(404).json({ error: 'Test bulunamadı' });
        }

        const stats = await database.getTestStatistics(testId);

        res.json({
            success: true,
            data: {
                ...details,
                statistics: stats
            }
        });
    } catch (error) {
        console.error('Get test details error:', error);
        res.status(500).json({ error: 'Test detayları alınamadı' });
    }
});

// Get test participants with words (protected)
router.get('/test-participants/:id', checkAdminAuth, async (req, res) => {
    try {
        const testId = parseInt(req.params.id);
        const participants = await database.getTestParticipantsWithWords(testId);

        res.json({
            success: true,
            data: participants
        });
    } catch (error) {
        console.error('Get participants error:', error);
        res.status(500).json({ error: 'Katılımcı listesi alınamadı' });
    }
});

// Get word analysis (protected)
router.get('/test-analysis/:id', checkAdminAuth, async (req, res) => {
    try {
        const testId = parseInt(req.params.id);
        const analysis = await database.getWordAnalysis(testId);
        const frequency = await database.getWordFrequency(testId);

        res.json({
            success: true,
            data: {
                wordAnalysis: analysis,
                wordFrequency: frequency
            }
        });
    } catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({ error: 'Analiz verileri alınamadı' });
    }
});

// Cancel test (protected)
router.post('/cancel-test/:id', checkAdminAuth, async (req, res) => {
    try {
        const testId = parseInt(req.params.id);

        // Cancel test in database
        await database.cancelTest(testId);

        // Emit cancel event
        const io = socketHandler.io;
        if (io) {
            io.emit('test-cancelled', { testId });
        }

        res.json({
            success: true,
            message: 'Test iptal edildi'
        });
    } catch (error) {
        console.error('Cancel test error:', error);
        res.status(500).json({ error: 'Test iptal edilemedi' });
    }
});

// Soft reset - Return everyone to login screen (protected)
router.post('/soft-reset', checkAdminAuth, async (req, res) => {
    try {
        const io = socketHandler.io;

        const activeTest = await database.getActiveTest();
        if (activeTest) {
            await database.cancelTest(activeTest.id);
        }

        await database.resetAllUsers();

        if (io) {
            io.emit('user-reset', {
                timestamp: Date.now(),
                message: 'Tum kullanicilar basa donduruluyor'
            });
        }

        res.json({
            success: true,
            message: 'Kullanicilar isim girme ekranina gonderildi'
        });
    } catch (error) {
        console.error('Soft reset error:', error);
        res.status(500).json({ error: 'Kullanicilar resetlenemedi' });
    }
});

// Emergency reset (protected) - Nuclear option: Complete system reset
router.post('/emergency-reset', checkAdminAuth, async (req, res) => {
    try {
        console.log('🚨 EMERGENCY RESET BAŞLATILDI');

        // Step 1: Database cleanup (cancel tests + reset users)
        await database.emergencyDatabaseReset();
        console.log('✓ Database temizlendi');

        // Step 2: Clear in-memory socket connections
        socketHandler.connectedUsers.clear();
        console.log('✓ Socket connections temizlendi');

        // Step 3: Destroy all user sessions (if session store is accessible)
        if (req.sessionStore) {
            // Get all sessions and destroy them
            req.sessionStore.all((err, sessions) => {
                if (!err && sessions) {
                    Object.keys(sessions).forEach(sessionId => {
                        req.sessionStore.destroy(sessionId, (err) => {
                            if (err) console.error('Session destroy error:', err);
                        });
                    });
                }
            });
            console.log('✓ Server sessions temizlendi');
        }

        // Step 4: Emit emergency reset to all connected clients
        const io = socketHandler.io;
        if (io) {
            io.emit('emergency-reset', {
                timestamp: Date.now(),
                message: 'Sistem tamamen sıfırlandı'
            });
            console.log('✓ Client reset sinyali gönderildi');
        }

        // Step 5: Disconnect all sockets
        if (io) {
            const sockets = await io.fetchSockets();
            sockets.forEach(socket => {
                socket.disconnect(true);
            });
            console.log('✓ Tüm socket bağlantıları kesildi');
        }

        res.json({
            success: true,
            message: 'Acil reset tamamlandı. Sistem sıfırlandı.',
            timestamp: Date.now()
        });

        console.log('✅ EMERGENCY RESET TAMAMLANDI');
    } catch (error) {
        console.error('❌ Emergency reset error:', error);
        res.status(500).json({
            success: false,
            error: 'Acil reset başarısız: ' + error.message
        });
    }
});

module.exports = router;