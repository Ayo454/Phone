# 📋 RENDER DEPLOYMENT - QUICK REFERENCE

## 🎯 Your App URLs (After Deployment)

```
Main:        https://nate-app.onrender.com
Transfer:    https://nate-app.onrender.com/transfer
Admin:       https://nate-app.onrender.com/admin
Bank Admin:  https://nate-app.onrender.com/admin/bank-admin.html
Register:    https://nate-app.onrender.com/registration
Jobs:        https://nate-app.onrender.com/student-jobs
Banks:       https://nate-app.onrender.com/banks/nate.html
API:         https://nate-app.onrender.com/api
```

---

## ⚡ 3-Step Quick Deploy

### 1️⃣ GitHub
```powershell
git init
git add .
git commit -m "Deploy to Render"
git remote add origin https://github.com/YOUR_USERNAME/nate-transfer-app.git
git push -u origin main
```

### 2️⃣ Render
- Go to https://render.com
- Click **New Web Service**
- Connect GitHub repo `nate-transfer-app`
- Use these settings:
  - Name: `nate-app`
  - Build: `npm install`
  - Start: `node server.js`

### 3️⃣ Environment Variables
Add these in Render dashboard:
```
PORT = 3000
NODE_ENV = production
APP_URL = https://nate-app.onrender.com
STRIPE_SECRET_KEY = sk_test_YOUR_KEY
SUPABASE_URL = https://trcbyqdfgnlaesixhorz.supabase.co
SUPABASE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
COINBASE_API_KEY = (optional)
PAYSTACK_SECRET_KEY = (if using Paystack)
```

---

## ✅ All Files Ready (No Changes Needed!)

| File | Status | Reason |
|------|--------|--------|
| transfer/transfer.js | ✅ Ready | Auto-detects localhost vs Render |
| transfer/index.html | ✅ Ready | Auto-detects localhost vs Render |
| registration/registration.js | ✅ Ready | Auto-detects localhost vs Render |
| admin/admin.js | ✅ Ready | Auto-detects localhost vs Render |
| admin/bank-admin.js | ✅ Ready | Auto-detects localhost vs Render |
| banks/nate.js | ✅ Ready | Auto-detects localhost vs Render |
| server.js | ✅ Ready | Uses process.env.PORT & APP_URL |
| package.json | ✅ Ready | All dependencies included |
| render.yaml | ✅ Updated | Has APP_URL environment variable |

---

## 🔑 How URL Auto-Detection Works

```javascript
// All your files use this pattern:
const API_BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return window.location.origin; // On Render: https://nate-app.onrender.com
})();
```

✅ **Works on:**
- `localhost:3000` (development)
- `https://nate-app.onrender.com` (Render)
- `https://nate-transfer.com` (custom domain)

**No code changes needed!**

---

## 📊 Monitoring

**View Logs**: https://dashboard.render.com → Your service → Logs tab

**Common Log Entries:**
```
✅ npm install succeeded
✅ node server.js started
📨 Server running on port 3000
🟢 App live at https://nate-app.onrender.com
```

---

## 🔗 Important URLs

| Resource | Link |
|----------|------|
| Render Dashboard | https://dashboard.render.com |
| GitHub New Repo | https://github.com/new |
| Render Docs | https://render.com/docs |
| Your App (live) | https://nate-app.onrender.com |
| Transfer App | https://nate-app.onrender.com/transfer |

---

## 🚀 Deploy Time: ~2 minutes

1. Push to GitHub (1 min)
2. Connect to Render (30 sec)
3. Add env variables (30 sec)
4. Wait for build (varies)
5. ✅ Live!

---

## 📌 Account Details

**NATE Account**: 7971124663  
**Organization**: National Alliance for Talent Exchange  
**Region**: Nigeria (NGN)  
**Bank**: (Your chosen bank)

---

## 💡 After Deployment

1. Update Paystack webhook: `https://nate-app.onrender.com/api/paystack-webhook`
2. Test all modules work
3. Upgrade to Pro plan (optional, for always-on server)
4. Add custom domain (optional)

---

## ❌ Common Mistakes (AVOID!)

- ❌ Don't hardcode `localhost:3000` in production code
- ❌ Don't commit API keys to GitHub
- ❌ Don't use render.yaml without APP_URL
- ❌ Don't forget to add env variables
- ❌ Don't use free tier for production (15-min inactivity sleep)

**Your setup avoids all of these!** ✅

---

## 🎉 Success = You See

```
✅ https://nate-app.onrender.com loading
✅ /transfer page accessible
✅ /admin dashboard working
✅ API endpoints responding
✅ Transfers working end-to-end
```

---

**Ready?** Start with Step 1 above!

**Questions?** See RENDER_COMPLETE_SETUP.md for detailed guide.

---

**Last Updated**: November 13, 2025  
**Status**: ✅ All systems ready for Render deployment
