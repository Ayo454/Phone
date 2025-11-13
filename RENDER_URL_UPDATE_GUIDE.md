# 🚀 RENDER DEPLOYMENT - URL UPDATE SCRIPT

## Files Identified for Update

Your project has these files with `localhost:3000` hardcoded:

1. ✅ **transfer/transfer.js** - Dynamic URL detection (ready)
2. ✅ **transfer/index.html** - Dynamic URL detection (ready)
3. ✅ **registration/registration.js** - Dynamic URL detection (ready)
4. ⚠️ **server.js** - Needs APP_URL environment variable
5. ⚠️ Other documentation files (WHATS_DELIVERED.md, etc.)

---

## Status: READY FOR AUTO-DETECTION ✅

Good news! Your JavaScript files **already use dynamic URL detection**:

```javascript
const API_BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return window.location.origin; // Uses current domain!
})();
```

This means:
- **Local**: Uses `http://localhost:3000`
- **Render**: Uses `https://nate-app.onrender.com` automatically
- **Custom domain**: Works without changes

---

## What You Need to Do

### Step 1: Fix server.js for Stripe/Coinbase Redirects

Update `server.js` to use environment variable for redirect URLs:

**Find (lines ~1531-1532 in server.js):**
```javascript
const successUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-payment?sessionId={CHECKOUT_SESSION_ID}&pendingId=${pendingId}`;
const cancelUrl = `${process.env.APP_URL || 'http://localhost:3000'}/?payment=cancelled`;
```

**Already has fallback!** ✅ Just add `APP_URL` to Render environment.

### Step 2: Add APP_URL to render.yaml

File: `render.yaml`

Add this environment variable:

```yaml
      - key: APP_URL
        value: https://nate-app.onrender.com
```

Complete render.yaml should look like:

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
      - key: APP_URL
        value: https://nate-app.onrender.com
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: SUPABASE_URL
        value: https://trcbyqdfgnlaesixhorz.supabase.co
      - key: SUPABASE_KEY
        sync: false
      - key: COINBASE_API_KEY
        sync: false
      - key: PAYSTACK_SECRET_KEY
        sync: false
```

---

## Files Ready WITHOUT Changes

✅ **transfer/transfer.js** - Auto-detects environment  
✅ **transfer/index.html** - Auto-detects environment  
✅ **registration/registration.js** - Auto-detects environment  

These files work on both localhost AND Render!

---

## Quick Checklist Before Deploying

- [ ] Push code to GitHub
- [ ] Connect repo to Render
- [ ] Create Web Service
- [ ] Add environment variables (STRIPE_SECRET_KEY, etc.)
- [ ] Ensure `render.yaml` has APP_URL set
- [ ] Deploy
- [ ] Test at `https://nate-app.onrender.com`

---

## Your Deployment URL

```
https://nate-app.onrender.com
```

All endpoints will work automatically!

**Last Updated**: November 13, 2025
