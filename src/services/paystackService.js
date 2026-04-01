const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecretKey() {
  const key = process.env.PAYSTACK_SECRET || '';
  if (!key) {
    throw new Error('PAYSTACK_SECRET is not configured');
  }
  return key;
}

async function initializeTransaction(payload) {
  const secret = getSecretKey();
  const res = await axios.post(
    `${PAYSTACK_BASE_URL}/transaction/initialize`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }
  );
  return res.data;
}

async function verifyTransaction(reference) {
  const secret = getSecretKey();
  const res = await axios.get(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`
      },
      timeout: 15000
    }
  );
  return res.data;
}

module.exports = {
  initializeTransaction,
  verifyTransaction
};
