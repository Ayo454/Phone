# Payment Integration Setup - $50 Application Fee

## ✅ Payment Flow Complete

Your application now requires applicants to pay **$50 USD** before submitting their job application. They can pay via:
- **Credit/Debit Card** (Stripe) - accepts all major cards globally
- **Bitcoin (BTC)** (Coinbase Commerce) - for cryptocurrency payments

## How the Flow Works

1. **User fills out application form** with:
   - Position, name, email, phone
   - Years of experience
   - Resume upload (PDF only, max 5MB)
   - Cover letter (optional)
   - Terms & conditions acceptance

2. **Resume is uploaded to `/uploads/`** (or Supabase if configured)
   - A pending application ID is created and stored in `pendingApplications.json`

3. **Payment modal appears** showing:
   - **"Amount: $50.00 USD or equivalent in BTC"**
   - Two payment buttons: "Pay with Card" and "Pay with Bitcoin"

4. **User selects payment method**:
   - **Card**: Redirected to Stripe Checkout
   - **Bitcoin**: Redirected to Coinbase Commerce

5. **After successful payment**, user is redirected back to verify payment

6. **Application is finalized** and stored in Supabase (if configured) or locally

## Payment Amounts

- **Stripe (Card)**: $50.00 USD = 5000 cents
- **Coinbase (BTC)**: 0.001 BTC (approximately $50 USD equivalent)

These can be adjusted in:
- `script.js` line ~345: `amount: 5000` for Stripe
- `script.js` line ~369: `amount: 0.001` for Coinbase

## Setup Requirements for Production

### 1. Stripe Setup (Card Payments)
- Create account at https://stripe.com
- Get your API keys from the dashboard
- Set environment variable on Render:
  ```
  STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
  ```
- (Optional) Set Success/Cancel URLs:
  ```
  APP_URL=https://your-domain.com
  ```

### 2. Coinbase Commerce Setup (BTC Payments)
- Create account at https://commerce.coinbase.com
- Get your API key from the settings
- Set environment variable on Render:
  ```
  COINBASE_API_KEY=xxxxxxxxxxxxxxx
  ```

### 3. Demo/Test Mode
- The server already runs in **demo mode** without API keys
- Stripe test mode: Uses `sk_test_demo`
- Coinbase demo mode: Returns fake charge IDs for testing
- Perfect for development and testing the flow locally

## File Locations

- **Payment endpoints**: `server.js` lines 223-410
- **Client payment UI**: `script.js` lines 260-400
- **Pending applications store**: `pendingApplications.json` (auto-created)
- **Payment modal HTML**: Dynamically created in `script.js`

## Key Endpoints

- `POST /api/preapply` - Upload resume and create pending application
- `POST /api/create-stripe-session` - Create Stripe Checkout session
- `POST /api/create-coinbase-charge` - Create Coinbase Commerce charge
- `GET /verify-payment?sessionId=X&pendingId=Y` - Verify Stripe payment
- `GET /verify-coinbase?chargeId=X&pendingId=Y` - Verify Coinbase payment

## Testing Locally

```powershell
# Install dependencies
npm install

# Start server
node server.js

# Server runs on http://localhost:3000
# Fill form, upload resume, choose payment method
# In demo mode, you'll see test payment pages
```

## Stripe Test Cards (for testing in demo mode)

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Expires: Any future date
- CVC: Any 3 digits

## Notes

- ✅ Resume is uploaded BEFORE payment (so it's not lost if user cancels)
- ✅ Pending applications stored temporarily in `pendingApplications.json`
- ✅ Payment verified server-side before finalizing application
- ✅ Fallback to local file storage if Supabase bucket missing
- ✅ Works globally - supports all countries with Stripe and Bitcoin

## Next Steps

1. Push to GitHub: `git push origin main`
2. Deploy to Render (should deploy successfully now)
3. Set `STRIPE_SECRET_KEY` and `COINBASE_API_KEY` in Render environment variables
4. Test payment flow on live site
5. Monitor applications in `pendingApplications.json` or Supabase

---

**Payment flow is complete and ready to deploy!** 🎉
