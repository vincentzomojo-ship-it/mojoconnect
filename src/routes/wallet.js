const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auths');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');

// GET /user/profile
router.get('/profile', authenticate, async (req, res) => {
  const user = req.user;
  res.json({ wallet_balance: user.wallet_balance });
});

// POST /user/wallet/credit
router.post('/wallet/credit', authenticate, async (req, res) => {
  const { amount } = req.body;
  if (!amount || isNaN(amount)) return res.status(400).json({ message: "Invalid amount" });

  const user = req.user;
  user.wallet_balance += parseFloat(amount);
  await user.save();

  await Transaction.create({
    userId: user.id,
    type: 'credit',
    amount,
    status: 'completed',
    description: 'Funds added'
  });

  res.json({ message: "Funds added successfully" });
});

// POST /user/withdraw
router.post('/withdraw', authenticate, async (req, res) => {
  const { amount, pin } = req.body;
  const user = req.user;

  if (!amount || isNaN(amount)) return res.status(400).json({ message: "Invalid amount" });
  if (!pin) return res.status(400).json({ message: "PIN required" });

  const pinValid = await bcrypt.compare(pin, user.pin_hash);
  if (!pinValid) return res.status(400).json({ message: "Invalid PIN" });
  if (amount > user.wallet_balance) return res.status(400).json({ message: "Insufficient balance" });

  user.wallet_balance -= parseFloat(amount);
  await user.save();

  await Transaction.create({
    userId: user.id,
    type: 'withdraw',
    amount,
    status: 'completed',
    description: 'Withdrawn'
  });

  res.json({ message: "Withdrawal successful" });
});

module.exports = router;