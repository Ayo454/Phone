# 🎬 Bank Transfer UI - Visual Demo Flow

## Screen 1: Login Screen
```
┌─────────────────────────────────┐
│  NATE WALLET                    │
│  Secure Bank Transfers          │
├─────────────────────────────────┤
│                                 │
│  Login to NATE Wallet          │
│                                 │
│  Account Number                │
│  [________________]            │
│                                 │
│  Password                      │
│  [________________]            │
│                                 │
│  [  LOGIN  ]                   │
│                                 │
│  Don't have an account?        │
│  [Register here]               │
│                                 │
│  [Create Test Account]         │
│                                 │
└─────────────────────────────────┘
```

---

## Screen 2: Dashboard
```
┌─────────────────────────────────┐
│ ☰  NATE WALLET                  │
│    Secure Bank Transfers   🔄   │
├─────────────────────────────────┤
│                                 │
│  Welcome back!                 │
│  John Doe                      │
│                                 │
│  ┌───────────────────────────┐ │
│  │    TOTAL BALANCE          │ │
│  │                           │ │
│  │        $10,000.00         │ │
│  │                           │ │
│  │ Personal Account | Approved
│  │                           │ │
│  └───────────────────────────┘ │
│                                 │
│  Quick Actions                  │
│  ┌──────────┐  ┌──────────┐   │
│  │   🔄     │  │  🏦      │   │
│  │ Internal │  │   Bank   │   │
│  │Transfer  │  │ Transfer │   │
│  └──────────┘  └──────────┘   │
│                                 │
└─────────────────────────────────┘

Sidebar Menu:
├─ 🏠 Dashboard
├─ 🔄 Transfer Money
├─ 🏦 Bank Transfer
├─ 📜 History
└─ 🚪 Logout
```

---

## Screen 3: Bank Transfer - Step 1
```
┌─────────────────────────────────┐
│ Bank Transfer                   │
├─────────────────────────────────┤
│                                 │
│ STEP 1: Select Country          │
│ ● 1 ● 2 ● 3 ● 4               │
│                                 │
│ Country *                       │
│ [▼ -- Select Country -- ]      │
│                                 │
│ Suggested:                      │
│ • United States                 │
│ • Nigeria                       │
│ • United Kingdom                │
│ • Canada                        │
│                                 │
└─────────────────────────────────┘
```

---

## Screen 4: Bank Transfer - Step 2
```
┌─────────────────────────────────┐
│ Bank Transfer                   │
├─────────────────────────────────┤
│                                 │
│ STEP 2: Select Bank             │
│ ● 1 ● 2 ○ 3 ○ 4               │
│                                 │
│ Bank *                          │
│ [▼ -- Select Bank -- ]         │
│                                 │
│ ┌─────────────────────────────┐│
│ │ ℹ️ Bank Code: ZENITHBANK    ││
│ │ 🌐 zenithbank.com          ││
│ └─────────────────────────────┘│
│                                 │
│ Available Banks:                │
│ • Zenith Bank                   │
│ • First Bank                    │
│ • GTBank                        │
│ • Access Bank                   │
│ • UBA                           │
│                                 │
└─────────────────────────────────┘
```

---

## Screen 5: Bank Transfer - Step 3
```
┌─────────────────────────────────┐
│ Bank Transfer                   │
├─────────────────────────────────┤
│                                 │
│ STEP 3: Bank Account Details    │
│ ○ 1 ○ 2 ● 3 ○ 4               │
│                                 │
│ Recipient Full Name *           │
│ [____________________]          │
│                                 │
│ Account Number *                │
│ [____________________]          │
│                                 │
│ Account Type *                  │
│ [▼ Select Account Type ▼]      │
│ • Savings Account               │
│ • Checking Account              │
│ • Business Account              │
│                                 │
└─────────────────────────────────┘
```

---

## Screen 6: Bank Transfer - Step 4
```
┌─────────────────────────────────┐
│ Bank Transfer                   │
├─────────────────────────────────┤
│                                 │
│ STEP 4: Transfer Amount         │
│ ○ 1 ○ 2 ○ 3 ● 4               │
│                                 │
│ Amount to Transfer *            │
│ [$__________]                  │
│                                 │
│ Purpose of Transfer *           │
│ [____________________]          │
│ [____________________]          │
│                                 │
│ SWIFT/IBAN (Optional)          │
│ [____________________]          │
│                                 │
│ ┌─────────────────────────────┐│
│ │  ✓ Transfer Summary         ││
│ │  Country: Nigeria           ││
│ │  Bank: Zenith Bank          ││
│ │  Recipient: John Doe        ││
│ │  Amount: $1,000.00 ★        ││
│ └─────────────────────────────┘│
│                                 │
│ [Confirm and Send]             │
│                                 │
└─────────────────────────────────┘
```

---

## Screen 7: Confirmation Modal
```
┌─────────────────────────────────────┐
│  Confirm Transfer              ✕   │
├─────────────────────────────────────┤
│                                     │
│ Are you sure you want to proceed    │
│ with this transfer?                 │
│                                     │
│ Recipient: John Doe                 │
│ Amount: $1,000.00                   │
│ Bank: Zenith Bank                   │
│                                     │
│  [Cancel]          [Confirm]        │
│                                     │
└─────────────────────────────────────┘
```

---

## Screen 8: Loading State
```
┌─────────────────────────────────┐
│                                 │
│          ⟳ ⟳ ⟳                 │
│     (spinning circle)            │
│                                 │
│   Processing bank transfer...   │
│                                 │
└─────────────────────────────────┘
```

---

## Screen 9: Success Alert
```
┌─────────────────────────────────┐
│                                 │
│ ✓ Transfer of $1,000.00 to     │
│   John Doe has been initiated   │
│   successfully!                 │
│                                 │
│ (Auto-dismisses in 5 seconds)   │
│                                 │
└─────────────────────────────────┘
```

---

## Screen 10: Back to Dashboard
```
┌─────────────────────────────────┐
│ ☰  NATE WALLET                  │
│    Secure Bank Transfers        │
├─────────────────────────────────┤
│                                 │
│  Welcome back!                 │
│  John Doe                      │
│                                 │
│  ┌───────────────────────────┐ │
│  │    TOTAL BALANCE          │ │
│  │                           │ │
│  │        $9,000.00          │ │
│  │  (Updated after transfer) │ │
│  └───────────────────────────┘ │
│                                 │
│  Quick Actions                  │
│  ┌──────────┐  ┌──────────┐   │
│  │   🔄     │  │  🏦      │   │
│  │ Internal │  │   Bank   │   │
│  │Transfer  │  │ Transfer │   │
│  └──────────┘  └──────────┘   │
│                                 │
└─────────────────────────────────┘
```

---

## Screen 11: Transaction History
```
┌─────────────────────────────────┐
│ Transaction History             │
├─────────────────────────────────┤
│                                 │
│ 🏦 Transfer to Zenith Bank     │
│    John Doe                     │
│    Nov 13, 2025 - 10:30 AM   │
│                          $1,000 │
│                                 │
│ 🏦 Transfer to GTBank          │
│    Jane Smith                   │
│    Nov 13, 2025 - 09:15 AM   │
│                          $500   │
│                                 │
│ 🔄 Internal Transfer           │
│    Account 5678                 │
│    Nov 12, 2025 - 03:45 PM   │
│                          $250   │
│                                 │
└─────────────────────────────────┘
```

---

## Form Validation Messages

### Error States
```
❌ Please fill in all required fields
❌ Invalid account number
❌ Amount must be greater than 0
❌ Invalid recipient account
❌ Please select a country
```

### Success States
```
✓ Account verified: John Doe
✓ Transfer queued successfully
✓ Transaction completed
```

---

## Mobile View Changes

```
┌──────────────┐
│ ☰            │ ← Menu opens sidebar
├──────────────┤
│ NATE WALLET  │
│ Bank Txfer   │
├──────────────┤
│ Single column│
│ layout       │
│              │
│ Full width   │
│ buttons      │
│              │
│ Touch-       │
│ friendly     │
│ spacing      │
│              │
└──────────────┘
```

---

## Color Scheme

| Element | Color | Usage |
|---------|-------|-------|
| Primary | #0066CC (Blue) | Headers, buttons |
| Secondary | #00D4FF (Cyan) | Accents, hover |
| Success | #4CAF50 (Green) | Alerts, status |
| Warning | #FFC107 (Yellow) | Warnings |
| Error | #F44336 (Red) | Errors |
| Background | #F5F7FA (Light) | Page bg |
| Card | #FFFFFF (White) | Card bg |
| Text | #1A1A1A (Dark) | Primary text |
| Muted | #666666 (Gray) | Secondary text |

---

## Animation Examples

### Button Hover
```
Before: Normal state
After:  Translatey(-3px) + Shadow glow
```

### Modal Appearance
```
Before: Hidden
After:  SlideUp animation (0.4s)
```

### Success Alert
```
Before: Hidden
During: SlideIn animation (0.3s)
After:  Auto-dismiss (5s)
```

### Loading Spinner
```
Rotation: 360° continuous
Speed: 1s per rotation
Effect: Smooth spin loop
```

---

## Accessibility Features

✅ **Keyboard Navigation**
- Tab through form fields
- Enter to submit
- Escape to close modal

✅ **Screen Reader Support**
- Proper heading hierarchy
- Button labels (aria-label)
- Form input labels
- Alert announcements

✅ **Color Contrast**
- Text: 4.5:1 ratio (WCAG AA)
- Buttons: 3:1 ratio
- Icons: Clear and visible

✅ **Touch Friendly**
- Buttons: 44px+ size
- Spacing: 12px+ gaps
- Text: 14px+ font

---

## Responsive Breakpoints

### Mobile (320px - 480px)
```
Single column layout
Full width form fields
Stacked buttons
Large touch targets
Sidebar overlay
```

### Tablet (481px - 768px)
```
Two column layout
Grid options
Medium spacing
Balanced layout
```

### Desktop (769px+)
```
Three column layout
Full features
Optimal spacing
Sidebar visible
```

---

## Empty States

### No Transactions
```
📋 No transactions yet

Try making your first transfer
[Bank Transfer]
```

### Login Screen
```
🔐 Login to NATE Wallet

Enter your credentials to continue
```

### Loading
```
⟳ Processing...

Please wait while we process
your transfer
```

---

*This visual demo shows the complete user flow for the bank transfer feature. All screens are responsive and work on mobile, tablet, and desktop devices.*
