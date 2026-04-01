// authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validationResult } = require('express-validator');

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

    const user = await User.create({ username: regName, email: regEmail, password: hash });

    res.status(201).json({ 
      message: 'User created successfully', 
      success: true, 
      user: { id: user.id, email: user.email } 
    });
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
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.is_active === false) {
      return res.status(403).json({ message: 'Account suspended. Contact support.' });
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

module.exports = { register, login };
