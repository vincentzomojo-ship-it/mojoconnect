// authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

function makeEmailVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getAppBaseUrl(req) {
  return (
    process.env.APP_BASE_URL ||
    process.env.CORS_ORIGIN?.split(',')?.map((s) => s.trim())?.find(Boolean) ||
    `${req.protocol}://${req.get('host')}`
  );
}

function buildVerificationUrl(req, token) {
  const base = getAppBaseUrl(req).replace(/\/+$/, '');
  return `${base}/verify-email.html?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail(req, user, token) {
  const verificationUrl = buildVerificationUrl(req, token);
  logger.info('Email verification link generated', {
    userId: user.id,
    email: user.email,
    verificationUrl
  });
  return verificationUrl;
}

// REGISTER
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  // Accept both legacy and current frontend field names.
  const regName = (req.body.regName || req.body.username || "").trim();
  const regEmail = (req.body.regEmail || req.body.email || "").trim().toLowerCase();
  const regPassword = req.body.regPassword || req.body.password || "";

  if (!regName || !regEmail || !regPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existingEmail = await User.findOne({ where: { email: regEmail } });
    if (existingEmail) return res.status(400).json({ message: 'Email already registered' });

    const existingUsername = await User.findOne({ where: { username: regName } });
    if (existingUsername) return res.status(400).json({ message: 'Username already taken' });

    const hash = await bcrypt.hash(regPassword, 10);
    const token = makeEmailVerificationToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    const user = await User.create({
      username: regName,
      email: regEmail,
      password: hash,
      email_verified: false,
      email_verification_token: token,
      email_verification_expires: expiresAt
    });

    const verificationUrl = await sendVerificationEmail(req, user, token);

    const payload = {
      message: 'Account created. Check your email to verify your account.',
      success: true,
      requiresEmailVerification: true,
      user: { id: user.id, email: user.email }
    };

    if (process.env.NODE_ENV !== 'production') {
      payload.verificationUrl = verificationUrl;
    }

    res.status(201).json(payload);
  } catch (err) {
    if (err?.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({ message: "Email or username already exists" });
    }
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// LOGIN
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;

  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalizedEmail } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.is_active === false) {
      return res.status(403).json({ message: 'Account suspended. Contact support.' });
    }
    if (!user.email_verified) {
      return res.status(403).json({
        message: 'Please verify your email before login.',
        requiresEmailVerification: true
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, role: user.role }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '1h' }
    );

    res.json({ token, success: true });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyEmail = async (req, res) => {
  const token = String(req.query.token || '').trim();
  if (!token) {
    return res.status(400).json({ message: 'Verification token is required.' });
  }

  try {
    const user = await User.findOne({ where: { email_verification_token: token } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid verification token.' });
    }

    if (!user.email_verification_expires || new Date(user.email_verification_expires).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Verification token has expired. Please request a new one.' });
    }

    user.email_verified = true;
    user.email_verification_token = null;
    user.email_verification_expires = null;
    await user.save();

    return res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('VERIFY EMAIL ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const resendVerification = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Account not found.' });
    if (user.email_verified) return res.status(200).json({ success: true, message: 'Email is already verified.' });

    const token = makeEmailVerificationToken();
    user.email_verification_token = token;
    user.email_verification_expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await user.save();

    const verificationUrl = await sendVerificationEmail(req, user, token);
    const payload = {
      success: true,
      message: 'Verification email sent. Please check your inbox.'
    };
    if (process.env.NODE_ENV !== 'production') {
      payload.verificationUrl = verificationUrl;
    }
    return res.json(payload);
  } catch (err) {
    console.error('RESEND VERIFICATION ERROR:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, verifyEmail, resendVerification };
