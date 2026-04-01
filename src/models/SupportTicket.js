const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const SupportTicket = sequelize.define('SupportTicket', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  issue_type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'General'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Resolved'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  user_email_snapshot: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'SupportTickets',
  timestamps: true
});

SupportTicket.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(SupportTicket, { foreignKey: 'userId' });

module.exports = SupportTicket;
