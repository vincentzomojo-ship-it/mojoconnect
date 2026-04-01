const crypto = require('crypto');

function generateReference() {
  return 'MOJO-' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

module.exports = generateReference;