# Paystack Integration Guide

## Link NATE Account (7971124663) with Paystack

This guide explains how to receive real incoming transfers from Paystack to your NATE account **7971124663 (National Alliance for Talent Exchange)**.

---

## Overview

Your NATE transfer app can integrate with **Paystack** to:
- Receive real bank transfers via Paystack
- Auto-record incoming transfers in your dashboard
- Show live transaction history

---

## Prerequisites

1. **Paystack Account** - Sign up at https://paystack.com (free sandbox available)
2. **Public URL** - Your demo app must be accessible from the internet (Paystack webhooks must reach you)
3. **Paystack API Keys** - Get Secret Key and Public Key from your dashboard

---

## Step 1: Deploy to a Public Server

Your local `localhost:3000` cannot receive webhooks. You need a public URL.

### Option A: Use Render (Free) - Recommended

1. Push your code to GitHub
2. Connect to Render: https://render.com
3. Create a new Web Service, select GitHub repo
4. Build command: `npm install`
5. Start command: `node server.js`
6. Your app will be live at `https://your-app.onrender.com`

### Option B: Use ngrok (Temporary Testing)

```bash
npm install -g ngrok
ngrok http 3000
# You'll get a public URL like https://abc123.ngrok.io
```

Then start your local server:
```bash
node server.js
```

---

## Step 2: Add Webhook Endpoint to Server

Add this endpoint to `server.js` (before the `server.listen()` call):

```javascript
// ==================== /api/paystack-webhook: Receive incoming transfers from Paystack ====================
app.post('/api/paystack-webhook', express.json(), (req, res) => {
    try {
        console.log('🔔 Paystack webhook received:', JSON.stringify(req.body, null, 2));
        
        const { event, data } = req.body;
        
        if (!event || !data) {
            return res.status(400).json({ success: false, message: 'Missing event or data' });
        }
        
        // Only process successful transfers
        if (event !== 'transfer.success' && event !== 'transfer.completed') {
            return res.json({ success: true, message: 'Event acknowledged but not processed' });
        }
        
        // Extract transfer details from Paystack payload
        const { reference, amount, recipient, reason, currency } = data;
        
        let recipientAccountNumber = '';
        let recipientName = '';
        let bank = 'Paystack';
        
        if (recipient) {
            if (recipient.details && recipient.details.account_number) {
                recipientAccountNumber = recipient.details.account_number;
            }
            if (recipient.name) {
                recipientName = recipient.name;
            }
        }
        
        if (!recipientAccountNumber) {
            return res.status(400).json({ success: false, message: 'Missing recipient account number' });
        }
        
        // Create transfer record
        const transferRecord = {
            id: require('uuid').v4(),
            type: 'paystack-webhook',
            sourceAccountNumber: 'paystack',
            recipientName: recipientName || 'Paystack Transfer',
            recipientAccountNumber: recipientAccountNumber,
            bank: bank,
            country: 'NG',
            amount: amount / 100 || 0, // Paystack sends in kobo
            purpose: reason || 'Paystack transfer',
            externalReference: reference || '',
            currency: currency || 'NGN',
            status: 'completed',
            timestamp: new Date().toISOString(),
            processedAt: new Date().toISOString()
        };
        
        // Save to transfers.json
        const DATA_DIR = path.join(__dirname, 'data');
        const transfersFile = path.join(DATA_DIR, 'transfers.json');
        let transfers = [];
        try {
            if (fs.existsSync(transfersFile)) {
                const fileContent = fs.readFileSync(transfersFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                transfers = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load transfers.json:', e.message);
        }
        
        transfers.push(transferRecord);
        fs.writeFileSync(transfersFile, JSON.stringify(transfers, null, 2));
        
        console.log(`✓ Paystack transfer recorded: ₦${transferRecord.amount} to ${recipientAccountNumber}`);
        
        return res.json({
            success: true,
            message: 'Transfer recorded successfully',
            transferId: transferRecord.id
        });
    } catch (err) {
        console.error('Error processing Paystack webhook:', err);
        return res.status(500).json({ success: false, message: 'Failed to process webhook', error: err.message });
    }
});
```

---

## Step 3: Link Account in Paystack Dashboard

1. Log into Paystack: https://dashboard.paystack.com
2. Go to **Settings** → **API Keys & Webhooks**
3. Copy your **Secret Key** (keep private)
4. Under **Webhook URL**, set it to:
   ```
   https://your-app-url.onrender.com/api/paystack-webhook
   ```
   Or if using ngrok:
   ```
   https://abc123.ngrok.io/api/paystack-webhook
   ```
5. Select events: `transfer.success` or `transfer.completed`
6. Save

---

## Step 4: Link Bank Account in Paystack

1. In Paystack dashboard, go to **Payouts** or **Recipients**
2. Add a new recipient:
   - **Account Number**: `7971124663` (your NATE account)
   - **Account Holder**: `National Alliance for Talent Exchange`
   - **Bank**: Select your bank (e.g., Zenith Bank, GTBank, etc.)
3. Verify the account (Paystack will confirm it)
4. Save

---

## Step 5: Test the Integration

### Via Paystack API (cURL/PowerShell)

```powershell
# Example: Send a test transfer via Paystack API
$headers = @{
    "Authorization" = "Bearer sk_test_YOUR_SECRET_KEY_HERE"
    "Content-Type" = "application/json"
}

$body = @{
    source = "balance"
    amount = 50000  # in kobo (500 naira)
    recipient = 123456  # Recipient ID from Paystack (get from adding recipient above)
    reason = "Test transfer to NATE account"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.paystack.co/transfer" -Method Post -Headers $headers -Body $body
```

### Check Transfer History

1. Open your transfer app: `https://your-app-url.onrender.com/transfer`
2. Log in to recipient account (7971124663) or dashboard
3. Go to Dashboard → History
4. You should see the incoming transfer from Paystack

---

## Webhook Payload Example

When Paystack sends a webhook, it looks like this:

```json
{
  "event": "transfer.success",
  "data": {
    "reference": "trf_abc123xyz",
    "amount": 50000,
    "currency": "NGN",
    "recipient": {
      "id": 123456,
      "name": "National Alliance for Talent Exchange",
      "type": "nuban",
      "details": {
        "account_number": "7971124663",
        "account_name": "National Alliance for Talent Exchange",
        "bank_code": "058"
      }
    },
    "reason": "Test transfer to NATE account",
    "status": "success"
  }
}
```

---

## Account Details Reference

| Field | Value |
|-------|-------|
| Account Number | 7971124663 |
| Account Holder | National Alliance for Talent Exchange |
| Bank | (Your chosen bank) |
| Currency | NGN (Nigerian Naira) |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Webhook not received | Check public URL is accessible; restart server; verify URL in Paystack dashboard |
| Transfer not in history | Check `data/transfers.json` exists; verify account number 7971124663 is correct |
| Auth error from Paystack | Verify Secret Key is correct; don't share it publicly |
| ngrok URL expires | ngrok free URLs expire after 2 hours; upgrade or redeploy to Render |
| "Invalid recipient" error | Ensure account 7971124663 is verified as recipient in Paystack dashboard |

---

## Security Notes

- **Never commit Secret Keys** to GitHub; use `.env` file or environment variables
- **Verify webhook signatures** in production (Paystack sends `x-paystack-signature` header)
- **Use HTTPS only** for webhook URLs
- **Whitelist Paystack IPs** if you have firewall rules

Example signature verification (optional but recommended):

```javascript
const crypto = require('crypto');

function verifyPaystackWebhook(req) {
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');
    return hash === req.headers['x-paystack-signature'];
}
```

---

## Production Checklist

- [ ] Move to public server (Render, Heroku, AWS, etc.)
- [ ] Add Secret Key to `.env` file
- [ ] Test webhook with Paystack sandbox
- [ ] Enable signature verification
- [ ] Set up monitoring/logging
- [ ] Add rate limiting to webhook
- [ ] Test incoming transfers show in app
- [ ] Document for your team
- [ ] Verify account 7971124663 as recipient in Paystack

---

## Quick Start (5 minutes)

If you have a Paystack account already:

1. **Deploy** app to Render or ngrok (public URL)
2. **Copy webhook endpoint** code above into `server.js`
3. **Set webhook URL** in Paystack: `https://your-app/api/paystack-webhook`
4. **Add recipient** account 7971124663 (National Alliance for Talent Exchange) in Paystack
5. **Test** by sending a transfer via Paystack sandbox
6. **Verify** transfer appears in your app's History

---

## Need Help?

- Paystack Docs: https://paystack.com/docs
- API Reference: https://paystack.com/docs/api/transfer/
- Webhook Events: https://paystack.com/docs/webhooks/

---

**Last Updated**: November 13, 2025
**Account Linked**: 7971124663 (National Alliance for Talent Exchange)
