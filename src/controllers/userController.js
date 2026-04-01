const walletService = require('../services/walletService');
const paystackService = require('../services/paystackService');
const { User, SupportTicket, Transaction } = require('../models');
const generateReference = require('../utils/generateReference');

// ==========================
// Wallet Balance
// ==========================
const getWallet = async (req, res) => {
  try {
    const result = await walletService.getWallet(req.user.id);
    res.json(result);
  } catch (err) {
    console.error("WALLET ERROR:", err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ==========================
// Credit Wallet
// ==========================
const creditWallet = async (req, res) => {
  try {
    const idempotencyKey = req.header('x-idempotency-key');
    const result = await walletService.credit(
      req.user.id,
      req.body.amount,
      idempotencyKey
    );

    res.json(result);

  } catch (err) {
    console.error("CREDIT ERROR:", err);
    res.status(400).json({ message: err.message || 'Credit failed' });
  }
};

// ==========================
// Purchase Airtime
// ==========================
const purchaseAirtime = async (req, res) => {
  try {
    const idempotencyKey = req.header('x-idempotency-key');
    const result = await walletService.purchase(
      req.user.id,
      req.body.phone,
      req.body.amount,
      idempotencyKey
    );

    res.json(result);

  } catch (err) {
    console.error("PURCHASE ERROR:", err);
    res.status(400).json({ message: err.message || 'Purchase failed' });
  }
};

// ==========================
// Pay Bill
// ==========================
const payBill = async (req, res) => {
  try {
    const idempotencyKey = req.header('x-idempotency-key');
    const result = await walletService.payBill(
      req.user.id,
      req.body.billType,
      req.body.reference,
      req.body.amount,
      idempotencyKey
    );

    res.json(result);

  } catch (err) {
    console.error("PAY BILL ERROR:", err);
    res.status(400).json({ message: err.message || "Bill payment failed" });
  }
};

// ==========================
// Get Transactions
// ==========================
const getTransactions = async (req, res) => {
  try {

    console.log("Fetching transactions for user:", req.user.id);

    const result = await walletService.transactions(req.user.id);

    if (!result || !result.transactions) {
      return res.json({ transactions: [] });
    }

    res.json(result);

  } catch (err) {
    console.error("TRANSACTION ERROR:", err);

    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};

// ==========================
// 🔥 User to User Transfer
// ==========================
const transferFunds = async (req, res) => {
  try {
    const idempotencyKey = req.header("x-idempotency-key");
    const result = await walletService.transfer(req.user.id, req.body, idempotencyKey);
    res.json(result);
  } catch (err) {
    console.error("TRANSFER ERROR:", err);
    res.status(400).json({ message: err.message || "Transfer failed" });
  }
};

// ==========================
// Submit Support Ticket
// ==========================
const createSupportTicket = async (req, res) => {
  try {
    const issueType = String(req.body.issueType || "General").trim() || "General";
    const message = String(req.body.message || "").trim();

    if (message.length < 5) {
      return res.status(400).json({ message: "Please enter a detailed complaint" });
    }

    const ticket = await SupportTicket.create({
      userId: req.user.id,
      issue_type: issueType,
      message,
      status: "Pending",
      user_email_snapshot: req.user.email || null
    });

    res.status(201).json({
      message: "Complaint submitted successfully",
      ticket: {
        id: ticket.id,
        issue_type: ticket.issue_type,
        status: ticket.status,
        createdAt: ticket.createdAt
      }
    });
  } catch (err) {
    console.error("SUPPORT TICKET ERROR:", err);
    res.status(500).json({ message: "Failed to submit complaint" });
  }
};

// ==========================
// Paystack Initialize
// ==========================
const initializePaystackTopUp = async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    const minimum = parseFloat(process.env.MIN_TOPUP_AMOUNT || '4');

    if (!amount || amount < minimum) {
      return res.status(400).json({ message: `Minimum top-up is GHS ${minimum}` });
    }

    if (!req.user?.email) {
      return res.status(400).json({ message: 'User email is required for payment initialization' });
    }

    const reference = `PSK-${generateReference()}`;
    const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || `${req.protocol}://${req.get('host')}/dashboard.html`;

    await Transaction.create({
      reference,
      userId: req.user.id,
      type: 'credit',
      amount,
      status: 'pending',
      payment_method: 'paystack',
      description: 'Paystack wallet top-up initialized'
    });

    const response = await paystackService.initializeTransaction({
      email: req.user.email,
      amount: Math.round(amount * 100),
      currency: 'GHS',
      reference,
      callback_url: callbackUrl,
      metadata: {
        userId: req.user.id,
        username: req.user.username || ''
      }
    });

    if (!response?.status || !response?.data?.authorization_url) {
      return res.status(502).json({ message: 'Unable to initialize payment' });
    }

    res.json({
      message: 'Payment initialized',
      authorization_url: response.data.authorization_url,
      access_code: response.data.access_code,
      reference: response.data.reference
    });
  } catch (err) {
    console.error('PAYSTACK INIT ERROR:', err?.response?.data || err.message || err);
    res.status(500).json({ message: 'Failed to initialize payment' });
  }
};

// ==========================
// Paystack Verify
// ==========================
const verifyPaystackTopUp = async (req, res) => {
  try {
    const reference = String(req.body.reference || '').trim();
    if (!reference) {
      return res.status(400).json({ message: 'Reference is required' });
    }

    const verifyResponse = await paystackService.verifyTransaction(reference);
    const data = verifyResponse?.data || {};
    const metadata = data?.metadata || {};
    const paidUserId = Number(metadata.userId);
    const amount = Number(data.amount || 0) / 100;

    if (!verifyResponse?.status || data?.status !== 'success') {
      await Transaction.update(
        { status: 'failed', description: 'Paystack verification failed' },
        { where: { reference } }
      );
      return res.status(400).json({ message: 'Payment not successful yet' });
    }

    if (!paidUserId || paidUserId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Payment does not belong to this user' });
    }

    const result = await walletService.credit(
      req.user.id,
      amount,
      `paystack:${reference}`
    );

    await Transaction.update(
      { status: 'completed', description: 'Paystack wallet top-up completed' },
      { where: { reference } }
    );

    res.json({
      message: 'Wallet funded successfully',
      balance: result.balance,
      replayed: !!result.replayed,
      reference
    });
  } catch (err) {
    console.error('PAYSTACK VERIFY ERROR:', err?.response?.data || err.message || err);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
};

module.exports = {
  getWallet,
  creditWallet,
  purchaseAirtime,
  payBill,
  getTransactions,
  transferFunds,
  createSupportTicket,
  initializePaystackTopUp,
  verifyPaystackTopUp
};
