// Database Management Module
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            // Ensure data directory exists
            const dataDir = path.dirname(process.env.DB_PATH || './data/database.sqlite');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Connect to database
            const dbPath = path.resolve(process.env.DB_PATH || './data/database.sqlite');
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Database connection error:', err);
                    reject(err);
                    return;
                }
                console.log('✓ SQLite veritabanına bağlanıldı');
            });

            // Configure database
            this.db.serialize(() => {
                // Enable foreign keys
                this.db.run('PRAGMA foreign_keys = ON');
                // Set UTF-8 encoding
                this.db.run('PRAGMA encoding = "UTF-8"');
                // Performance optimization
                this.db.run('PRAGMA journal_mode = WAL');
                this.db.run('PRAGMA busy_timeout = 5000');

                // Create tables
                this.createTables()
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                // Tests table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS tests (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        word TEXT NOT NULL,
                        status TEXT DEFAULT 'ready',
                        started_at DATETIME,
                        finished_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating tests table:', err);
                        reject(err);
                        return;
                    }
                });

                // Users table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT NOT NULL,
                        session_id TEXT UNIQUE,
                        socket_id TEXT,
                        test_id INTEGER,
                        connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        has_submitted BOOLEAN DEFAULT 0,
                        FOREIGN KEY (test_id) REFERENCES tests(id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating users table:', err);
                        reject(err);
                        return;
                    }
                });

                // Responses table
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS responses (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        test_id INTEGER NOT NULL,
                        word TEXT NOT NULL,
                        position INTEGER NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        FOREIGN KEY (test_id) REFERENCES tests(id)
                    )
                `, (err) => {
                    if (err) {
                        console.error('Error creating responses table:', err);
                        reject(err);
                        return;
                    }
                });

                // Create indexes for performance
                this.db.run('CREATE INDEX IF NOT EXISTS idx_responses_test_id ON responses(test_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_responses_word ON responses(word)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_users_session_id ON users(session_id)');
                this.db.run('CREATE INDEX IF NOT EXISTS idx_users_test_id ON users(test_id)');

                console.log('✓ Veritabanı tabloları oluşturuldu/kontrol edildi');
                resolve();
            });
        });
    }

    // Test management methods
    async createTest(word) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('INSERT INTO tests (word, status) VALUES (?, ?)');
            stmt.run(word, 'ready', function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.lastID);
            });
            stmt.finalize();
        });
    }

    async startTest(testId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(
                'UPDATE tests SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            stmt.run('active', testId, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
            stmt.finalize();
        });
    }

    async finishTest(testId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(
                'UPDATE tests SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?'
            );
            stmt.run('finished', testId, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
            stmt.finalize();
        });
    }

    async getActiveTest() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM tests WHERE status = "active" ORDER BY started_at DESC LIMIT 1', (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    async getLatestTest() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM tests ORDER BY created_at DESC LIMIT 1', (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    // User management methods
    async createUser(username, sessionId, socketId, testId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(
                'INSERT INTO users (username, session_id, socket_id, test_id) VALUES (?, ?, ?, ?)'
            );
            stmt.run(username, sessionId, socketId, testId, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.lastID);
            });
            stmt.finalize();
        });
    }

    async getUserBySessionId(sessionId) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM users WHERE session_id = ?', [sessionId], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    async updateUserSocketId(userId, socketId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('UPDATE users SET socket_id = ? WHERE id = ?');
            stmt.run(socketId, userId, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
            stmt.finalize();
        });
    }

    async markUserSubmitted(userId) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare('UPDATE users SET has_submitted = 1 WHERE id = ?');
            stmt.run(userId, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
            stmt.finalize();
        });
    }

    async getConnectedUsers(testId) {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM users WHERE test_id = ?', [testId], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows);
            });
        });
    }

    // Response management methods
    async saveResponses(userId, testId, words) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                const stmt = this.db.prepare(
                    'INSERT INTO responses (user_id, test_id, word, position) VALUES (?, ?, ?, ?)'
                );

                for (let i = 0; i < words.length; i++) {
                    if (words[i] && words[i].trim()) {
                        stmt.run(userId, testId, words[i].trim(), i + 1);
                    }
                }

                stmt.finalize((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        });
    }

    async getTestResponses(testId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT r.*, u.username
                 FROM responses r
                 JOIN users u ON r.user_id = u.id
                 WHERE r.test_id = ?
                 ORDER BY r.position`,
                [testId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(rows);
                }
            );
        });
    }

    async getWordFrequency(testId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT LOWER(word) as word, COUNT(*) as count
                 FROM responses
                 WHERE test_id = ?
                 GROUP BY LOWER(word)
                 ORDER BY count DESC`,
                [testId],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(rows);
                }
            );
        });
    }

    async getTestStatistics(testId) {
        return new Promise((resolve, reject) => {
            const stats = {};

            // Get test info
            this.db.get('SELECT * FROM tests WHERE id = ?', [testId], (err, test) => {
                if (err) {
                    reject(err);
                    return;
                }
                stats.test = test;

                // Get user count
                this.db.get(
                    'SELECT COUNT(DISTINCT user_id) as userCount FROM responses WHERE test_id = ?',
                    [testId],
                    (err, row) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        stats.userCount = row.userCount;

                        // Get total word count
                        this.db.get(
                            'SELECT COUNT(*) as totalWords FROM responses WHERE test_id = ?',
                            [testId],
                            (err, row) => {
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                stats.totalWords = row.totalWords;

                                // Get unique word count
                                this.db.get(
                                    'SELECT COUNT(DISTINCT LOWER(word)) as uniqueWords FROM responses WHERE test_id = ?',
                                    [testId],
                                    (err, row) => {
                                        if (err) {
                                            reject(err);
                                            return;
                                        }
                                        stats.uniqueWords = row.uniqueWords;
                                        resolve(stats);
                                    }
                                );
                            }
                        );
                    }
                );
            });
        });
    }

    // Close database connection
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    console.log('✓ Veritabanı bağlantısı kapatıldı');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}

// Create and export singleton instance
module.exports = new Database();