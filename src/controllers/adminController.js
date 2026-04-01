const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const SupportTicket = require('../models/SupportTicket');

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'role', 'is_active', 'createdAt']
    });

    const wallets = await Wallet.findAll({
      attributes: ['UserId', 'balance']
    });

    const walletByUser = new Map(wallets.map(w => [w.UserId, parseFloat(w.balance || 0)]));
    const enrichedUsers = users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      is_active: u.is_active !== false,
      wallet_balance: walletByUser.get(u.id) || 0,
      createdAt: u.createdAt
    }));

    res.json({ users: enrichedUsers });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all transactions
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      include: [{
        model: User,
        attributes: ['email']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({ transactions });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Suspend / Reactivate user
const updateUserStatus = async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const isActive = !!req.body.isActive;

    if (!userId) {
      return res.status(400).json({ message: 'Invalid user id' });
    }

    if (req.user && req.user.id === userId && isActive === false) {
      return res.status(400).json({ message: 'You cannot suspend your own admin account' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.is_active = isActive;
    await user.save();

    res.json({
      message: isActive ? 'User reactivated' : 'User suspended',
      user: {
        id: user.id,
        email: user.email,
        is_active: user.is_active
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔥 NEW — Admin Stats (Revenue + System Data)
const getAdminStats = async (req, res) => {
  try {

    const totalUsers = await User.count();
    const totalTransactions = await Transaction.count();

    const totalRevenue = await Transaction.sum('amount', {
      where: {
        type: 'debit'
      }
    });

    const totalWalletBalance = await Wallet.sum('balance');

    res.json({
      totalUsers,
      totalTransactions,
      totalRevenue: totalRevenue || 0,
      totalWalletBalance: totalWalletBalance || 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// List support tickets
const getSupportTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.findAll({
      include: [{
        model: User,
        attributes: ['email']
      }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ tickets });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update support ticket status
const updateSupportTicketStatus = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const status = String(req.body.status || "").trim();
    if (!ticketId) return res.status(400).json({ message: 'Invalid ticket id' });
    if (!['Pending', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.status = status;
    await ticket.save();
    res.json({ message: 'Ticket status updated', ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete support ticket
const deleteSupportTicket = async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (!ticketId) return res.status(400).json({ message: 'Invalid ticket id' });

    const ticket = await SupportTicket.findByPk(ticketId);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    await ticket.destroy();
    res.json({ message: 'Ticket deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUsers,
  getAllTransactions,
  getAdminStats,
  updateUserStatus,
  getSupportTickets,
  updateSupportTicketStatus,
  deleteSupportTicket
};
