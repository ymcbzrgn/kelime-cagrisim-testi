// User Routes
const express = require('express');
const router = express.Router();
const database = require('../database/db');
const crypto = require('crypto');

// Generate session ID
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

// User registration/connection
router.post('/connect', async (req, res) => {
    try {
        const { username } = req.body;

        if (!username || !username.trim()) {
            return res.status(400).json({ error: 'Kullanıcı adı boş olamaz' });
        }

        // Generate or use existing session ID
        let sessionId = req.session.userSessionId;
        if (!sessionId) {
            sessionId = generateSessionId();
            req.session.userSessionId = sessionId;
        }

        // Check if user already exists
        let user = await database.getUserBySessionId(sessionId);
        const activeTest = await database.getActiveTest();

        if (!user) {
            // Create new user
            const testId = activeTest ? activeTest.id : null;
            const userId = await database.createUser(username.trim(), sessionId, null, testId);
            user = {
                id: userId,
                username: username.trim(),
                session_id: sessionId,
                test_id: testId,
                has_submitted: false
            };
        }

        res.json({
            success: true,
            data: {
                username: user.username,
                sessionId: user.session_id,
                hasSubmitted: user.has_submitted,
                testActive: !!activeTest,
                testWord: activeTest ? activeTest.word : null
            }
        });
    } catch (error) {
        console.error('User connect error:', error);
        res.status(500).json({ error: 'Bağlantı hatası' });
    }
});

// Get user status
router.get('/status', async (req, res) => {
    try {
        const sessionId = req.session.userSessionId;
        if (!sessionId) {
            return res.json({
                success: false,
                connected: false
            });
        }

        const user = await database.getUserBySessionId(sessionId);
        if (!user) {
            return res.json({
                success: false,
                connected: false
            });
        }

        const activeTest = await database.getActiveTest();

        res.json({
            success: true,
            connected: true,
            data: {
                username: user.username,
                hasSubmitted: user.has_submitted,
                testActive: !!activeTest,
                testWord: activeTest ? activeTest.word : null,
                shouldRedirect: user.test_id && user.has_submitted && !activeTest
            }
        });
    } catch (error) {
        console.error('User status error:', error);
        res.status(500).json({ error: 'Durum alınamadı' });
    }
});

// Submit responses
router.post('/submit', async (req, res) => {
    try {
        const { words } = req.body;
        const sessionId = req.session.userSessionId;

        if (!sessionId) {
            return res.status(401).json({ error: 'Oturum bulunamadı' });
        }

        const user = await database.getUserBySessionId(sessionId);
        if (!user) {
            return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
        }

        if (user.has_submitted) {
            return res.status(400).json({ error: 'Zaten cevap gönderdiniz' });
        }

        const activeTest = await database.getActiveTest();
        if (!activeTest) {
            return res.status(400).json({ error: 'Aktif test bulunamadı' });
        }

        // Validate words array
        if (!Array.isArray(words) || words.length === 0) {
            return res.status(400).json({ error: 'En az bir kelime girilmelidir' });
        }

        // Filter and validate words
        const validWords = words
            .filter(word => word && typeof word === 'string' && word.trim())
            .slice(0, 15); // Maximum 15 words

        if (validWords.length === 0) {
            return res.status(400).json({ error: 'En az bir geçerli kelime girilmelidir' });
        }

        // Save responses
        await database.saveResponses(user.id, activeTest.id, validWords);
        await database.markUserSubmitted(user.id);

        res.json({
            success: true,
            message: 'Cevaplarınız kaydedildi',
            wordCount: validWords.length
        });
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Kaydetme hatası' });
    }
});

// Check if should redirect to charts
router.get('/check-redirect', async (req, res) => {
    try {
        const sessionId = req.session.userSessionId;
        if (!sessionId) {
            return res.json({ shouldRedirect: false });
        }

        const user = await database.getUserBySessionId(sessionId);
        if (!user) {
            return res.json({ shouldRedirect: false });
        }

        // Check if user's test is finished
        if (user.test_id) {
            const test = await new Promise((resolve, reject) => {
                database.db.get(
                    'SELECT * FROM tests WHERE id = ?',
                    [user.test_id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });

            if (test && test.status === 'finished') {
                return res.json({
                    shouldRedirect: true,
                    testId: test.id
                });
            }
        }

        res.json({ shouldRedirect: false });
    } catch (error) {
        console.error('Check redirect error:', error);
        res.json({ shouldRedirect: false });
    }
});

module.exports = router;