const bcrypt = require('bcryptjs');
const sequelize = require('./config/database');
const User = require('./models/User');

(async () => {
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    await sequelize.sync({ force: true });
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    const hash = await bcrypt.hash('adminpass', 10);
    await User.create({ username: 'admin', email: 'admin@mojo.com', password: hash, role: 'admin' });
    console.log('Seed completed');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
