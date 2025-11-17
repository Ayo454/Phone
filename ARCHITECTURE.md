# 🏗️ NATE Bank Transfer System Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         WEB BROWSER                                  │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │              TRANSFER PAGE (/transfer)                        │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  Step 1: Account Verification                           │ │  │
│  │  │  ┌─────────────────────────────────────────────────────┐ │ │  │
│  │  │  │ Select Bank: [FIRSTBANK v]                         │ │ │  │
│  │  │  │ Account Number: [1234567890]                       │ │ │  │
│  │  │  │ Password: [***********]                            │ │ │  │
│  │  │  │ [✓ Verify Account Button]                          │ │ │  │
│  │  │  └─────────────────────────────────────────────────────┘ │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  Step 2: Transfer Details (Hidden until verified)       │ │  │
│  │  │  ┌─────────────────────────────────────────────────────┐ │ │  │
│  │  │  │ Status: ✓ VERIFIED                                 │ │ │  │
│  │  │  │ Balance: $5,000                                    │ │ │  │
│  │  │  │                                                     │ │ │  │
│  │  │  │ NATE Account: [NATE-ACC-123]                       │ │ │  │
│  │  │  │ Amount: [$______]                                  │ │ │  │
│  │  │  │ Reason: [__________________]                       │ │ │  │
│  │  │  │ ☑ Accept Terms                                     │ │ │  │
│  │  │  │ [💰 Proceed Button]                                │ │ │  │
│  │  │  └─────────────────────────────────────────────────────┘ │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  Step 3: Success/Error (Conditional)                    │ │  │
│  │  │  ┌─────────────────────────────────────────────────────┐ │ │  │
│  │  │  │ ✅ Transfer Successful!                            │ │ │  │
│  │  │  │ Transaction ID: TXN-550e8400-e29b-41d4             │ │ │  │
│  │  │  │ Amount: $500                                       │ │ │  │
│  │  │  │ Status: PENDING                                    │ │ │  │
│  │  │  │ [➕ New Transfer Button]                            │ │ │  │
│  │  │  └─────────────────────────────────────────────────────┘ │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                │ HTTP/AJAX Requests
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS SERVER                               │
│                    (Node.js, port 3000)                              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  MIDDLEWARE                                                  │   │
│  │  ├─ CORS (allow requests from browser)                      │   │
│  │  ├─ JSON parser (parse incoming data)                       │   │
│  │  └─ Static file server (serve HTML/CSS/JS)                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │  API ENDPOINTS                                               │ │
│  │                                                              │ │
│  │  1. POST /api/validate-account                              │ │
│  │     ├─ Receives: bankCode, accountNumber, password          │ │
│  │     ├─ Checks: Mock bank database                           │ │
│  │     └─ Returns: Account valid? Balance?                     │ │
│  │                                                              │ │
│  │  2. POST /api/check-account-status                          │ │
│  │     ├─ Receives: accountNumber                              │ │
│  │     ├─ Checks: pendingApplications.json                     │ │
│  │     └─ Returns: Is approved?                                │ │
│  │                                                              │ │
│  │  3. POST /api/inter-bank-transfer                           │ │
│  │     ├─ Receives: All transfer details                       │ │
│  │     ├─ Validates: Amount, balance, approval                 │ │
│  │     ├─ Generates: Transaction ID                            │ │
│  │     ├─ Saves: To transfers.json                             │ │
│  │     └─ Returns: Success confirmation                        │ │
│  │                                                              │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────┬───────────────────────────────────────────────┘
                       │
                       │ File I/O
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
    ┌──────────────┐          ┌──────────────────┐
    │  In-Memory   │          │   File System    │
    │  Mock Bank   │          │                  │
    │  Accounts    │          │  data/           │
    │              │          │  ├─ transfers    │
    │ FIRSTBANK    │          │  │  .json        │
    │ ZENITHBANK   │          │  ├─ pending      │
    │ GTBANK       │          │  │  Applications │
    │ ACCESSBANK   │          │  │  .json        │
    └──────────────┘          │  └─ registra     │
                               │     tions.json  │
                               └──────────────────┘
```

---

## Data Flow Diagram

```
START: User visits /transfer page
  │
  ├─ Browser loads HTML/CSS/JS
  │
  └─► User fills verification form
        │
        ├─ Selects Bank (dropdown)
        ├─ Enters Account Number
        └─ Enters Password
          │
          ▼
      CLICK: "Verify Account"
          │
          ├─► fetch POST /api/validate-account
          │   │
          │   ├─ Check if bank exists in mockBankAccounts
          │   ├─ Check if account exists in bank
          │   ├─ Check if password matches
          │   │
          │   └─ Return: { success, valid, balance }
          │
          ├─ IF not valid
          │  └─► Show error message
          │      │
          │      └─► GOTO: User retries
          │
          └─ IF valid
             │
             ├─► fetch POST /api/check-account-status
             │   │
             │   ├─ Load pendingApplications.json
             │   ├─ Find NATE account
             │   ├─ Check if status == "approved"
             │   │
             │   └─ Return: { success, status, nateAccountNumber }
             │
             ├─ IF not approved
             │  └─► Show error message
             │      │
             │      └─► GOTO: User retries
             │
             └─ IF approved
                │
                ├─► Show transfer form
                │   │
                │   ├─ Pre-fill NATE account
                │   ├─ Show account status
                │   └─ Show available balance
                │
                └─► User fills transfer details
                      │
                      ├─ Enters amount
                      ├─ Enters reason
                      └─ Checks terms
                        │
                        ▼
                    CLICK: "Proceed"
                        │
                        ├─ Validate on client side:
                        │  ├─ Amount > 0?
                        │  ├─ Amount <= balance?
                        │  ├─ All fields filled?
                        │  └─ Terms accepted?
                        │
                        ├─ IF validation fails
                        │  └─► Show error
                        │
                        └─ IF validation passes
                           │
                           ├─► fetch POST /api/inter-bank-transfer
                           │   │
                           │   ├─ Validate server side
                           │   │  ├─ Bank code valid?
                           │   │  ├─ Account exists?
                           │   │  └─ Amount valid?
                           │   │
                           │   ├─ Generate Transaction ID (UUID)
                           │   │
                           │   ├─ Create transfer record:
                           │   │  ├─ sourceBank
                           │   │  ├─ sourceAccountNumber
                           │   │  ├─ destinationAccountNumber
                           │   │  ├─ amount
                           │   │  ├─ reason
                           │   │  ├─ status: "completed"
                           │   │  ├─ timestamp
                           │   │  └─ processedAt
                           │   │
                           │   ├─ Load transfers.json
                           │   ├─ Append new transfer
                           │   └─ Save transfers.json
                           │
                           ├─ Return: { success, transactionId, amount }
                           │
                           └─► Display success page
                               │
                               ├─ Show ✅ Success message
                               ├─ Show Transaction ID
                               ├─ Show Amount transferred
                               └─ Show "New Transfer" button
                               
                               END
```

---

## Component Relationship Diagram

```
                            SERVER
                         (server.js)
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
          Routes       Endpoints       Data Layer
            │              │              │
    ┌───────┼───────┐  ┌────┼────┐  ┌────┼────┐
    │       │       │  │    │    │  │    │    │
   GET    GET    POST POST  POST FILE FILE FILE
   /    /trans  /api /api  /api JSON JSON JSON
        fer    /val /che  /int
                idat ck  erbk
                e    sta
                    tus
```

---

## Process Validation Flowchart

```
                        INPUT: Transfer Request
                                 │
                        ┌────────┴────────┐
                        │                 │
                    CLIENT          SERVER
                    SIDE            SIDE
                        │                 │
                  ┌─────▼─────┐   ┌──────▼──────┐
                  │ Validate  │   │  Validate   │
                  │ - Amount  │   │  - Bank OK? │
                  │ - Balance │   │  - Account? │
                  │ - Fields  │   │  - Approved?│
                  │ - Terms   │   │  - Balance? │
                  └─────┬─────┘   └──────┬──────┘
                        │                │
                ┌───────┴────────┬──────┴────────┐
               YES              NO            NO
                │                │             │
                │                ▼             ▼
                │           User Error  System Error
                │                │             │
                ▼                 └─────┬──────┘
            PROCEED                     │
                │                       │
                ├──► Generate ID        │
                ├──► Create Record      │
                ├──► Save File          │
                │                       │
                └──► Return Success ◄───┴── Return Error
                     or Error Message
```

---

## User Journey Map

```
AWARENESS → VERIFICATION → AUTHORIZATION → EXECUTION → CONFIRMATION

    │             │              │              │            │
    ▼             ▼              ▼              ▼            ▼

User finds    User enters   System checks    Transfer is    Success!
transfer      bank account  NATE approval    processed &    Show
feature       credentials                    saved          confirmation
    │             │              │              │            │
  "Go to      "Click           "✓ Verified"   "Saving       "✅ Done!"
transfer     Verify"                         to file"
 page"                                       
    │             │              │              │            │
  5 sec       20 sec           5 sec           3 sec         Instant
loading      waiting           loading        processing     display
```

---

## Security & Validation Layers

```
                          USER INPUT
                             │
                ┌────────────┴────────────┐
                │                        │
                ▼ (Frontend)              ▼ (Backend)
        CLIENT VALIDATION        SERVER VALIDATION
        ├─ Not empty?           ├─ Bank exists?
        ├─ Valid format?        ├─ Account exists?
        ├─ Amount > 0?          ├─ Password correct?
        ├─ Balance ok?          ├─ NATE acct approved?
        └─ Terms accepted?      ├─ Amount valid?
                                └─ All fields present?
                │
                ├─ IF FAIL ──► USER ERROR (no processing)
                │
                └─ IF PASS ──► PROCESS TRANSFER
                               ├─ Generate Transaction ID
                               ├─ Create Record
                               ├─ Save to File
                               └─► CONFIRMATION
```

---

## File Structure & Dependencies

```
NATE/ (Root)
│
├── server.js ═══════════════════════════════════════════
│   │
│   ├─► Requires: express, cors, multer, path, fs, uuid
│   │
│   ├─► Routes:
│   │   ├─ GET /transfer ◄─────────────┐
│   │   │                              │
│   │   └─ POST /api/inter-bank-transfer
│   │                                  │
│   └─► Data Files (Read/Write):
│       ├─ data/transfers.json ◄──────┘
│       ├─ data/pendingApplications.json
│       └─ data/registrations.json
│
├── transfer/ ═════════════════════════════════════════
│   │
│   ├─► index.html (User Interface)
│   │   └─ Loads: transfer.js, styles.css
│   │
│   ├─► transfer.js (Client-side Logic)
│   │   └─ Makes AJAX calls to:
│   │       ├─ POST /api/validate-account
│   │       ├─ POST /api/check-account-status
│   │       └─ POST /api/inter-bank-transfer
│   │
│   └─► styles.css (Responsive Design)
│       └─ Styling for all UI elements
│
└── data/ ═════════════════════════════════════════════
    │
    ├─ transfers.json (Transfer Records)
    │  └─ Contains: All completed transfers
    │
    ├─ pendingApplications.json (NATE Accounts)
    │  └─ Contains: Applications with approval status
    │
    └─ registrations.json (User Registrations)
       └─ Contains: Registered user information
```

---

This architecture provides:
✅ **Scalability** - Can handle multiple concurrent transfers
✅ **Reliability** - Data persists to file system
✅ **Security** - Validation at client & server
✅ **Maintainability** - Clear separation of concerns
✅ **Usability** - Responsive, intuitive UI
