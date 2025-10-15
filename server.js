// Kelime Çağrışım Testi - Ana Sunucu
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import custom modules
const database = require('./src/database/db');
const socketHandler = require('./src/websocket/socket');
const adminRoutes = require('./src/routes/admin');
const userRoutes = require('./src/routes/user');
const chartsRoutes = require('./src/routes/charts');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? process.env.ALLOWED_ORIGINS?.split(',')
            : ['http://localhost:3000'],
        methods: ['GET', 'POST']
    }
});

// Port configuration
const PORT = process.env.PORT || 3000;

// Middleware configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdn.socket.io"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*"],
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',')
        : true,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
});
app.use('/api/', limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Static files
app.use(express.static('public'));

// API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/charts', chartsRoutes);

// Page routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/charts', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'charts.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Sayfa bulunamadı' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Sunucu hatası',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Initialize database
database.init().then(() => {
    console.log('✓ Veritabanı başarıyla başlatıldı');

    // Initialize WebSocket handler
    socketHandler.init(io);
    console.log('✓ WebSocket bağlantıları hazır');

    // Start server
    server.listen(PORT, () => {
        console.log(`
╔════════════════════════════════════════╗
║   Kelime Çağrışım Testi Uygulaması    ║
╠════════════════════════════════════════╣
║   Sunucu başarıyla başlatıldı!         ║
║                                        ║
║   🌐 URL: http://localhost:${PORT}        ║
║   👤 Admin: http://localhost:${PORT}/admin ║
║   📊 Charts: http://localhost:${PORT}/charts║
║                                        ║
║   Environment: ${process.env.NODE_ENV || 'development'}             ║
╚════════════════════════════════════════╝
        `);
    });
}).catch(err => {
    console.error('❌ Veritabanı başlatılamadı:', err);
    process.exit(1);
});