const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, verifyEmail, resendVerification } = require('../controllers/authController');

// REGISTER
router.post('/register', [
  body().custom((value) => {
    const name = (value.regName || value.username || "").trim();
    const email = (value.regEmail || value.email || "").trim();
    const password = value.regPassword || value.password || "";
    if (name.length < 3) throw new Error("Name must be at least 3 characters");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email");
    if (String(password).length < 6) throw new Error("Password must be at least 6 characters");
    return true;
  })
], register);

// LOGIN ✅ FIXED
router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], login);

router.get('/verify-email', verifyEmail);

router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail()
], resendVerification);

module.exports = router;
