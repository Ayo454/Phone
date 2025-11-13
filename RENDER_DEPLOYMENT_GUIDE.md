# Render Deployment Guide - NATE Application

Deploy your entire NATE application to Render for free public hosting.

---

## 📋 Overview

Your NATE application has multiple web modules:
- **Main Server** (server.js) - Backend API & static files
- **Transfer App** (`/transfer`) - Send/receive money transfers
- **Admin Panel** (`/admin`) - Bank admin dashboard
- **Registration** (`/registration`) - User registration
- **Student Jobs** (`/student-jobs`) - Career portal
- **Banks** (`/banks`) - Bank information

All are served from one Node.js server deployed on Render.

---

## 🚀 Quick Start (5 minutes)

### Step 1: Push to GitHub

1. Create a new GitHub repo (e.g., `nate-transfer-app`)
2. Push your NATE folder to GitHub:

```powershell
# In your NATE directory
git init
git add .
git commit -m "Initial NATE deployment"
git remote add origin https://github.com/YOUR_USERNAME/nate-transfer-app.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Render

1. Go to https://render.com
2. Sign up (free) or log in
3. Click **New +** → **Web Service**
4. Connect GitHub account
5. Select `nate-transfer-app` repository

### Step 3: Configure Web Service

Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | nate-app |
| **Environment** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | Free |
| **Region** | (Your closest region) |

### Step 4: Add Environment Variables

Click **Advanced** → **Add Environment Variable**

Add each of these:

```
PORT = 3000
NODE_ENV = production
STRIPE_SECRET_KEY = sk_test_YOUR_KEY (or get from Stripe)
SUPABASE_URL = https://trcbyqdfgnlaesixhorz.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
COINBASE_API_KEY = your-coinbase-key (optional)
```

### Step 5: Deploy

Click **Create Web Service**

Render will:
1. Build your app (install npm packages)
2. Start your server
3. Assign a public URL like `https://nate-app.onrender.com`

---

## 🔗 Your Public URLs (After Deployment)

| Module | URL |
|--------|-----|
| **Home** | `https://nate-app.onrender.com` |
| **Transfer App** | `https://nate-app.onrender.com/transfer` |
| **Admin Panel** | `https://nate-app.onrender.com/admin` |
| **Registration** | `https://nate-app.onrender.com/registration` |
| **Student Jobs** | `https://nate-app.onrender.com/student-jobs` |
| **Banks Info** | `https://nate-app.onrender.com/banks` |
| **API Base** | `https://nate-app.onrender.com/api` |

---

## 🔑 Environment Variables (Full List)

### Required for Deployment

```env
PORT=3000
NODE_ENV=production
```

### Payment Providers

```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY
COINBASE_API_KEY=your-coinbase-api-key
```

### Supabase (Database)

```env
SUPABASE_URL=https://trcbyqdfgnlaesixhorz.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Paystack Webhook (For incoming transfers)

```env
PAYSTACK_SECRET_KEY=sk_live_YOUR_PAYSTACK_SECRET
PAYSTACK_PUBLIC_KEY=pk_live_YOUR_PAYSTACK_PUBLIC
```

### Email (Optional - Nodemailer)

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_SERVICE=gmail
```

---

## 📝 Configuration Files

### render.yaml (Existing)

Your `render.yaml` is already set up:

```yaml
services:
  - type: web
    name: nate-app
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: PORT
        value: 3000
      - key: NODE_ENV
        value: production
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: SUPABASE_URL
        value: https://trcbyqdfgnlaesixhorz.supabase.co
      - key: SUPABASE_KEY
        sync: false
      - key: COINBASE_API_KEY
        sync: false
```

**This file is already configured for Render!** Render reads this automatically.

### package.json (Existing)

Your `package.json` is ready:

```json
{
  "name": "phone-root",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "engines": {
    "node": ">=14.0.0"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "stripe": "^14.0.0",
    "coinbase-commerce": "^1.0.5",
    "uuid": "^9.0.1",
    "nodemailer": "^6.9.4",
    "@supabase/supabase-js": "^2.81.0"
  }
}
```

---

## 🌐 Update All Frontend Files to Use Public URLs

After deployment, update your frontend code to use the Render URL instead of `localhost:3000`.

### Files to Update:

#### 1. `transfer/transfer.js`

Find this line:

```javascript
const API_BASE_URL = 'http://localhost:3000' || 'http://127.0.0.1:3000';
```

Change to:

```javascript
const API_BASE_URL = 'https://nate-app.onrender.com';
```

#### 2. `admin/bank-admin.js`

Find:

```javascript
const API_BASE_URL = 'http://localhost:3000' || 'http://127.0.0.1:3000';
```

Change to:

```javascript
const API_BASE_URL = 'https://nate-app.onrender.com';
```

#### 3. `registration/registration.js`

Find:

```javascript
const API_BASE_URL = 'http://localhost:3000';
```

Change to:

```javascript
const API_BASE_URL = 'https://nate-app.onrender.com';
```

#### 4. `student-jobs/` (if it has API calls)

Update any API calls to use Render URL.

#### 5. `banks/nate.js`

Find:

```javascript
const API_BASE_URL = 'http://localhost:3000';
```

Change to:

```javascript
const API_BASE_URL = 'https://nate-app.onrender.com';
```

---

## 🧪 Test Your Deployment

After deployment is live:

1. **Visit Home**: https://nate-app.onrender.com
2. **Visit Transfer**: https://nate-app.onrender.com/transfer
   - Login with a test account
   - Verify transfers work
3. **Visit Admin**: https://nate-app.onrender.com/admin
   - Check if admin functions work
4. **Check API**: https://nate-app.onrender.com/api/banks
   - Should return bank data

---

## 🔧 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Build fails** | Check `package.json` has all dependencies; ensure no syntax errors |
| **"Port already in use"** | Render assigns ports dynamically; use `process.env.PORT` in server.js (already done) |
| **Blank page** | Check browser console for JS errors; verify static files are in same directory |
| **API calls fail** | Update frontend URLs from localhost to Render URL |
| **Webhook not working** | Update Paystack/webhook URLs to `https://nate-app.onrender.com/api/paystack-webhook` |
| **Env variables not loading** | Go to Render dashboard → Settings → Environment; re-add them |
| **Cold start (slow first request)** | Free tier sleeps after 15 min inactivity; upgrade to Pro if needed |

---

## 📊 Render Dashboard

Once deployed, you can manage your app:

**Render Dashboard URL**: https://dashboard.render.com

From there you can:
- View **Logs** (real-time server output)
- **Restart** the service
- Modify **Environment Variables**
- Check **Metrics** (CPU, memory, bandwidth)
- **Redeploy** from latest GitHub commit
- Change **Plan** (free to paid)

---

## 🚀 Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] GitHub repo connected to Render
- [ ] Web Service created on Render
- [ ] Environment variables added
- [ ] Build & deployment successful (check Render logs)
- [ ] Website accessible at `https://nate-app.onrender.com`
- [ ] All frontend files updated with Render URL
- [ ] Transfer app API calls working
- [ ] Admin panel accessible
- [ ] Webhook URL updated in Paystack (if using)
- [ ] Test incoming transfer flow

---

## 💡 Pro Tips

### 1. Keep Git Updated

To redeploy after code changes:

```powershell
git add .
git commit -m "Update API endpoints"
git push origin main
# Render automatically redeploys!
```

### 2. View Live Logs

In Render dashboard:
- Click your service
- View **Logs** tab to see real-time console output
- Debug errors directly

### 3. Use Render Postgres (Premium)

For better data persistence:
- Go to Render dashboard
- Create **PostgreSQL** database
- Connect to your app via `DATABASE_URL`
- Migrate from JSON files

### 4. Set Up Auto-Redeploy

In Render service settings:
- Enable "Auto-deploy" for GitHub commits
- Every push to `main` branch redeploys automatically

### 5. Custom Domain

To use your own domain (e.g., `nate-transfer.com`):
- In Render dashboard → Settings → Custom Domain
- Point your domain's DNS to Render

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Support**: https://render.com/support
- **GitHub Help**: https://docs.github.com

---

## 🎯 Your Deployment URL

**After following all steps, your live URL will be:**

```
https://nate-app.onrender.com
```

All modules accessible:
- `/transfer` - Transfer app
- `/admin` - Admin panel
- `/registration` - Registration
- `/student-jobs` - Career portal
- `/banks` - Bank info
- `/api/*` - API endpoints

---

**Last Updated**: November 13, 2025
**Status**: Ready for production deployment
**Support Account**: 7971124663 (National Alliance for Talent Exchange)
