const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');

const Transaction = sequelize.define('Transaction', {

  reference: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  type: {
    type: DataTypes.ENUM('credit', 'debit', 'transfer', 'airtime', 'bundle', 'bill', 'withdraw'),
    allowNull: false
  },

  amount: {
    type: DataTypes.FLOAT,
    allowNull: false
  },

  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending'
  },

  payment_method: {
    type: DataTypes.STRING,
    allowNull: true
  },

  description: {
    type: DataTypes.STRING
  },

  idempotency_key: {
    type: DataTypes.STRING,
    allowNull: true
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  }

}, {
  tableName: 'Transactions',
  indexes: [
    {
      unique: true,
      fields: ['userId', 'idempotency_key'],
      name: 'transactions_user_idempotency_unique'
    }
  ]
});

Transaction.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Transaction, { foreignKey: 'userId' });

module.exports = Transaction;
