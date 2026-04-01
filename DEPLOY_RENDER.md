# Render Deployment Quick Guide

## 1) Push project to GitHub
Run these from the project root:

```bash
git add .
git commit -m "Prepare production deployment and Paystack live flow"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## 2) Create Render web service
1. Open Render dashboard.
2. Click `New` -> `Web Service`.
3. Connect your GitHub repo.
4. Render will auto-detect `render.yaml`.

## 3) Build/start settings
Already preconfigured in `render.yaml`:
- Build Command: `npm install`
- Start Command: `npm start`

## 4) Set environment variables
Use `.env.production.example` as your checklist.

Required:
- DB_HOST, DB_NAME, DB_USER, DB_PASS
- JWT_SECRET, SESSION_SECRET, ADMIN_MASTER_PASSWORD
- PAYSTACK_SECRET, PAYSTACK_PUBLIC
- PAYSTACK_CALLBACK_URL
- CORS_ORIGIN

Defaults:
- NODE_ENV=production
- PORT=10000
- MIN_TOPUP_AMOUNT=4

## 5) Set Paystack live URLs after deploy
- Callback URL: `https://<your-render-domain>/dashboard.html`
- Webhook URL: `https://<your-render-domain>/webhook/paystack`
