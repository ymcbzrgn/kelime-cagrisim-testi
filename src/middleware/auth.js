// Authentication Middleware
const checkAdminAuth = (req, res, next) => {
    // Check if admin is logged in via session
    if (req.session && req.session.isAdmin) {
        return next();
    }

    // Check Basic Auth header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const username = auth[0];
    const password = auth[1];

    // Verify credentials
    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return next();
    }

    return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
};

// Simple auth check for login
const adminLogin = (req, res) => {
    const { username, password } = req.body;

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        return res.json({ success: true, message: 'Giriş başarılı' });
    }

    return res.status(401).json({ error: 'Geçersiz kullanıcı adı veya şifre' });
};

// Logout handler
const adminLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Çıkış yapılamadı' });
        }
        res.json({ success: true, message: 'Çıkış yapıldı' });
    });
};

// Check if admin is logged in (for frontend)
const checkAdminStatus = (req, res) => {
    res.json({ isAdmin: req.session && req.session.isAdmin });
};

module.exports = {
    checkAdminAuth,
    adminLogin,
    adminLogout,
    checkAdminStatus
};