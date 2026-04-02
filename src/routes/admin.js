const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorizeAdmin } = require('../middleware/auths');

// Require authenticated admin account first.
router.use(authenticate);
router.use(authorizeAdmin);

// Only attach routes IF functions exist
router.get('/stats', adminController.getAdminStats || ((req, res) => {
  res.status(501).json({ message: "Stats not implemented" });
}));

router.get('/users', adminController.getUsers || ((req, res) => {
  res.status(501).json({ message: "getUsers not implemented" });
}));

router.get('/transactions', adminController.getAllTransactions || ((req, res) => {
  res.status(501).json({ message: "getAllTransactions not implemented" });
}));

router.patch('/users/:id/status', adminController.updateUserStatus || ((req, res) => {
  res.status(501).json({ message: "updateUserStatus not implemented" });
}));

router.get('/support-tickets', adminController.getSupportTickets || ((req, res) => {
  res.status(501).json({ message: "getSupportTickets not implemented" });
}));

router.patch('/support-tickets/:id/status', adminController.updateSupportTicketStatus || ((req, res) => {
  res.status(501).json({ message: "updateSupportTicketStatus not implemented" });
}));

router.delete('/support-tickets/:id', adminController.deleteSupportTicket || ((req, res) => {
  res.status(501).json({ message: "deleteSupportTicket not implemented" });
}));

module.exports = router;
