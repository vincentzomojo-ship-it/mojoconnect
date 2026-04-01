# MOJO CONNECT

Secure MVP web-based VTU platform built with Node.js, Express, and MySQL.

## Features

- User registration and login (JWT auth)
- Wallet system with crediting and idempotent money actions
- Transaction tracking
- Simulated airtime purchase with voucher codes
- Admin dashboard for users and transactions
- Customer support tickets workflow
- Security best practices (Helmet, rate limiting, CORS)

## Setup

1. Clone repository or navigate to project folder.
2. Run `npm install` to install dependencies.
3. Create a MySQL database (`mojo_connect`).
4. Configure `.env` with database credentials and secrets.
5. Run `npm run dev` to start the server.

## Notes

This project uses Sequelize and migration scripts.

## Deployment

- Render config is included in `render.yaml`.
- See `DEPLOY_RENDER.md` for deployment steps.
