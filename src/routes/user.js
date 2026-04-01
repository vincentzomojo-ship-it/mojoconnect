const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const { authenticate } = require('../middleware/auths');
const walletService = require('../services/walletService');
const {
  getWallet,
  creditWallet,
  purchaseAirtime,
  payBill,
  getTransactions,
  transferFunds,
  createSupportTicket,
  initializePaystackTopUp,
  verifyPaystackTopUp
} = require('../controllers/userController');

const { User } = require('../models');

// ✅ Protect all routes
router.use(authenticate);

// ✅ Get logged in user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    const wallet = await walletService.getWallet(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      username: user.username,
      email: user.email,
      wallet_balance: parseFloat(wallet.balance || 0)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Wallet Routes
router.get('/wallet', getWallet);

router.post('/wallet/credit', [
  body('amount').isFloat({ gt: 0 })
], creditWallet);

router.post('/paystack/initialize', [
  body('amount').isFloat({ gt: 0 })
], initializePaystackTopUp);

router.post('/paystack/verify', [
  body('reference').isString().trim().notEmpty()
], verifyPaystackTopUp);

// ✅ Airtime Purchase
router.post('/purchase', [
  body('amount').isFloat({ gt: 0 }),
  body('phone').isString().trim().notEmpty()
], purchaseAirtime);

// ✅ Pay Bills
router.post('/pay-bill', [
  body('billType').isString().trim().notEmpty(),
  body('reference').isString().trim().notEmpty(),
  body('amount').isFloat({ gt: 0 })
], payBill);

// ✅ Transactions
router.get('/transactions', getTransactions);

// ✅ 🔥 NEW — Internal Transfer Route
router.post('/transfer', [
  body('amount').isFloat({ gt: 0 }),
  body().custom((value) => {
    const hasReceiverNumber = Number.isInteger(parseInt(value.receiverNumber, 10)) && parseInt(value.receiverNumber, 10) > 0;
    const hasAccountNumber = Number.isInteger(parseInt(value.accountNumber, 10)) && parseInt(value.accountNumber, 10) > 0;
    if (!hasReceiverNumber && !hasAccountNumber) {
      throw new Error('receiverNumber or accountNumber is required');
    }
    return true;
  })
], transferFunds);

// ✅ Customer Support Ticket
router.post('/support-tickets', [
  body('issueType').optional().isString(),
  body('message').isString().trim().isLength({ min: 5 })
], createSupportTicket);

module.exports = router;
