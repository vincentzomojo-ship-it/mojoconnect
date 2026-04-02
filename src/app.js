const express = require('express');
const session = require('express-session');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const requestContext = require('./middleware/requestContext');
const sequelize = require('./config/database');

function validateSecurityEnv() {
  const allowInsecure = String(process.env.ALLOW_INSECURE_ENV || '').toLowerCase() === 'true';
  if (allowInsecure) {
    logger.warn('ALLOW_INSECURE_ENV is enabled. Security env checks are bypassed.');
    return;
  }

  const failures = [];
  const jwtSecret = process.env.JWT_SECRET || '';
  const sessionSecret = process.env.SESSION_SECRET || '';

  if (!jwtSecret || jwtSecret.length < 16 || ['secret', 'jwtsecret'].includes(jwtSecret.toLowerCase())) {
    failures.push('JWT_SECRET must be set and at least 16 characters (not a default value).');
  }

  if (!sessionSecret || sessionSecret.length < 16 || sessionSecret.toLowerCase() === 'keyboard cat') {
    failures.push("SESSION_SECRET must be set and at least 16 characters (not 'keyboard cat').");
  }

  if (failures.length) {
    logger.error('Security environment validation failed', { failures });
    logger.error('Set missing values in .env or use ALLOW_INSECURE_ENV=true for temporary local testing.');
    process.exit(1);
  }
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestContext);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
          fontSrc: ["'self'", 'data:', 'https://cdnjs.cloudflare.com', 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https://images.unsplash.com']
        }
      }
    })
  );

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5050')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'));
    }
  }));

  app.use(rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100
  }));

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false
  });

  const webhookRoutes = require('./routes/webhook');
  app.use('/webhook', webhookRoutes);

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  }));

  app.use(express.static(path.join(__dirname, '../public')));

  const authRoutes = require('./routes/auths');
  const userRoutes = require('./routes/user');
  const adminRoutes = require('./routes/admin');

  app.use('/auth', authLimiter, authRoutes);
  app.use('/user', userRoutes);
  app.use('/admin', adminRoutes);

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      time: new Date().toISOString(),
      requestId: req.requestId
    });
  });

  app.get('/ready', async (req, res) => {
    try {
      await sequelize.authenticate();
      res.json({
        status: 'ready',
        db: 'ok',
        requestId: req.requestId
      });
    } catch (err) {
      logger.error('Readiness check failed', {
        requestId: req.requestId,
        error: err.message
      });
      res.status(503).json({
        status: 'not_ready',
        db: 'down',
        requestId: req.requestId
      });
    }
  });

  app.get('/', (req, res) => {
    res.redirect('/login.html');
  });

  app.use((err, req, res, next) => {
    const status = err.message === 'Not allowed by CORS' ? 403 : 500;
    logger.error('Unhandled error', {
      requestId: req.requestId,
      status,
      method: req.method,
      path: req.originalUrl,
      error: err.message
    });
    res.status(status).json({ message: status === 403 ? 'Forbidden origin' : 'Internal server error' });
  });

  return app;
}

module.exports = {
  createApp,
  validateSecurityEnv
};
