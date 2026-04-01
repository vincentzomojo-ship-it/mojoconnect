require('dotenv').config();
const logger = require('./utils/logger');
const sequelize = require('./config/database');
const runMigrations = require('./utils/runMigrations');
const { createApp, validateSecurityEnv } = require('./app');

validateSecurityEnv();

const app = createApp();

(async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');

    // Ensure base tables exist on fresh deployments before running migrations.
    await sequelize.sync({ force: false });

    await runMigrations();

    const PORT = process.env.PORT || 5050;

    const server = app.listen(PORT, () => logger.info('Server running', { port: Number(PORT) }));

    server.on('error', (listenErr) => {
      if (listenErr && listenErr.code === 'EADDRINUSE') {
        logger.error('Port already in use', { port: Number(PORT) });
        return;
      }
      logger.error('Server listen error', { error: listenErr.message });
    });

    const shutdown = async (signal) => {
      logger.info('Shutdown signal received', { signal });
      server.close(async () => {
        try {
          await sequelize.close();
          logger.info('HTTP server and DB connection closed');
          process.exit(0);
        } catch (err) {
          logger.error('Error while closing DB connection', { error: err.message });
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    logger.error('Unable to start server', { error: err.message });
  }
})();
