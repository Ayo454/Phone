# 🎯 RENDER DEPLOYMENT - COMPLETE SETUP

## ✅ Your Project Status

**Good News!** Your project is **READY** for Render deployment. All files have dynamic URL detection.

---

## 📦 What's Configured

### JavaScript Files - Dynamic URL Detection ✅
- ✅ `transfer/transfer.js` - Auto-detects localhost vs Render
- ✅ `transfer/index.html` - Auto-detects localhost vs Render  
- ✅ `registration/registration.js` - Auto-detects localhost vs Render
- ✅ `admin/admin.js` - Auto-detects localhost vs Render
- ✅ `admin/bank-admin.js` - Auto-detects localhost vs Render
- ✅ `banks/nate.js` - Auto-detects localhost vs Render

**How they work:**
```javascript
const API_BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return window.location.origin; // Returns https://nate-app.onrender.com automatically!
})();
```

### Backend - Environment Variables ✅
- ✅ `server.js` - Uses `process.env.PORT` (Render sets this)
- ✅ `server.js` - Uses `process.env.APP_URL` (for Stripe/Coinbase redirects)
- ✅ `package.json` - All dependencies installed
- ✅ `render.yaml` - Updated with all environment variables

---

## 🚀 Deploy to Render (5 Steps)

### Step 1: Push to GitHub

```powershell
# Navigate to your NATE folder
cd "c:\Users\HP\OneDrive\Documents\ayomide web dev\NATE"

# Initialize Git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "NATE app ready for Render deployment"

# Create new GitHub repo at https://github.com/new
# Then:
git remote add origin https://github.com/YOUR_USERNAME/nate-transfer-app.git
git branch -M main
git push -u origin main
```

### Step 2: Connect to Render

1. Go to **https://render.com**
2. Click **Sign Up** or **Log In**
3. Click **New +** → **Web Service**
4. Select **Connect Repository**
5. Find and select `nate-transfer-app`
6. Click **Connect**

### Step 3: Configure Web Service

Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `nate-app` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Plan** | `Free` |
| **Region** | Choose closest to you |

### Step 4: Add Environment Variables

After clicking **Create Web Service**, you'll see the dashboard.

Click **Environment** tab, then **Add Environment Variable** for each:

**Copy-Paste These:**

```
PORT = 3000
NODE_ENV = production
APP_URL = https://nate-app.onrender.com
STRIPE_SECRET_KEY = sk_test_YOUR_KEY (get from Stripe dashboard)
SUPABASE_URL = https://trcbyqdfgnlaesixhorz.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
COINBASE_API_KEY = your-key (optional)
PAYSTACK_SECRET_KEY = sk_live_YOUR_KEY (if using Paystack)
```

### Step 5: Deploy

Click **Create Web Service** at the bottom.

Render will:
1. ✅ Clone your GitHub repo
2. ✅ Install dependencies (npm install)
3. ✅ Start your server (node server.js)
4. ✅ Assign a public URL

**You'll see:**
```
✅ Build Succeeded
🟢 Live at https://nate-app.onrender.com
```

---

## 🔗 Your Public URLs

After deployment, access your app:

| Feature | URL |
|---------|-----|
| **Home** | https://nate-app.onrender.com |
| **Transfer App** | https://nate-app.onrender.com/transfer |
| **Admin Panel** | https://nate-app.onrender.com/admin |
| **Bank Admin** | https://nate-app.onrender.com/admin/bank-admin.html |
| **Registration** | https://nate-app.onrender.com/registration |
| **Student Jobs** | https://nate-app.onrender.com/student-jobs |
| **Banks Info** | https://nate-app.onrender.com/banks/nate.html |
| **API Base** | https://nate-app.onrender.com/api |

---

## 🧪 Test Your Deployment

Once live at `https://nate-app.onrender.com`:

### Test 1: Transfer App
1. Open https://nate-app.onrender.com/transfer
2. Log in with test account
3. Try to send a transfer
4. Check API calls work (open Browser Console → Network tab)
5. ✅ Should see transfers working

### Test 2: Admin Panel
1. Open https://nate-app.onrender.com/admin
2. Check applications display
3. ✅ Should load data

### Test 3: API
1. Open https://nate-app.onrender.com/api/banks
2. ✅ Should return JSON data

---

## 🔐 Get Your API Keys

You need these keys for the environment variables:

### Stripe (Credit Card Payments)
1. Go to https://stripe.com
2. Sign up or log in
3. Click **Developers** → **API keys**
4. Copy **Secret Key** (starts with `sk_test_`)
5. Add to Render environment

### Supabase (Database - Already in render.yaml)
Already configured:
- URL: `https://trcbyqdfgnlaesixhorz.supabase.co`
- Key: Provided in render.yaml

### Coinbase Commerce (Crypto Payments - Optional)
1. Go to https://commerce.coinbase.com
2. Sign up
3. Get API key
4. Add to Render environment

### Paystack (Bank Transfers - For incoming transfers)
1. Go to https://paystack.com
2. Sign up
3. Click **Settings** → **API Keys**
4. Copy **Secret Key** (starts with `sk_live_`)
5. Add to Render environment

---

## 📊 Monitor Your App

### View Logs
1. Go to https://dashboard.render.com
2. Click your `nate-app` service
3. View **Logs** tab for real-time server output
4. Debug errors directly from here

### View Metrics
- Click **Metrics** tab
- See CPU, Memory, Network usage
- Check for errors and performance issues

### Restart Service
1. Click **Manual Deploy**
2. Select a commit
3. Click **Deploy**
4. Or just push to GitHub for auto-deploy

---

## 🎛️ Advanced Configuration

### Auto-Deploy from GitHub

Your `render.yaml` is set up for auto-deployment:
1. Push code to GitHub
2. Render automatically redeploys
3. No manual trigger needed

### Custom Domain

To use `nate-transfer.com` instead of `nate-app.onrender.com`:

1. Go to **Render Dashboard** → Your service
2. Click **Settings**
3. Under **Custom Domain**, add `nate-transfer.com`
4. Update your domain's DNS records (Render will show instructions)

### Environment-Specific URLs

Your app automatically uses:
- **Local**: `http://localhost:3000`
- **Render**: `https://nate-app.onrender.com`
- **Custom domain**: `https://nate-transfer.com`

No code changes needed!

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Build fails** | Check logs in Render dashboard → Logs tab |
| **"Cannot find module"** | Missing dependency in package.json; add it: `npm install package-name` |
| **Blank page** | Open browser console (F12) → check for JS errors |
| **API calls 404** | Wrong API_BASE_URL; check if auto-detection is working |
| **Env variables not loading** | Re-add them in Render dashboard → Environment tab |
| **Cold start (slow)** | Free tier sleeps after 15 min inactivity; upgrade to Pro for always-on |
| **Webhook not working** | Update Paystack webhook URL to `https://nate-app.onrender.com/api/paystack-webhook` |

---

## ✅ Pre-Deployment Checklist

- [ ] Code committed to GitHub
- [ ] GitHub repo created and pushed
- [ ] Render account created
- [ ] Web Service connected to GitHub
- [ ] Environment variables added:
  - [ ] PORT=3000
  - [ ] NODE_ENV=production
  - [ ] APP_URL=https://nate-app.onrender.com
  - [ ] STRIPE_SECRET_KEY=sk_test_...
  - [ ] SUPABASE_URL (provided)
  - [ ] SUPABASE_KEY (provided)
- [ ] Build succeeded
- [ ] Live URL working
- [ ] Transfer app loads
- [ ] Admin panel loads
- [ ] API endpoints respond
- [ ] Paystack webhook URL updated (if using)

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Support**: https://support.render.com
- **GitHub**: https://docs.github.com
- **This Project**: See RENDER_DEPLOYMENT_GUIDE.md

---

## 🎉 Next Steps After Deployment

1. **Enable Paystack**: Update webhook URL in Paystack dashboard
2. **Custom Domain**: Set up `nate-transfer.com` (optional)
3. **Upgrade Plan**: Switch from Free to Pro for always-on server
4. **Database**: Migrate from JSON files to PostgreSQL (optional)
5. **Monitoring**: Set up alerts for errors/downtime

---

## 🌐 Your Live App

**URL**: `https://nate-app.onrender.com`

All transfers, admin panel, registration, and APIs work automatically!

**Deployment Complete?** Share your URL: `https://nate-app.onrender.com`

---

**Last Updated**: November 13, 2025  
**Status**: ✅ Ready for Production  
**Account**: 7971124663 (National Alliance for Talent Exchange)
