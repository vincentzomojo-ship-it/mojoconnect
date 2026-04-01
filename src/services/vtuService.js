// This service encapsulates interactions with the VTU/airtime provider.
// For now it returns simulated vouchers but the methods are easily
// replaceable with real HTTP calls when an API is chosen.

const axios = require('axios');

// configuration can switch between mock and real mode
const useMock = process.env.VTU_MOCK === 'true' || !process.env.VTU_API_URL;

async function purchaseAirtime(phone, amount) {
  if (useMock) {
    // simulate network delay
    await new Promise((r) => setTimeout(r, 300));
    return { success: true, voucher: 'VTU-' + Math.random().toString(36).substr(2, 9).toUpperCase() };
  }

  // Example of making a real request (provider details will vary)
  try {
    const response = await axios.post(process.env.VTU_API_URL + '/purchase', {
      phone,
      amount,
      apiKey: process.env.VTU_API_KEY,
    });
    return response.data; // provider should return { success, voucher }
  } catch (err) {
    console.error('VTU API error', err.response ? err.response.data : err.message);
    return { success: false, error: 'VTU provider error' };
  }
}

module.exports = { purchaseAirtime };
