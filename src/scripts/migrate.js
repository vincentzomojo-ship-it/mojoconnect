require('dotenv').config();
const sequelize = require('../config/database');
const runMigrations = require('../utils/runMigrations');

(async () => {
  try {
    await sequelize.authenticate();
    await runMigrations();
    console.log('Migrations completed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
