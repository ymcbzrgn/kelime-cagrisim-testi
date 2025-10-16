// Authentication Middleware - DISABLED FOR QUICK ACCESS
const checkAdminAuth = (req, res, next) => {
    // Auth disabled - allow all
    req.session.isAdmin = true;
    return next();
};

// Simple auth check for login - DISABLED
const adminLogin = (req, res) => {
    req.session.isAdmin = true;
    return res.json({ success: true, message: 'Giriş başarılı' });
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