const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_demo');
const nodemailer = require('nodemailer');

// Coinbase Commerce - initialize with API key for charge creation
let coinbaseClient = null;
try {
  const coinbaseCommerce = require('coinbase-commerce');
  if (coinbaseCommerce && typeof coinbaseCommerce === 'object') {
    // If it's already initialized or has a Client property
    coinbaseClient = coinbaseCommerce.Client || coinbaseCommerce;
    if (typeof coinbaseClient.init === 'function') {
      coinbaseClient.init(process.env.COINBASE_API_KEY || 'demo-key');
    }
  }
} catch (err) {
  console.warn('Coinbase Commerce not available or error initializing:', err.message);
  // Continue without Coinbase - Stripe will still work
}

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Initialize Supabase client
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://trcbyqdfgnlaesixhorz.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyY2J5cWRmZ25sYWVzaXhob3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTU0ODEsImV4cCI6MjA3ODM3MTQ4MX0.SHMr2WS1-q0zDX5p51MMqiO4Dfz1ZZwVjbNTkMiEUsc';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Setup data directories
const DATA_DIR = path.join(__dirname, 'data');
const PENDING_FILE = path.join(DATA_DIR, 'pendingApplications.json');
const REGISTERED_BANK_ACCOUNTS_FILE = path.join(DATA_DIR, 'registeredBankAccounts.json');

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure uploads directory exists for disk storage fallback
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Setup multer for file uploads
// Keep a memory-storage instance for any small in-memory needs (if used elsewhere)
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Disk storage for resume uploads
const resumeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: function (req, file, cb) {
        // Keep original name but prefix with timestamp to avoid collisions
        const safeName = file.originalname.replace(/\s+/g, '_');
        cb(null, Date.now() + '-' + safeName);
    }
});

const uploadResume = multer({
    storage: resumeStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    }
});

// Serve static files and uploaded resumes
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Favicon endpoint
app.get('/favicon.ico', (req, res) => {
    res.status(204).send();
});

app.get('/', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'index.html');
        console.log(`📄 Sending index.html from ${filePath}`);
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error serving /:', err);
        res.status(500).send('Error');
    }
});

app.get('/transfer', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'transfer', 'index.html');
        console.log(`📄 Sending transfer/index.html from ${filePath}`);
        res.sendFile(filePath);
    } catch (err) {
        console.error('Error serving /transfer:', err);
        res.status(500).send('Error');
    }
});

app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    res.json({ success: true, message: 'Message received!' });
});

// ==================== /api/account-application: Handle account opening applications ====================
app.post('/api/account-application', express.json(), (req, res) => {
    try {
        const { accountType, accountNumber, fullName, email, phone, dateOfBirth, country, applicationDate, status, password } = req.body;

        // Validate required fields
        if (!accountType || !accountNumber || !fullName || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields (password is now required)'
            });
        }

        // Save application to pendingApplications.json
        const applicationsFile = path.join(DATA_DIR, 'pendingApplications.json');
        let applications = [];
        
        try {
            if (fs.existsSync(applicationsFile)) {
                const fileContent = fs.readFileSync(applicationsFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                // Ensure it's an array
                applications = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load pendingApplications.json, creating new:', e.message);
            applications = [];
        }

        // Create new application
        const newApplication = {
            id: uuidv4(),
            accountType: accountType,
            accountNumber: accountNumber,
            fullName: fullName,
            email: email,
            phone: phone,
            dateOfBirth: dateOfBirth || '',
            country: country || '',
            password: password,
            applicationDate: applicationDate || new Date().toISOString(),
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Ensure applications is an array before pushing
        if (!Array.isArray(applications)) {
            applications = [];
        }
        
        applications.push(newApplication);

        // Save to file
        fs.writeFileSync(applicationsFile, JSON.stringify(applications, null, 2));

        console.log(`✓ Account application created: ${accountNumber} for ${fullName}`);

        return res.json({
            success: true,
            message: 'Account application submitted successfully!',
            accountNumber: accountNumber,
            applicationId: newApplication.id,
            data: newApplication
        });

    } catch (error) {
        console.error('Error processing account application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process account application',
            error: error.message
        });
    }
});

// ==================== /api/register: User registration ====================
app.post('/api/register', express.json(), async (req, res) => {
    try {
        const { firstName, lastName, email, phone, userType, organization, newsletter, createdAt } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: firstName, lastName, email, phone'
            });
        }

        // Try to save to Supabase first
        if (supabase) {
            try {
                const { data, error } = await supabase.from('users').insert([{
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone,
                    user_type: userType || '',
                    organization: organization || '',
                    newsletter_subscribed: newsletter || false,
                    created_at: createdAt || new Date().toISOString()
                }]);

                if (!error) {
                    return res.json({
                        success: true,
                        message: 'User registered successfully in Supabase',
                        data: data
                    });
                } else {
                    console.warn('Supabase insert error:', error.message);
                    // Fall through to local JSON fallback
                }
            } catch (supabaseErr) {
                console.warn('Supabase connection error:', supabaseErr.message);
                // Fall through to local JSON fallback
            }
        }

        // Fallback: save to local JSON file
        const registrationsFile = path.join(DATA_DIR, 'registrations.json');
        let registrations = [];
        try {
            if (fs.existsSync(registrationsFile)) {
                registrations = JSON.parse(fs.readFileSync(registrationsFile, 'utf-8'));
            }
        } catch (e) {
            console.warn('Failed to load registrations.json:', e.message);
        }

        // Add new registration
        const newUser = {
            id: uuidv4(),
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            user_type: userType || '',
            organization: organization || '',
            newsletter_subscribed: newsletter || false,
            created_at: createdAt || new Date().toISOString()
        };

        registrations.push(newUser);
        fs.writeFileSync(registrationsFile, JSON.stringify(registrations, null, 2), 'utf-8');

        return res.json({
            success: true,
            message: 'User registered successfully (saved locally)',
            data: newUser
        });
    } catch (err) {
        console.error('Error in /api/register:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to register user'
        });
    }
});

// Endpoint to upload a resume (PDF). Field name should be `resume`.
app.post('/api/resume', uploadResume.single('resume'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded or invalid file type.' });
    }

    // Return a simple JSON with path the client can download from.
    const downloadUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, message: 'Resume uploaded', filename: req.file.filename, url: downloadUrl });
});

// Multer / upload error handler
app.use((err, req, res, next) => {
    if (err) {
        // Multer errors can be instances of MulterError, but generic errors from fileFilter come here too
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

// ==================== Mock Bank Account Database ====================
// This simulates a bank account registry. In production, you'd query the real bank API.
const mockBankAccounts = {
    'FIRSTBANK': {
        '1234567890': { password: 'password123', balance: 5000 },
        '9876543210': { password: 'demo1234', balance: 8500 },
        '0123456789': { password: 'firstdemo', balance: 4100 },
    },
    'ZENITHBANK': {
        '5555666677': { password: 'zenith123', balance: 12000 },
        '1111222233': { password: 'secure456', balance: 3200 },
        '1234512345': { password: 'zenith123', balance: 5000 },
        '9876509876': { password: 'secure456', balance: 8200 },
    },
    'GTBANK': {
        '9999000011': { password: 'gtbank123', balance: 7500 },
        '4444555566': { password: 'pass2024', balance: 6000 },
        '0140149185': { password: 'gtbank123', balance: 6500 },
        '1234567890': { password: 'gtdemo123', balance: 4200 },
    },
    'ACCESSBANK': {
        '2222333344': { password: 'access789', balance: 9500 },
        '8888999900': { password: 'demo5678', balance: 4500 },
        '1234567890': { password: 'access123', balance: 7500 },
        '9876543210': { password: 'accessdemo', balance: 5300 },
    },
    'OPAY': {
        '1234567890': { password: 'opay1234', balance: 2500 },
        '5678901234': { password: 'mobile123', balance: 1800 },
        '9876543210': { password: 'opay1234', balance: 3500 },
        '1111111111': { password: 'demo1234', balance: 1500 },
    },
};

// Bank name normalization map: map common user inputs to mockBankAccounts keys
const bankNameMap = {
    'GTBANK': 'GTBANK',
    'GT BANK': 'GTBANK',
    'GT': 'GTBANK',
    'ZENITHBANK': 'ZENITHBANK',
    'ZENITH BANK': 'ZENITHBANK',
    'ZENITH': 'ZENITHBANK',
    'ACCESSBANK': 'ACCESSBANK',
    'ACCESS BANK': 'ACCESSBANK',
    'ACCESS': 'ACCESSBANK',
    'FIRSTBANK': 'FIRSTBANK',
    'FIRST BANK': 'FIRSTBANK',
    'FIRST': 'FIRSTBANK',
    'OPAY': 'OPAY'
};

function normalizeBankKey(raw) {
    if (!raw) return '';
    // normalize input: remove punctuation, collapse spaces, uppercase
    const cleaned = String(raw).trim().toUpperCase();
    const s = cleaned.replace(/[^A-Z0-9]/g, '');

    // direct map (predefined aliases)
    if (bankNameMap[s]) return bankNameMap[s];

    // try to match by keys in mockBankAccounts with flexible rules
    const keys = Object.keys(mockBankAccounts || {});
    // Exact-ish match first
    let found = keys.find(k => k.replace(/[^A-Z0-9]/g, '').toUpperCase() === s);
    if (found) return found;

    // If user provided name contains 'BANK' or other, try removing common words and compare
    const sNoBank = s.replace(/BANK$/, '');
    found = keys.find(k => k.replace(/[^A-Z0-9]/g, '').toUpperCase().includes(sNoBank) || k.replace(/[^A-Z0-9]/g, '').toUpperCase() === sNoBank);
    if (found) return found;

    // Try the reverse: does the cleaned input include a known key fragment (e.g., 'GT', 'ZENITH')
    found = keys.find(k => s.includes(k.replace(/[^A-Z0-9]/g, '').toUpperCase()) || s.includes(k.replace(/BANK/g, '').replace(/[^A-Z0-9]/g, '').toUpperCase()));
    if (found) return found;

    // Fallback: try mapping common aliases via bankNameMap using a looser key (with spaces removed)
    const aliasKey = String(raw).replace(/\s+/g, '').toUpperCase();
    if (bankNameMap[aliasKey]) return bankNameMap[aliasKey];

    // As last resort, return the cleaned string so caller can try using it directly
    return s || aliasKey;
}

// ==================== /validate-account: Validate bank account registration ====================
app.post('/api/validate-account', express.json(), (req, res) => {
    try {
        const { bankCode, accountNumber, password } = req.body;

        // Only bankCode and accountNumber are required (password is optional now)
        if (!bankCode || !accountNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing bankCode or accountNumber' 
            });
        }

        const bankAccounts = mockBankAccounts[bankCode];
        if (!bankAccounts) {
            return res.json({ 
                success: true, 
                valid: false, 
                message: 'Bank not found in system' 
            });
        }

        const account = bankAccounts[accountNumber];
        if (!account) {
            return res.json({ 
                success: true, 
                valid: false, 
                message: 'Account not found. Please check your account number.' 
            });
        }

        // If password is provided, verify it (optional)
        if (password && account.password !== password) {
            return res.json({ 
                success: true, 
                valid: false, 
                message: 'Invalid password. Please try again.' 
            });
        }

        // Account found - password is optional, so we don't require it
        return res.json({ 
            success: true, 
            valid: true, 
            message: 'Account verified',
            balance: account.balance 
        });
    } catch (err) {
        console.error('Error in /validate-account:', err);
        res.status(500).json({ success: false, message: 'Failed to validate account' });
    }
});

// ==================== /check-account-status: Check if account is approved in NATE Bank ====================
app.post('/api/check-account-status', express.json(), (req, res) => {
    try {
        const { accountNumber } = req.body;

        if (!accountNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing accountNumber' 
            });
        }

        // Load applications from file
        const applicationsFile = path.join(DATA_DIR, 'pendingApplications.json');
        let applications = [];
        
        try {
            if (fs.existsSync(applicationsFile)) {
                const fileContent = fs.readFileSync(applicationsFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                applications = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load pendingApplications.json:', e.message);
        }

        // Find the account
        const account = applications.find(app => app.accountNumber === accountNumber);

        if (!account) {
            return res.json({ 
                success: false, 
                message: 'Account not found. Please apply for a NATE Bank account first.' 
            });
        }

        return res.json({ 
            success: true, 
            status: account.status || 'pending',
            nateAccountNumber: account.accountNumber,
            message: account.status === 'approved' 
                ? 'Account is approved and ready for transfers' 
                : `Account status: ${account.status}`
        });
    } catch (err) {
        console.error('Error in /check-account-status:', err);
        res.status(500).json({ success: false, message: 'Failed to check account status' });
    }
});

// ==================== /login-nate-account: Login with NATE account number and password ====================
app.post('/api/login-nate-account', express.json(), (req, res) => {
    try {
        const { accountNumber, password } = req.body;

        if (!accountNumber || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing accountNumber or password' 
            });
        }

        // Load applications from file
        const applicationsFile = path.join(DATA_DIR, 'pendingApplications.json');
        let applications = [];
        
        try {
            if (fs.existsSync(applicationsFile)) {
                const fileContent = fs.readFileSync(applicationsFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                applications = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load pendingApplications.json:', e.message);
        }

        // Find the account
        const account = applications.find(app => app.accountNumber === accountNumber);

        if (!account) {
            return res.json({ 
                success: false, 
                message: 'Account not found with that account number' 
            });
        }

        // Check password
        if (account.password !== password) {
            return res.json({ 
                success: false, 
                message: 'Invalid password. Please try again.' 
            });
        }

        // Check if account is approved
        if (account.status !== 'approved') {
            return res.json({ 
                success: false, 
                message: `Your account is ${account.status}. Only approved accounts can transfer.` 
            });
        }

        // Login successful
        return res.json({ 
            success: true, 
            message: 'Login successful',
            account: {
                accountNumber: account.accountNumber,
                fullName: account.fullName,
                email: account.email,
                status: account.status,
                accountType: account.accountType
            }
        });
    } catch (err) {
        console.error('Error in /login-nate-account:', err);
        res.status(500).json({ success: false, message: 'Failed to login to NATE account' });
    }
});


    // ==================== /verify-account: Verify account and detect bank information ====================
    app.post('/api/verify-account', express.json(), (req, res) => {
        console.log('🔍 VERIFY-ACCOUNT endpoint called');
        try {
            const { accountNumber } = req.body;
            console.log('📝 Account number received:', accountNumber);

            if (!accountNumber) {
                console.log('⚠️  No account number provided');
                return res.json({ 
                    success: false, 
                    message: 'Account number is required' 
                });
            }

            // FIRST: Check if account is registered in any bank
            let registeredAccounts = [];
            try {
                if (fs.existsSync(REGISTERED_BANK_ACCOUNTS_FILE)) {
                    const data = fs.readFileSync(REGISTERED_BANK_ACCOUNTS_FILE, 'utf8');
                    if (data.trim()) {
                        registeredAccounts = JSON.parse(data);
                    }
                }
                console.log(`📂 Loaded ${registeredAccounts.length} registered bank accounts from file`);
            } catch (e) {
                console.warn('Failed to load registeredBankAccounts.json:', e.message);
            }

            // Check registered accounts for exact match
            const registeredMatch = registeredAccounts.find(acc => 
                String(acc.accountNumber) === String(accountNumber)
            );

            if (registeredMatch) {
                console.log('✅ Found REGISTERED account:', registeredMatch.accountHolderName);
                const detectedBank = req.body.bank || registeredMatch.bank;
                return res.json({
                    success: true,
                    account: {
                        accountNumber: registeredMatch.accountNumber,
                        fullName: registeredMatch.accountHolderName,
                        email: registeredMatch.email || '',
                        bank: detectedBank,
                        country: registeredMatch.country || req.body.country || '',
                        status: 'registered',
                        verified: true
                    }
                });
            }

            // SECOND: Check NATE applications
            let applications = [];
            try {
                const data = fs.readFileSync(PENDING_FILE, 'utf8');
                if (data.trim()) {
                    const parsed = JSON.parse(data);
                    applications = Array.isArray(parsed) ? parsed : [];
                }
                console.log(`📂 Loaded ${applications.length} NATE applications from file`);
            } catch (e) {
                console.warn('Failed to load pendingApplications.json:', e.message);
            }

            // Try exact match first
            let matched = applications.find(app => String(app.accountNumber) === String(accountNumber)) || null;
            console.log('🔎 Exact NATE account match:', matched ? 'YES' : 'NO');

            // Fallback: if input looks like an email
            if (!matched && String(accountNumber).includes('@')) {
                matched = applications.find(app => String(app.email || '').toLowerCase() === String(accountNumber).toLowerCase()) || null;
                console.log('🔎 Email match attempt:', matched ? 'YES' : 'NO');
            }

            // Fallback: phone / partial numeric match
            if (!matched) {
                const digits = String(accountNumber).replace(/\D/g, '');
                matched = applications.find(app => {
                    if (!app.phone) return false;
                    const p = String(app.phone).replace(/\D/g, '');
                    return p.endsWith(digits) || digits.endsWith(p) || p.includes(digits) || digits.includes(p);
                }) || null;
                console.log('🔎 Phone/partial match attempt:', matched ? 'YES' : 'NO');
            }

            // Fallback: suffix match on stored account numbers
            if (!matched) {
                const suffix = String(accountNumber).slice(-8);
                matched = applications.find(app => String(app.accountNumber).endsWith(suffix)) || null;
                console.log('🔎 Suffix match attempt:', matched ? 'YES' : 'NO');
            }

            if (!matched) {
                // If the client provided a bank, try to look up in the mock bank registry
                const providedBankRaw = req.body.bank || '';
                const providedBankKey = normalizeBankKey(providedBankRaw);
                if (providedBankKey && mockBankAccounts && mockBankAccounts[providedBankKey]) {
                    const bankAccounts = mockBankAccounts[providedBankKey];
                    // direct match
                    if (bankAccounts[accountNumber]) {
                        console.log('🔎 Found account in mock bank registry for bank:', providedBankRaw);
                        return res.json({
                            success: true,
                            account: {
                                accountNumber: accountNumber,
                                fullName: req.body.fullName || `${providedBankRaw} Customer`,
                                email: req.body.email || '',
                                bank: providedBankRaw,
                                country: req.body.country || '',
                                status: 'external'
                            }
                        });
                    }
                    // try numeric-normalized keys (strip non-digits)
                    const digits = String(accountNumber).replace(/\D/g, '');
                    const foundKey = Object.keys(bankAccounts).find(k => String(k).replace(/\D/g, '') === digits || String(k).endsWith(digits));
                    if (foundKey) {
                        console.log('🔎 Found account in mock bank registry by normalized key:', foundKey);
                        return res.json({
                            success: true,
                            account: {
                                accountNumber: foundKey,
                                fullName: req.body.fullName || `${providedBankRaw} Customer`,
                                email: req.body.email || '',
                                bank: providedBankRaw,
                                country: req.body.country || '',
                                status: 'external'
                            }
                        });
                    }
                }

                console.log('❌ Account not found for number:', accountNumber);
                return res.json({ 
                    success: false, 
                    message: 'Account not found' 
                });
            }

            // Determine bank - prefer client-provided bank or country mapping
            const providedBank = req.body.bank || null;
            let detectedBank = providedBank || 'NATE Bank';
            const acctCountry = req.body.country || matched.country || '';

            if (!providedBank) {
                if (acctCountry === 'NG') {
                    const accNum = String(matched.accountNumber || '');
                    if (accNum.startsWith('007')) detectedBank = 'Zenith Bank';
                    else if (accNum.startsWith('058')) detectedBank = 'GTBank';
                    else if (accNum.startsWith('044')) detectedBank = 'Access Bank';
                    else if (accNum.startsWith('050')) detectedBank = 'First Bank';
                    else if (accNum.startsWith('033')) detectedBank = 'United Bank for Africa';
                    else detectedBank = 'Nigerian Bank';
                } else if (acctCountry === 'US') {
                    detectedBank = 'US Bank';
                } else if (acctCountry === 'UK') {
                    detectedBank = 'UK Bank';
                } else if (acctCountry === 'CA') {
                    detectedBank = 'Canadian Bank';
                } else if (acctCountry === 'AU') {
                    detectedBank = 'Australian Bank';
                }
            }

            console.log('✅ Account verified with bank:', detectedBank);
            return res.json({ 
                success: true, 
                account: {
                    accountNumber: matched.accountNumber,
                    fullName: matched.fullName,
                    email: matched.email,
                    bank: detectedBank,
                    country: acctCountry,
                    status: matched.status
                }
            });
        } catch (err) {
            console.error('❌ Error in /verify-account:', err);
            res.status(500).json({ success: false, message: 'Failed to verify account' });
        }
    });

    // Developer helper: list demo applications (safe for local dev)
    app.get('/api/list-applications', (req, res) => {
        try {
            let applications = [];
            if (fs.existsSync(PENDING_FILE)) {
                const data = fs.readFileSync(PENDING_FILE, 'utf8');
                if (data.trim()) applications = JSON.parse(data);
            }
            return res.json({ success: true, count: applications.length, applications });
        } catch (err) {
            console.error('Error in /api/list-applications:', err);
            return res.status(500).json({ success: false, message: 'Failed to read applications' });
        }
    });

    // ==================== /api/register-bank-account: Let users register their bank accounts ====================
    app.post('/api/register-bank-account', express.json(), (req, res) => {
        try {
            const { bank, accountNumber, accountHolderName, country } = req.body;

            console.log('🏦 REGISTER BANK ACCOUNT:', { bank, accountNumber, accountHolderName, country });

            if (!bank || !accountNumber || !accountHolderName) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing required fields (bank, accountNumber, accountHolderName)' 
                });
            }

            // Load existing registered accounts
            let registeredAccounts = [];
            try {
                if (fs.existsSync(REGISTERED_BANK_ACCOUNTS_FILE)) {
                    const data = fs.readFileSync(REGISTERED_BANK_ACCOUNTS_FILE, 'utf8');
                    if (data.trim()) {
                        registeredAccounts = JSON.parse(data);
                    }
                }
            } catch (e) {
                console.warn('Failed to load registeredBankAccounts.json:', e.message);
            }

            // Check if account already registered
            const accountKey = `${bank.toUpperCase()}_${accountNumber}`;
            const existing = registeredAccounts.find(acc => 
                acc.bank.toUpperCase() === bank.toUpperCase() && 
                acc.accountNumber === accountNumber
            );

            if (existing) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'This account is already registered' 
                });
            }

            // Create registration record
            const registration = {
                id: uuidv4(),
                bank: bank,
                accountNumber: accountNumber,
                accountHolderName: accountHolderName,
                country: country || '',
                status: 'registered',
                registeredAt: new Date().toISOString(),
                verifiedAt: new Date().toISOString()
            };

            registeredAccounts.push(registration);
            fs.writeFileSync(REGISTERED_BANK_ACCOUNTS_FILE, JSON.stringify(registeredAccounts, null, 2));

            console.log(`✓ Bank account registered: ${bank} ${accountNumber}`);

            return res.json({
                success: true,
                message: 'Bank account registered successfully',
                registration: registration
            });
        } catch (err) {
            console.error('Error in /api/register-bank-account:', err);
            res.status(500).json({ success: false, message: 'Failed to register bank account', error: err.message });
        }
    });

    // ==================== /api/external-bank-transfer: Handle transfers to external bank accounts ====================
    app.post('/api/external-bank-transfer', express.json(), async (req, res) => {
        try {
            const { sourceAccountNumber, recipientName, accountNumber, bank, country, accountType, amount, purpose, swiftCode } = req.body;

            console.log('💳 EXTERNAL BANK TRANSFER request:', { bank, accountNumber, amount, recipientName });

            if (!sourceAccountNumber || !recipientName || !accountNumber || !bank || !amount) {
                console.log('❌ Missing required fields');
                return res.status(400).json({ 
                    success: false, 
                    message: 'Missing required transfer fields (source, recipient, account, bank, amount)' 
                });
            }

            if (amount <= 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Transfer amount must be greater than 0' 
                });
            }

            // Verify recipient account exists in the external bank
            const normalizedBankKey = normalizeBankKey(bank);
            const bankAccounts = mockBankAccounts[normalizedBankKey];
            if (!bankAccounts || !bankAccounts[accountNumber]) {
                console.log('❌ Recipient account not found in bank:', bank, accountNumber);
                return res.status(400).json({ 
                    success: false, 
                    message: 'Recipient account not found in the selected bank. Please verify the account number.' 
                });
            }

            // Create transfer record
            const transferRecord = {
                id: uuidv4(),
                type: 'external-bank',
                sourceAccountNumber: sourceAccountNumber,
                recipientName: recipientName,
                recipientAccountNumber: accountNumber,
                bank: bank,
                country: country || '',
                accountType: accountType || '',
                amount: amount,
                purpose: purpose || 'External bank transfer',
                swiftCode: swiftCode || '',
                status: 'completed',
                timestamp: new Date().toISOString(),
                processedAt: new Date().toISOString()
            };

            // Save transfer record
            const transfersFile = path.join(DATA_DIR, 'transfers.json');
            let transfers = [];
            
            try {
                if (fs.existsSync(transfersFile)) {
                    const fileContent = fs.readFileSync(transfersFile, 'utf-8');
                    transfers = JSON.parse(fileContent) || [];
                }
            } catch (e) {
                console.warn('Failed to load transfers.json:', e.message);
            }

            transfers.push(transferRecord);
            fs.writeFileSync(transfersFile, JSON.stringify(transfers, null, 2));

            console.log(`✓ External bank transfer completed: $${amount} from ${sourceAccountNumber} to ${bank}(${accountNumber})`);

            return res.json({
                success: true,
                message: 'Transfer completed successfully',
                transactionId: transferRecord.id,
                amount: amount,
                recipientName: recipientName,
                bank: bank
            });

        } catch (err) {
            console.error('Error in /api/external-bank-transfer:', err);
            res.status(500).json({ success: false, message: 'Failed to process external bank transfer', error: err.message });
        }
    });

// ==================== /get-account-details: Get account holder name for transfer verification ====================
app.post('/api/get-account-details', (req, res) => {
    console.log('🔍 GET-ACCOUNT-DETAILS endpoint called');
    try {
        const { accountNumber } = req.body;
        console.log('📝 Account number received:', accountNumber);

        if (!accountNumber) {
            console.log('⚠️  No account number provided');
            return res.json({ 
                success: false, 
                message: 'Account number is required' 
            });
        }

        let applications = [];
        try {
            const data = fs.readFileSync(PENDING_FILE, 'utf8');
            if (data.trim()) {
                const parsed = JSON.parse(data);
                applications = Array.isArray(parsed) ? parsed : [];
            }
            console.log(`📂 Loaded ${applications.length} applications from file`);
        } catch (e) {
            console.warn('Failed to load pendingApplications.json:', e.message);
        }

        // Find the account by account number
        const account = applications.find(app => app.accountNumber === accountNumber);
        console.log('🔎 Account found:', account ? 'YES' : 'NO');

        if (!account) {
            console.log('❌ Account not found for number:', accountNumber);
            return res.json({ 
                success: false, 
                message: 'Account not found' 
            });
        }

        if (account.status !== 'approved') {
            console.log('⏳ Account not approved, status:', account.status);
            return res.json({ 
                success: false, 
                message: `Account not approved. Status: ${account.status}` 
            });
        }

        console.log('✅ Returning account details for:', account.fullName);
        return res.json({ 
            success: true, 
            fullName: account.fullName,
            accountNumber: account.accountNumber,
            email: account.email,
            status: account.status
        });
    } catch (err) {
        console.error('❌ Error in /get-account-details:', err);
        res.status(500).json({ success: false, message: 'Failed to get account details' });
    }
});

// ==================== /inter-bank-transfer: Handle transfers from other banks to NATE ====================
app.post('/api/inter-bank-transfer', express.json(), async (req, res) => {
    try {
        const { sourceBank, sourceAccountNumber, destinationAccountNumber, amount, reason, timestamp } = req.body;

        console.log('🔄 Transfer request received:', { sourceBank, sourceAccountNumber, destinationAccountNumber, amount });

        if (!sourceBank || !sourceAccountNumber || !destinationAccountNumber || !amount) {
            console.log('❌ Missing required fields');
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required transfer fields' 
            });
        }

        if (amount <= 0) {
            console.log('❌ Invalid amount:', amount);
            return res.status(400).json({ 
                success: false, 
                message: 'Transfer amount must be greater than 0' 
            });
        }

        // Validate source account exists and is valid
        const bankAccounts = mockBankAccounts[sourceBank];
        if (!bankAccounts || !bankAccounts[sourceAccountNumber]) {
            console.log('❌ Source account not found:', { sourceBank, sourceAccountNumber });
            return res.status(400).json({ 
                success: false, 
                message: 'Source account not found or invalid' 
            });
        }

        // Load NATE applications to verify destination
        const applicationsFile = path.join(DATA_DIR, 'pendingApplications.json');
        let applications = [];
        
        try {
            if (fs.existsSync(applicationsFile)) {
                const fileContent = fs.readFileSync(applicationsFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                applications = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load pendingApplications.json:', e.message);
        }

        console.log('📋 Available NATE accounts:', applications.map(a => ({ num: a.accountNumber, status: a.status })));

        // Verify destination account is approved
        const destinationAccount = applications.find(app => 
            app.accountNumber === destinationAccountNumber && app.status === 'approved'
        );

        if (!destinationAccount) {
            console.log('❌ Destination account not found or not approved:', destinationAccountNumber);
            return res.status(400).json({ 
                success: false, 
                message: 'Destination account not found or not approved' 
            });
        }

        // Create transfer record
        const transferRecord = {
            id: uuidv4(),
            sourceBank: sourceBank,
            sourceAccountNumber: sourceAccountNumber,
            destinationAccountNumber: destinationAccountNumber,
            amount: amount,
            reason: reason || 'Inter-bank transfer',
            status: 'completed',
            timestamp: timestamp || new Date().toISOString(),
            processedAt: new Date().toISOString()
        };

        // Save transfer record
        const transfersFile = path.join(DATA_DIR, 'transfers.json');
        let transfers = [];
        
        try {
            if (fs.existsSync(transfersFile)) {
                const fileContent = fs.readFileSync(transfersFile, 'utf-8');
                transfers = JSON.parse(fileContent) || [];
            }
        } catch (e) {
            console.warn('Failed to load transfers.json:', e.message);
        }

        transfers.push(transferRecord);
        fs.writeFileSync(transfersFile, JSON.stringify(transfers, null, 2));

        console.log(`✓ Inter-bank transfer completed: $${amount} from ${sourceBank}(${sourceAccountNumber}) to NATE(${destinationAccountNumber})`);

        return res.json({
            success: true,
            message: 'Transfer completed successfully',
            transactionId: transferRecord.id,
            amount: amount,
            destinationAccount: destinationAccountNumber
        });

    } catch (err) {
        console.error('Error in /inter-bank-transfer:', err);
        res.status(500).json({ success: false, message: 'Failed to process transfer', error: err.message });
    }
});

// ==================== /api/nate-to-nate-transfer: Transfer between NATE accounts ====================
app.post('/api/nate-to-nate-transfer', express.json(), async (req, res) => {
    try {
        const { sourceAccountNumber, destinationAccountNumber, amount, reason, timestamp } = req.body;

        console.log('💳 NATE-to-NATE transfer request:', { sourceAccountNumber, destinationAccountNumber, amount });

        if (!sourceAccountNumber || !destinationAccountNumber || !amount) {
            console.log('❌ Missing required fields for NATE transfer');
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required transfer fields' 
            });
        }

        if (amount <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Transfer amount must be greater than 0' 
            });
        }

        if (sourceAccountNumber === destinationAccountNumber) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot transfer to the same account' 
            });
        }

        // Load NATE applications
        const applicationsFile = path.join(DATA_DIR, 'pendingApplications.json');
        let applications = [];
        
        try {
            if (fs.existsSync(applicationsFile)) {
                const fileContent = fs.readFileSync(applicationsFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                applications = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load pendingApplications.json:', e.message);
        }

        // Verify source account exists and is approved
        const sourceAccount = applications.find(app => 
            app.accountNumber === sourceAccountNumber && app.status === 'approved'
        );

        if (!sourceAccount) {
            console.log('❌ Source account not found or not approved:', sourceAccountNumber);
            return res.status(400).json({ 
                success: false, 
                message: 'Source account not found or not approved' 
            });
        }

        // Verify destination account exists and is approved
        const destinationAccount = applications.find(app => 
            app.accountNumber === destinationAccountNumber && app.status === 'approved'
        );

        if (!destinationAccount) {
            console.log('❌ Destination account not found or not approved:', destinationAccountNumber);
            return res.status(400).json({ 
                success: false, 
                message: 'Destination account not found or not approved' 
            });
        }

        // Create transfer record
        const transferRecord = {
            id: uuidv4(),
            type: 'nate-to-nate',
            sourceAccountNumber: sourceAccountNumber,
            destinationAccountNumber: destinationAccountNumber,
            amount: amount,
            reason: reason || 'NATE to NATE transfer',
            status: 'completed',
            timestamp: timestamp || new Date().toISOString(),
            processedAt: new Date().toISOString()
        };

        // Save transfer record
        const transfersFile = path.join(DATA_DIR, 'transfers.json');
        let transfers = [];
        
        try {
            if (fs.existsSync(transfersFile)) {
                const fileContent = fs.readFileSync(transfersFile, 'utf-8');
                transfers = JSON.parse(fileContent) || [];
            }
        } catch (e) {
            console.warn('Failed to load transfers.json:', e.message);
        }

        transfers.push(transferRecord);
        fs.writeFileSync(transfersFile, JSON.stringify(transfers, null, 2));

        console.log(`✓ NATE-to-NATE transfer completed: $${amount} from ${sourceAccountNumber} to ${destinationAccountNumber}`);

        return res.json({
            success: true,
            message: 'Transfer completed successfully',
            transactionId: transferRecord.id,
            transferRecord: transferRecord
        });

    } catch (err) {
        console.error('Error in /nate-to-nate-transfer:', err);
        res.status(500).json({ success: false, message: 'Failed to process transfer', error: err.message });
    }
});

app.post('/api/apply', memoryUpload.single('resume'), async (req, res) => {
    try {
        let resumeUrl = '';

        // Upload resume to Supabase Storage if file exists
        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;

            // Try to upload to Supabase storage. If the bucket doesn't exist or upload fails,
            // fall back to saving the file locally in /uploads and provide a local URL.
            try {
                const { data, error: uploadError } = await supabase.storage
                    .from('resumes')
                    .upload(fileName, req.file.buffer, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    throw uploadError;
                }

                // Get public URL
                const { data: publicData } = supabase.storage
                    .from('resumes')
                    .getPublicUrl(fileName);

                resumeUrl = publicData.publicUrl;
            } catch (uploadErr) {
                // Supabase upload failed, use local storage fallback
                // Save locally to uploads directory
                const localName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const localPath = path.join(UPLOAD_DIR, localName);
                try {
                    fs.writeFileSync(localPath, req.file.buffer);
                    resumeUrl = `/uploads/${localName}`;
                } catch (fsErr) {
                    console.error('Failed to write file locally after Supabase failure:', fsErr);
                    return res.status(500).json({ success: false, message: 'Failed to store resume.' });
                }
            }
        }

        const application = {
            position: req.body.position || '',
            firstName: req.body.firstName || '',
            lastName: req.body.lastName || '',
            email: req.body.email || '',
            phone: req.body.phone || '',
            experience: req.body.experience || '',
            coverLetter: req.body.coverLetter || '',
            resume_url: resumeUrl,
            terms: req.body.terms === 'on' || req.body.terms === true,
            submittedAt: new Date().toISOString()
        };
        
        const { data, error } = await supabase.from('applications').insert([application]);
        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ success: false, message: 'Failed to save application.' });
        }
        res.json({ success: true, message: 'Application received and stored in Supabase!' });
    } catch (err) {
        console.error('Unexpected error:', err);
        res.status(500).json({ success: false, message: 'Unexpected error.' });
    }
});

// ==================== PAYMENT FLOW ====================

// Utility to load/save pending applications
function loadPendingApplications() {
    try {
        if (fs.existsSync(PENDING_FILE)) {
            return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf-8'));
        }
    } catch (e) {
        console.warn('Failed to load pending applications:', e.message);
    }
    return {};
}

function savePendingApplications(data) {
    try {
        fs.writeFileSync(PENDING_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error('Failed to save pending applications:', e.message);
    }
}

// ==================== /api/applications: Retrieve all applications ====================
app.get('/api/applications', (req, res) => {
    try {
        const applicationsFile = path.join(DATA_DIR, 'pendingApplications.json');
        let applications = [];
        
        try {
            if (fs.existsSync(applicationsFile)) {
                const fileContent = fs.readFileSync(applicationsFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                // Ensure it's an array
                applications = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load pendingApplications.json:', e.message);
            applications = [];
        }

        res.json({
            success: true,
            data: applications,
            count: applications.length
        });
    } catch (error) {
        console.error('Error retrieving applications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve applications',
            error: error.message
        });
    }
});

// ==================== /api/applications/:id DELETE: Remove a pending application (local file fallback) ====================
app.delete('/api/applications/:id', (req, res) => {
    try {
        const appId = req.params.id;
        const applicationsFile = path.join(DATA_DIR, 'pendingApplications.json');
        let applications = [];

        try {
            if (fs.existsSync(applicationsFile)) {
                const fileContent = fs.readFileSync(applicationsFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                applications = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load pendingApplications.json for delete:', e.message);
            applications = [];
        }

        const idx = applications.findIndex(a => String(a.id) === String(appId) || String(a.accountNumber) === String(appId));
        if (idx === -1) {
            return res.status(404).json({ success: false, message: 'Application not found' });
        }

        const removed = applications.splice(idx, 1)[0];
        fs.writeFileSync(applicationsFile, JSON.stringify(applications, null, 2), 'utf-8');

        console.log(`✓ Deleted pending application ${removed.id || removed.accountNumber}`);
        return res.json({ success: true, message: 'Application deleted', data: removed });
    } catch (err) {
        console.error('Error deleting application:', err);
        return res.status(500).json({ success: false, message: 'Failed to delete application', error: err.message });
    }
});

// ==================== /api/transfers: Retrieve all transfers ====================
app.get('/api/transfers', (req, res) => {
    try {
        const transfersFile = path.join(DATA_DIR, 'transfers.json');
        let transfers = [];
        
        try {
            if (fs.existsSync(transfersFile)) {
                const fileContent = fs.readFileSync(transfersFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                // Ensure it's an array
                transfers = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load transfers.json:', e.message);
            transfers = [];
        }

        res.json({
            success: true,
            data: transfers,
            count: transfers.length
        });
    } catch (error) {
        console.error('Error retrieving transfers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve transfers',
            error: error.message
        });
    }
});

// ==================== /api/incoming-transfers: Retrieve transfers for a specific recipient account ====================
app.get('/api/incoming-transfers', (req, res) => {
    try {
        const accountNumber = req.query.accountNumber || req.query.account || null;
        const transfersFile = path.join(DATA_DIR, 'transfers.json');
        let transfers = [];
        try {
            if (fs.existsSync(transfersFile)) {
                const fileContent = fs.readFileSync(transfersFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                transfers = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load transfers.json for incoming-transfers:', e.message);
            transfers = [];
        }

        if (accountNumber) {
            const filtered = transfers.filter(t => String(t.recipientAccountNumber || t.accountNumber || '').trim() === String(accountNumber).trim());
            return res.json({ success: true, count: filtered.length, data: filtered });
        }

        // If no accountNumber provided, return empty result to avoid exposing all transfers
        return res.json({ success: true, count: 0, data: [] });
    } catch (err) {
        console.error('Error retrieving incoming transfers:', err);
        return res.status(500).json({ success: false, message: 'Failed to retrieve incoming transfers' });
    }
});

// ==================== /api/applications/:accountNumber/status: Update application status (approve/reject) ====================
app.put('/api/applications/:identifier/status', express.json(), (req, res) => {
    try {
        const { identifier } = req.params; // can be accountNumber or id
        const { status } = req.body;

        // Validate status
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be: approved, rejected, or pending'
            });
        }

        const applicationsFile = path.join(DATA_DIR, 'pendingApplications.json');
        let applications = [];
        
        try {
            if (fs.existsSync(applicationsFile)) {
                const fileContent = fs.readFileSync(applicationsFile, 'utf-8');
                const parsed = JSON.parse(fileContent);
                applications = Array.isArray(parsed) ? parsed : [];
            }
        } catch (e) {
            console.warn('Failed to load pendingApplications.json:', e.message);
            applications = [];
        }

        // Find and update application by id or accountNumber
        const appIndex = applications.findIndex(a => String(a.accountNumber) === String(identifier) || String(a.id) === String(identifier));
        if (appIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Application not found'
            });
        }

        const oldStatus = applications[appIndex].status;
        applications[appIndex].status = status;
        applications[appIndex].updatedAt = new Date().toISOString();

        // Save to file
        fs.writeFileSync(applicationsFile, JSON.stringify(applications, null, 2));

        console.log(`✓ Application ${applications[appIndex].accountNumber || applications[appIndex].id} status updated: ${oldStatus} → ${status}`);

        return res.json({
            success: true,
            message: `Application ${status} successfully!`,
            data: applications[appIndex]
        });

    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update application status',
            error: error.message
        });
    }
});

// ==================== /preapply: Upload resume and create pending application ====================
app.post('/api/preapply', memoryUpload.single('resume'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No resume file uploaded' });
        }

        const { position, firstName, lastName, email, phone, experience, coverLetter, terms } = req.body;

        // Validate required fields
        if (!position || !firstName || !lastName || !email || !phone || !experience) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Save resume to disk
        const resumeFileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const resumePath = path.join(UPLOAD_DIR, resumeFileName);
        fs.writeFileSync(resumePath, req.file.buffer);

        // Create pending application ID
        const pendingId = uuidv4();
        const pending = loadPendingApplications();
        pending[pendingId] = {
            position,
            firstName,
            lastName,
            email,
            phone,
            experience,
            coverLetter,
            terms: terms === 'true' || terms === true || terms === 'on',
            resumePath,
            resumeUrl: `/uploads/${resumeFileName}`,
            createdAt: new Date().toISOString(),
            paymentVerified: false
        };
        savePendingApplications(pending);

        res.json({ success: true, message: 'Resume uploaded, ready for payment', pendingId });
    } catch (err) {
        console.error('Error in /preapply:', err);
        res.status(500).json({ success: false, message: 'Failed to process application' });
    }
});

// ==================== /create-stripe-session: Create Stripe Checkout session ====================
app.post('/api/create-stripe-session', express.json(), async (req, res) => {
    try {
        const { pendingId, amount = 5000 } = req.body; // amount in cents (50.00 USD)
        const pending = loadPendingApplications();

        if (!pending[pendingId]) {
            return res.status(400).json({ success: false, message: 'Invalid pending application ID' });
        }

        const successUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-payment?sessionId={CHECKOUT_SESSION_ID}&pendingId=${pendingId}`;
        const cancelUrl = `${process.env.APP_URL || 'http://localhost:3000'}/?payment=cancelled`;

        // Create Stripe session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `Job Application - ${pending[pendingId].position}`,
                            description: `Application submission fee for ${pending[pendingId].firstName} ${pending[pendingId].lastName}`,
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                pendingId
            }
        });

        res.json({ success: true, sessionId: session.id, url: session.url });
    } catch (err) {
        console.error('Error creating Stripe session:', err);
        res.status(500).json({ success: false, message: 'Failed to create payment session' });
    }
});

// ==================== /redeem-giftcard: Redeem a gift card code ====================
app.post('/api/redeem-giftcard', express.json(), (req, res) => {
    try {
        const { pendingId, code } = req.body;
        if (!pendingId || !code) {
            return res.status(400).json({ success: false, message: 'Missing pendingId or code' });
        }

        const pending = loadPendingApplications();
        if (!pending[pendingId]) {
            return res.status(400).json({ success: false, message: 'Invalid pending application ID' });
        }

        // Load gift cards
        let giftCards = {};
        try {
            giftCards = JSON.parse(fs.readFileSync(path.join(__dirname, 'giftCards.json'), 'utf8'));
        } catch (e) {
            console.error('Failed to load giftCards.json:', e.message);
            return res.status(500).json({ success: false, message: 'Gift card system unavailable' });
        }

        const upperCode = code.trim().toUpperCase();
        const card = giftCards[upperCode];
        if (!card) {
            return res.status(400).json({ success: false, message: 'Invalid gift card code' });
        }

        if (card.redeemed) {
            return res.status(400).json({ success: false, message: 'Gift card already redeemed' });
        }

        // Assuming application fee is $50
        const fee = 50;
        if (card.amount < fee) {
            // Partial payment - mark partial and require remainder via Stripe
            pending[pendingId].paymentVerified = false;
            pending[pendingId].paymentMethod = 'giftcard-partial';
            pending[pendingId].giftCard = { code: upperCode, amount: card.amount };
            savePendingApplications(pending);
            return res.json({ success: true, partial: true, remaining: fee - card.amount, message: 'Partial gift card applied. Please pay remaining amount.' });
        }

        // Full payment
        pending[pendingId].paymentVerified = true;
        pending[pendingId].paymentMethod = 'giftcard';
        pending[pendingId].paidAt = new Date().toISOString();
        savePendingApplications(pending);

        // Mark gift card redeemed
        giftCards[upperCode].redeemed = true;
        fs.writeFileSync(path.join(__dirname, 'giftCards.json'), JSON.stringify(giftCards, null, 2));

        return res.json({ success: true, message: 'Gift card accepted, application paid.' });
    } catch (err) {
        console.error('Error redeeming gift card:', err);
        res.status(500).json({ success: false, message: 'Failed to redeem gift card' });
    }
});

// ==================== /check-giftcard: Check gift card validity without redeeming ====================
app.post('/api/check-giftcard', express.json(), (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ success: false, message: 'Missing code' });

        let giftCards = {};
        try {
            giftCards = JSON.parse(fs.readFileSync(path.join(__dirname, 'giftCards.json'), 'utf8'));
        } catch (e) {
            console.error('Failed to load giftCards.json:', e.message);
            return res.status(500).json({ success: false, message: 'Gift card system unavailable' });
        }

        const upperCode = code.trim().toUpperCase();
        const card = giftCards[upperCode];
        if (!card) {
            return res.json({ success: true, valid: false, message: 'Invalid gift card code' });
        }

        if (card.redeemed) {
            return res.json({ success: true, valid: false, redeemed: true, message: 'Gift card already redeemed' });
        }

        return res.json({ success: true, valid: true, redeemed: false, amount: card.amount });
    } catch (err) {
        console.error('Error in /check-giftcard:', err);
        res.status(500).json({ success: false, message: 'Failed to check gift card' });
    }
});

// ==================== /redeem-and-apply: Redeem gift card and create application in one step ====================
// Accepts multipart/form-data: application fields, resume (optional) and `code`
app.post('/api/redeem-and-apply', memoryUpload.single('resume'), async (req, res) => {
    try {
        const { position, firstName, lastName, email, phone, experience, coverLetter, terms } = req.body;
        const code = req.body.code;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Missing gift card code' });
        }

        // Basic required fields validation
        if (!position || !firstName || !lastName || !email || !phone || !experience) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Load gift cards
        let giftCards = {};
        try {
            giftCards = JSON.parse(fs.readFileSync(path.join(__dirname, 'giftCards.json'), 'utf8'));
        } catch (e) {
            console.error('Failed to load giftCards.json:', e.message);
            return res.status(500).json({ success: false, message: 'Gift card system unavailable' });
        }

        const upperCode = code.trim().toUpperCase();
        const card = giftCards[upperCode];
        if (!card) {
            return res.status(400).json({ success: false, message: 'Invalid gift card code' });
        }

        if (card.redeemed) {
            return res.status(400).json({ success: false, message: 'Gift card already redeemed' });
        }

        // Assuming application fee is $50
        const fee = 50;

        // If card amount is less than fee -> create pending application and return partial
        if (card.amount < fee) {
            // Save resume file locally if provided
            let resumeUrl = '';
            if (req.file) {
                const resumeFileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
                const resumePath = path.join(UPLOAD_DIR, resumeFileName);
                fs.writeFileSync(resumePath, req.file.buffer);
                resumeUrl = `/uploads/${resumeFileName}`;
            }

            const pendingId = uuidv4();
            const pending = loadPendingApplications();
            pending[pendingId] = {
                position,
                firstName,
                lastName,
                email,
                phone,
                experience,
                coverLetter,
                terms: terms === 'true' || terms === true || terms === 'on',
                resumePath: req.file ? path.join(UPLOAD_DIR, `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`) : '',
                resumeUrl,
                createdAt: new Date().toISOString(),
                paymentVerified: false,
                paymentMethod: 'giftcard-partial',
                giftCard: { code: upperCode, amount: card.amount }
            };
            savePendingApplications(pending);

            // don't mark card redeemed yet (partial)
            return res.json({ success: true, partial: true, remaining: fee - card.amount, pendingId, message: 'Partial gift applied. Please pay remaining amount.' });
        }

        // Full payment via gift card: mark card redeemed and store application
        giftCards[upperCode].redeemed = true;
        fs.writeFileSync(path.join(__dirname, 'giftCards.json'), JSON.stringify(giftCards, null, 2));

        // Save resume (try Supabase, otherwise local)
        let resumeUrl = '';
        if (req.file) {
            const fileName = `${Date.now()}-${req.file.originalname}`;
            try {
                const { data, error: uploadError } = await supabase.storage
                    .from('resumes')
                    .upload(fileName, req.file.buffer, { cacheControl: '3600', upsert: false });

                if (uploadError) throw uploadError;

                const { data: publicData } = supabase.storage.from('resumes').getPublicUrl(fileName);
                resumeUrl = publicData.publicUrl;
            } catch (uploadErr) {
                console.warn('Resume upload to Supabase failed, falling back to local storage:', uploadErr && uploadErr.message ? uploadErr.message : uploadErr);
                const localName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                const localPath = path.join(UPLOAD_DIR, localName);
                fs.writeFileSync(localPath, req.file.buffer);
                resumeUrl = `/uploads/${localName}`;
            }
        }

        const application = {
            position,
            firstName,
            lastName,
            email,
            phone,
            experience,
            coverLetter,
            resume_url: resumeUrl,
            terms: terms === 'true' || terms === true || terms === 'on',
            submittedAt: new Date().toISOString(),
            paymentMethod: 'giftcard',
            paidAt: new Date().toISOString()
        };

        const { data, error } = await supabase.from('applications').insert([application]);
        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ success: false, message: 'Failed to save application.' });
        }

        return res.json({ success: true, message: 'Application received and paid with gift card.' });
    } catch (err) {
        console.error('Error in /redeem-and-apply:', err);
        res.status(500).json({ success: false, message: 'Failed to process redeem-and-apply.' });
    }
});

// ==================== /create-coinbase-charge: Create Coinbase Commerce charge for BTC ====================
app.post('/api/create-coinbase-charge', express.json(), async (req, res) => {
    try {
        const { pendingId, amount = 0.001 } = req.body; // amount in BTC
        const pending = loadPendingApplications();

        if (!pending[pendingId]) {
            return res.status(400).json({ success: false, message: 'Invalid pending application ID' });
        }

        // Check if Coinbase is available
        if (!coinbaseClient) {
            console.warn('Coinbase Commerce not configured. Using demo response.');
            // Demo mode - return a fake charge for testing
            const demoChargeId = 'demo-' + Date.now();
            return res.json({ 
                success: true, 
                chargeId: demoChargeId, 
                hostedUrl: `https://commerce.coinbase.com/charges/${demoChargeId}`,
                demo: true,
                message: 'Demo mode: Please configure COINBASE_API_KEY for real BTC payments'
            });
        }

        // Create Coinbase charge
        try {
            const Charge = require('coinbase-commerce').resources.Charge;
            const charge = await Charge.create({
                name: `Job Application - ${pending[pendingId].position}`,
                description: `Application submission fee for ${pending[pendingId].firstName} ${pending[pendingId].lastName}`,
                local_price: {
                    amount: amount.toString(),
                    currency: 'BTC',
                },
                pricing_type: 'fixed_price',
                metadata: {
                    pendingId
                },
                redirect_url: `${process.env.APP_URL || 'http://localhost:3000'}/verify-coinbase?chargeId={CHARGE_ID}&pendingId=${pendingId}`
            });

            res.json({ success: true, chargeId: charge.id, hostedUrl: charge.hosted_url });
        } catch (chargeErr) {
            console.error('Error creating Coinbase charge:', chargeErr);
            // Fallback to demo mode
            const demoChargeId = 'demo-' + Date.now();
            res.json({ 
                success: true, 
                chargeId: demoChargeId, 
                hostedUrl: `https://commerce.coinbase.com/charges/${demoChargeId}`,
                demo: true,
                message: 'Demo mode: Coinbase charge creation failed, using test mode'
            });
        }
    } catch (err) {
        console.error('Error in /create-coinbase-charge:', err);
        res.status(500).json({ success: false, message: 'Failed to create BTC charge' });
    }
});

// ==================== /verify-payment: Verify Stripe payment and finalize application ====================
app.get('/verify-payment', async (req, res) => {
    try {
        const { sessionId, pendingId } = req.query;

        if (!sessionId || !pendingId) {
            return res.status(400).json({ success: false, message: 'Missing session ID or pending ID' });
        }

        // Retrieve session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return res.status(400).json({ success: false, message: 'Payment not completed' });
        }

        // Mark as payment verified
        const pending = loadPendingApplications();
        if (pending[pendingId]) {
            pending[pendingId].paymentVerified = true;
            pending[pendingId].stripeSessionId = sessionId;
            pending[pendingId].paymentMethod = 'card';
            pending[pendingId].paidAt = new Date().toISOString();
            savePendingApplications(pending);
        }

        res.json({ success: true, message: 'Payment verified! Application submitted.', pendingId });
    } catch (err) {
        console.error('Error verifying payment:', err);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
});

// ==================== /verify-coinbase: Verify Coinbase BTC payment and finalize application ====================
app.get('/verify-coinbase', async (req, res) => {
    try {
        const { chargeId, pendingId } = req.query;

        if (!chargeId || !pendingId) {
            return res.status(400).json({ success: false, message: 'Missing charge ID or pending ID' });
        }

        // Retrieve charge from Coinbase
        const Charge = require('coinbase-commerce').resources.Charge;
        const charge = await Charge.retrieve(chargeId);

        if (charge.payments && charge.payments.length > 0 && charge.payments[0].status === 'confirmed') {
            // Mark as payment verified
            const pending = loadPendingApplications();
            if (pending[pendingId]) {
                pending[pendingId].paymentVerified = true;
                pending[pendingId].coinbaseChargeId = chargeId;
                pending[pendingId].paymentMethod = 'btc';
                pending[pendingId].paidAt = new Date().toISOString();
                savePendingApplications(pending);
            }

            res.json({ success: true, message: 'BTC Payment confirmed! Application submitted.', pendingId });
        } else {
            res.status(400).json({ success: false, message: 'BTC payment not confirmed' });
        }
    } catch (err) {
        console.error('Error verifying Coinbase payment:', err);
        res.status(500).json({ success: false, message: 'Failed to verify BTC payment' });
    }
});

// ==================== /finalize-application: Save to Supabase after payment ====================
app.post('/api/finalize-application', express.json(), async (req, res) => {
    try {
        const { pendingId } = req.body;
        const pending = loadPendingApplications();

        if (!pending[pendingId] || !pending[pendingId].paymentVerified) {
            return res.status(400).json({ success: false, message: 'Invalid or unverified pending application' });
        }

        const app_data = pending[pendingId];

        // Save to Supabase
        const { data, error } = await supabase.from('applications').insert([{
            position: app_data.position,
            firstName: app_data.firstName,
            lastName: app_data.lastName,
            email: app_data.email,
            phone: app_data.phone,
            experience: app_data.experience,
            coverLetter: app_data.coverLetter,
            resume_url: app_data.resumeUrl,
            payment_method: app_data.paymentMethod,
            terms: app_data.terms,
            submittedAt: app_data.paidAt
        }]);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ success: false, message: 'Failed to save application' });
        }

        // Clean up pending record
        delete pending[pendingId];
        savePendingApplications(pending);

        // Attempt to send receipt email if SMTP configured
        try {
            const smtpHost = process.env.SMTP_HOST;
            const smtpPort = process.env.SMTP_PORT || 587;
            const smtpUser = process.env.SMTP_USER;
            const smtpPass = process.env.SMTP_PASS;

            if (smtpHost && smtpUser && smtpPass) {
                const transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: parseInt(smtpPort, 10),
                    secure: smtpPort === '465',
                    auth: {
                        user: smtpUser,
                        pass: smtpPass
                    }
                });

                const mailOptions = {
                    from: process.env.FROM_EMAIL || smtpUser,
                    to: app_data.email,
                    subject: 'Application Received - APLK',
                    text: `Hello ${app_data.firstName},\n\nYour application for ${app_data.position} has been received and payment accepted. We will contact you soon.\n\nReceipt: $50.00\n\nThank you,\nAPLK`,
                    html: `<p>Hello ${app_data.firstName},</p><p>Your application for <strong>${app_data.position}</strong> has been received and payment accepted. We will contact you soon.</p><p><strong>Receipt:</strong> $50.00</p><p>Thank you,<br/>APLK</p>`
                };

                await transporter.sendMail(mailOptions);
                console.log('Receipt email sent to', app_data.email);
            } else {
                console.log('SMTP not configured - skipping receipt email');
            }
        } catch (mailErr) {
            console.error('Failed to send receipt email:', mailErr);
        }

        res.json({ success: true, message: 'Application finalized and stored!' });
    } catch (err) {
        console.error('Error finalizing application:', err);
        res.status(500).json({ success: false, message: 'Failed to finalize application' });
    }
});

// ==================== /process-bank-transfer: Process bank transfer payment ====================
app.post('/api/process-bank-transfer', express.json(), async (req, res) => {
    try {
        const { pendingId, bank, accountNumber, amount, btcTransactionId } = req.body;

        if (!pendingId || !bank || !amount) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const pending = loadPendingApplications();
        if (!pending[pendingId]) {
            return res.status(400).json({ success: false, message: 'Invalid pending application ID' });
        }

        // Mark application as paid via bank transfer
        pending[pendingId].paymentVerified = true;
        pending[pendingId].paymentMethod = 'bank-transfer';
        pending[pendingId].bankName = bank;
        pending[pendingId].bankAccount = accountNumber;
        pending[pendingId].btcTransaction = btcTransactionId;
        pending[pendingId].paidAt = new Date().toISOString();
        savePendingApplications(pending);

        // Finalize application
        await finalizeApplicationFromPending(pendingId);

        console.log(`Bank transfer processed: ${amount} USD from ${bank} to BTC wallet (txn: ${btcTransactionId})`);
        return res.json({ success: true, message: 'Payment processed and application submitted.' });
    } catch (err) {
        console.error('Error processing bank transfer:', err);
        res.status(500).json({ success: false, message: 'Failed to process bank transfer' });
    }
});

// Helper function to finalize an application from pending
async function finalizeApplicationFromPending(pendingId) {
    try {
        const pending = loadPendingApplications();
        const app_data = pending[pendingId];

        if (!app_data) return;

        // Build application record
        const application = {
            position: app_data.position,
            firstName: app_data.firstName,
            lastName: app_data.lastName,
            email: app_data.email,
            phone: app_data.phone,
            experience: app_data.experience,
            coverLetter: app_data.coverLetter,
            resume_url: app_data.resumeUrl,
            terms: app_data.terms,
            paymentMethod: app_data.paymentMethod,
            paymentVerified: app_data.paymentVerified,
            bankName: app_data.bankName || null,
            btcTransaction: app_data.btcTransaction || null,
            submittedAt: new Date().toISOString(),
            paidAt: app_data.paidAt
        };

        // Insert into Supabase
        const { data, error } = await supabase.from('applications').insert([application]);
        if (error) {
            console.error('Supabase error:', error);
            return;
        }

        // Remove from pending
        delete pending[pendingId];
        savePendingApplications(pending);

        // Send confirmation email if SMTP configured
        try {
            if (transporter) {
                const mailOptions = {
                    from: process.env.SMTP_USER,
                    to: app_data.email,
                    subject: 'Application Received - Payment Confirmed',
                    html: `<h2>Thank you for your application!</h2>
                           <p>We have received your job application for <strong>${app_data.position}</strong>.</p>
                           <p><strong>Payment Status:</strong> Confirmed via ${app_data.paymentMethod}</p>
                           <p>We will review your application and contact you shortly.</p>
                           <p>Best regards,<br>APLK Careers Team</p>`
                };
                await transporter.sendMail(mailOptions);
                console.log('Confirmation email sent to', app_data.email);
            }
        } catch (mailErr) {
            console.error('Failed to send confirmation email:', mailErr);
        }
    } catch (err) {
        console.error('Error finalizing application from pending:', err);
    }
}

console.log('📍 About to start server on port 3000');

// Small startup marker so we can verify the deployed commit in Render logs.
// Render often exposes commit info in env vars (e.g. COMMIT_SHA) — we include that if available,
// otherwise include a timestamp. This makes it easy to confirm the running code is the new commit.
const STARTUP_MARKER = process.env.STARTUP_MARKER || `startup:${new Date().toISOString()}`;
console.log(`🔖 Startup marker: ${STARTUP_MARKER} ${process.env.COMMIT_SHA ? `(commit:${process.env.COMMIT_SHA})` : ''}`);

// Lightweight health endpoint to verify the running commit/startup marker from the browser
app.get('/__health', (req, res) => {
    res.json({
        ok: true,
        startup_marker: STARTUP_MARKER,
        commit: process.env.COMMIT_SHA || null,
        timestamp: new Date().toISOString()
    });
});

// Return registered bank accounts (used by admin UI)
app.get('/api/registered-accounts', (req, res) => {
    try {
        let registered = [];
        if (fs.existsSync(REGISTERED_BANK_ACCOUNTS_FILE)) {
            const data = fs.readFileSync(REGISTERED_BANK_ACCOUNTS_FILE, 'utf8');
            if (data && data.trim()) registered = JSON.parse(data);
        }
        return res.json({ success: true, data: registered });
    } catch (err) {
        console.error('Error reading registeredBankAccounts.json:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to load registered accounts' });
    }
});

const server = app.listen(process.env.PORT || 3000, '0.0.0.0', function() {
    console.log(`✅ Server running on http://0.0.0.0:${process.env.PORT || 3000}`);
    console.log(`📨 Ready to accept connections`);
    console.log(`🌐 Accessible at: https://phone-4hza.onrender.com (Render) or http://localhost:3000 (Local)`);
    console.log(`🔖 Startup marker (again): ${STARTUP_MARKER}`);
});

server.on('error', (err) => {
    console.error('❌ Server error:', err);
});

server.on('listening', () => {
    console.log('🎧 Server is listening');
});

process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught exception:', err);
    process.exit(1);
});

