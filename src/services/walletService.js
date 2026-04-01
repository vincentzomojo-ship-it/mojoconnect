const { Wallet, Transaction } = require('../models');
const sequelize = require('../config/database');
const generateReference = require('../utils/generateReference');

function parseAndValidateAmount(value) {
  const amount = parseFloat(value);
  if (!amount || amount <= 0) {
    throw new Error('Invalid amount');
  }
  return amount;
}

function normalizeIdempotencyKey(value) {
  const key = String(value || '').trim();
  if (!key) return null;
  if (key.length > 100) {
    throw new Error('Idempotency key is too long');
  }
  return key;
}

async function findReplay(userId, idempotencyKey) {
  if (!idempotencyKey) return null;
  const existingTx = await Transaction.findOne({
    where: { userId, idempotency_key: idempotencyKey }
  });

  if (!existingTx) return null;

  const wallet = await Wallet.findOne({ where: { UserId: userId } });
  return { existingTx, wallet };
}

async function getWallet(userId) {
  let wallet = await Wallet.findOne({ where: { UserId: userId } });

  if (!wallet) {
    wallet = await Wallet.create({ UserId: userId, balance: 0 });
  }

  return { balance: wallet.balance };
}

async function credit(userId, amountInput, idempotencyKeyInput) {
  const amount = parseAndValidateAmount(amountInput);
  const idempotencyKey = normalizeIdempotencyKey(idempotencyKeyInput);

  try {
    return await sequelize.transaction(async (transaction) => {
      let wallet = await Wallet.findOne({
        where: { UserId: userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet) {
        wallet = await Wallet.create({ UserId: userId, balance: 0 }, { transaction });
      }

      wallet.balance = parseFloat(wallet.balance) + amount;
      await wallet.save({ transaction });

      const reference = generateReference();
      await Transaction.create({
        reference,
        userId,
        type: 'credit',
        amount,
        description: 'Wallet top-up',
        status: 'completed',
        payment_method: 'wallet',
        idempotency_key: idempotencyKey
      }, { transaction });

      return { balance: wallet.balance };
    });
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError' && idempotencyKey) {
      const replay = await findReplay(userId, idempotencyKey);
      if (replay) {
        return {
          balance: replay.wallet ? replay.wallet.balance : 0,
          replayed: true
        };
      }
    }
    throw err;
  }
}

async function purchase(userId, phone, amountInput, idempotencyKeyInput) {
  const amount = parseAndValidateAmount(amountInput);
  const idempotencyKey = normalizeIdempotencyKey(idempotencyKeyInput);

  try {
    return await sequelize.transaction(async (transaction) => {
      const wallet = await Wallet.findOne({
        where: { UserId: userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet || parseFloat(wallet.balance) < amount) {
        throw new Error('Insufficient balance');
      }

      wallet.balance = parseFloat(wallet.balance) - amount;
      await wallet.save({ transaction });

      const reference = generateReference();
      await Transaction.create({
        reference,
        userId,
        type: 'debit',
        amount,
        description: `Airtime ${phone}`,
        status: 'completed',
        payment_method: 'wallet',
        idempotency_key: idempotencyKey
      }, { transaction });

      return {
        message: 'Airtime purchased successfully',
        balance: wallet.balance
      };
    });
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError' && idempotencyKey) {
      const replay = await findReplay(userId, idempotencyKey);
      if (replay) {
        return {
          message: 'Airtime purchased successfully',
          balance: replay.wallet ? replay.wallet.balance : 0,
          replayed: true
        };
      }
    }
    throw err;
  }
}

async function payBill(userId, billType, billReference, amountInput, idempotencyKeyInput) {
  const amount = parseAndValidateAmount(amountInput);
  const idempotencyKey = normalizeIdempotencyKey(idempotencyKeyInput);

  try {
    return await sequelize.transaction(async (transaction) => {
      const wallet = await Wallet.findOne({
        where: { UserId: userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!wallet || parseFloat(wallet.balance) < amount) {
        throw new Error('Insufficient balance');
      }

      wallet.balance = parseFloat(wallet.balance) - amount;
      await wallet.save({ transaction });

      const reference = generateReference();
      await Transaction.create({
        reference,
        userId,
        type: 'bill',
        amount,
        description: `Bill payment: ${billType} (${billReference})`,
        status: 'completed',
        payment_method: 'wallet',
        idempotency_key: idempotencyKey
      }, { transaction });

      return {
        message: 'Bill paid successfully',
        balance: wallet.balance
      };
    });
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError' && idempotencyKey) {
      const replay = await findReplay(userId, idempotencyKey);
      if (replay) {
        return {
          message: 'Bill paid successfully',
          balance: replay.wallet ? replay.wallet.balance : 0,
          replayed: true
        };
      }
    }
    throw err;
  }
}

async function transfer(userId, payload, idempotencyKeyInput) {
  const amount = parseAndValidateAmount(payload.amount);
  const idempotencyKey = normalizeIdempotencyKey(idempotencyKeyInput);
  const receiverNumber = parseInt(payload.receiverNumber, 10);
  const accountNumber = parseInt(payload.accountNumber || payload.accountId, 10);
  const transferMode = receiverNumber ? 'mobile-money' : 'bank';
  const destinationId = receiverNumber || accountNumber;

  if (!destinationId || destinationId <= 0) {
    throw new Error('Receiver number or account number is required');
  }

  try {
    return await sequelize.transaction(async (transaction) => {
      const senderWallet = await Wallet.findOne({
        where: { UserId: userId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });

      if (!senderWallet || parseFloat(senderWallet.balance) < amount) {
        throw new Error('Insufficient balance');
      }

      const fee = amount * 0.01;
      const netAmount = amount - fee;

      senderWallet.balance = parseFloat(senderWallet.balance) - amount;
      await senderWallet.save({ transaction });

      const reference = generateReference();
      await Transaction.create({
        reference,
        userId,
        type: 'debit',
        amount,
        status: 'completed',
        description: transferMode === 'bank'
          ? `Bank transfer to ${payload.bankName || 'bank'} account #${destinationId}`
          : `Mobile money transfer to receiver #${destinationId}`,
        payment_method: transferMode,
        idempotency_key: idempotencyKey
      }, { transaction });

      return {
        message: 'Transfer successful',
        transferMode,
        receiverNumber: receiverNumber || null,
        accountNumber: accountNumber || null,
        fee,
        netAmount,
        balance: senderWallet.balance
      };
    });
  } catch (err) {
    if (err?.name === 'SequelizeUniqueConstraintError' && idempotencyKey) {
      const replay = await findReplay(userId, idempotencyKey);
      if (replay) {
        const existingDescription = replay.existingTx.description || '';
        const isBank = existingDescription.toLowerCase().includes('bank transfer');
        const parsedDestination = (existingDescription.match(/#(\d+)/) || [])[1] || null;
        const replayAmount = parseFloat(replay.existingTx.amount || 0);
        const fee = replayAmount * 0.01;

        return {
          message: 'Transfer successful',
          transferMode: isBank ? 'bank' : 'mobile-money',
          receiverNumber: isBank ? null : (parsedDestination ? Number(parsedDestination) : null),
          accountNumber: isBank ? (parsedDestination ? Number(parsedDestination) : null) : null,
          fee,
          netAmount: replayAmount - fee,
          balance: replay.wallet ? replay.wallet.balance : 0,
          replayed: true
        };
      }
    }
    throw err;
  }
}

async function transactions(userId) {
  const items = await Transaction.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']]
  });

  return { transactions: items };
}

module.exports = {
  getWallet,
  credit,
  purchase,
  payBill,
  transfer,
  transactions
};
