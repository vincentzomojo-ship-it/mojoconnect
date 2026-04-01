const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  balance: {
    type: DataTypes.DECIMAL(12,2),
    defaultValue: 0.0,
  },
}, {
  timestamps: true,
});

Wallet.belongsTo(User);
User.hasOne(Wallet);

module.exports = Wallet;
