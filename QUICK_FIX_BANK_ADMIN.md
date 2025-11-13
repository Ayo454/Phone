# ⚡ QUICK FIX - Bank Admin Not Loading on Render

## The Problem
Bank Admin shows: `Failed to fetch` / `ERR_CONNECTION_REFUSED`

## The Fix (3 Steps)

### Step 1: Update GitHub
```powershell
cd "c:\Users\HP\OneDrive\Documents\ayomide web dev\NATE"
git add server.js
git commit -m "Fix: Allow Render access - listen on 0.0.0.0"
git push origin main
```

### Step 2: Redeploy on Render
1. Go to: https://dashboard.render.com
2. Select: `nate-app`
3. Click: **Manual Deploy**
4. Wait: 2-3 minutes

### Step 3: Test
Visit: https://nate-app.onrender.com/admin/bank-admin.html

✅ **Done!** Bank Admin should now work!

---

## What Changed
```
OLD: app.listen(3000, '127.0.0.1', ...)  ❌ Render can't access
NEW: app.listen(process.env.PORT || 3000, '0.0.0.0', ...)  ✅ Render can access
```

---

## Verify
Open browser console (F12) and look for:
```
✅ GET /api/applications (status: 200)
```

If you see 200, it's working! 🎉

---

**That's it! Your Bank Admin will now work on Render!**
