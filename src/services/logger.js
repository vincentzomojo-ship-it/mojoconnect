const fs = require("fs");

function logError(error) {
  const message = `
  ===== ERROR =====
  Time: ${new Date()}
  Message: ${error.message}
  Stack: ${error.stack}
  ==================
  `;

  fs.appendFileSync("error.log", message);
}

module.exports = { logError };