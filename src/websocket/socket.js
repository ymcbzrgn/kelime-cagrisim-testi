// WebSocket Event Handler Module
const database = require('../database/db');

class SocketHandler {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // socketId -> user info
    }

    init(io) {
        this.io = io;
        this.setupEventHandlers();
        console.log('✓ WebSocket handler başlatıldı');
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`➕ Yeni bağlantı: ${socket.id}`);

            // Handle user connection
            socket.on('user-connected', async (data) => {
                try {
                    const { username, sessionId } = data;

                    // Get or create user
                    let user = await database.getUserBySessionId(sessionId);
                    const activeTest = await database.getActiveTest();
                    const testId = activeTest ? activeTest.id : null;

                    if (!user) {
                        // Create new user
                        const userId = await database.createUser(username, sessionId, socket.id, testId);
                        user = {
                            id: userId,
                            username,
                            session_id: sessionId,
                            socket_id: socket.id,
                            test_id: testId,
                            has_submitted: false
                        };
                    } else {
                        // Update existing user's socket ID
                        await database.updateUserSocketId(user.id, socket.id);
                        user.socket_id = socket.id;
                    }

                    // Store user in memory
                    this.connectedUsers.set(socket.id, user);

                    // Join test room if test is active
                    if (testId) {
                        socket.join(`test-${testId}`);
                    }

                    // Send user status
                    socket.emit('user-status', {
                        connected: true,
                        username: user.username,
                        hasSubmitted: user.has_submitted,
                        testActive: !!activeTest,
                        testWord: activeTest ? activeTest.word : null
                    });

                    // Broadcast user count update
                    this.broadcastUserCount();

                    console.log(`✓ Kullanıcı bağlandı: ${username} (${socket.id})`);
                } catch (error) {
                    console.error('User connection error:', error);
                    socket.emit('error', { message: 'Bağlantı hatası' });
                }
            });

            // Note: Word submission is handled via HTTP API in src/routes/user.js
            // This prevents duplicate submissions that were happening when using both WebSocket and HTTP

            // Handle admin connection
            socket.on('admin-connected', () => {
                socket.join('admin-room');
                console.log(`🔑 Admin bağlandı: ${socket.id}`);
                this.sendAdminUpdate(socket);
            });

            // Handle test start
            socket.on('start-test', async (data) => {
                try {
                    const { testId } = data;

                    // Start test in database
                    await database.startTest(testId);
                    const test = await database.getLatestTest();

                    // Notify all users
                    this.io.emit('test-started', {
                        testId: test.id,
                        word: test.word
                    });

                    console.log(`🚀 Test başlatıldı: ${test.word}`);
                } catch (error) {
                    console.error('Test start error:', error);
                    socket.emit('error', { message: 'Test başlatma hatası' });
                }
            });

            // Handle test finish
            socket.on('finish-test', async (data) => {
                try {
                    const { testId } = data;

                    // Finish test in database
                    await database.finishTest(testId);

                    // Notify all users to redirect to charts
                    this.io.emit('test-finished', { testId });

                    // Clear connected users for this test
                    for (const [socketId, user] of this.connectedUsers) {
                        if (user.test_id === testId) {
                            user.has_submitted = false;
                            user.test_id = null;
                        }
                    }

                    console.log(`🏁 Test bitirildi: Test ID ${testId}`);
                } catch (error) {
                    console.error('Test finish error:', error);
                    socket.emit('error', { message: 'Test bitirme hatası' });
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                const user = this.connectedUsers.get(socket.id);
                if (user) {
                    console.log(`➖ Kullanıcı ayrıldı: ${user.username} (${socket.id})`);
                    this.connectedUsers.delete(socket.id);
                    this.broadcastUserCount();
                } else {
                    console.log(`➖ Bağlantı kesildi: ${socket.id}`);
                }
            });
        });
    }

    // Helper methods
    broadcastUserCount() {
        const userCount = this.connectedUsers.size;
        this.io.emit('user-count', { count: userCount });

        // Send detailed info to admins
        const userList = Array.from(this.connectedUsers.values()).map(user => ({
            username: user.username,
            hasSubmitted: user.has_submitted,
            connectedAt: user.connected_at
        }));

        this.io.to('admin-room').emit('user-list-update', { users: userList });
    }

    async sendAdminUpdate(socket) {
        try {
            const activeTest = await database.getActiveTest();
            const readyTest = await database.getReadyTest();
            const latestTest = await database.getLatestTest();

            const userList = Array.from(this.connectedUsers.values()).map(user => ({
                username: user.username,
                hasSubmitted: user.has_submitted,
                connectedAt: user.connected_at
            }));

            socket.emit('admin-status', {
                activeTest,
                readyTest,
                latestTest,
                userCount: this.connectedUsers.size,
                users: userList
            });
        } catch (error) {
            console.error('Admin update error:', error);
        }
    }

    // Get connected users count
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }

    // Get connected users list
    getConnectedUsersList() {
        return Array.from(this.connectedUsers.values());
    }
}

// Create and export singleton instance
module.exports = new SocketHandler();