// Cleaned NATE Wallet - Transfer App JavaScript

const API_BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return window.location.origin;
})();

let currentUser = null;
let verifiedAccount = null;

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // If a user is stored from a previous session, restore and show dashboard
    try {
        const stored = localStorage.getItem('nateCurrentUser');
        if (stored) {
            currentUser = JSON.parse(stored);
            hideError();
            hideSection('loginSection');
            showSection('dashboardSection');
            // show sidebar since user is logged in
            toggleSidebar(true);
            populateDashboard();
            return;
        }
    } catch (e) {
        console.warn('Failed to restore stored user', e);
    }
    // No stored user: show login and hide sidebar to avoid showing navigation
    showSection('loginSection');
    toggleSidebar(false);
});

// Show/hide the sidebar (used to keep login screen clean)
function toggleSidebar(visible) {
    try {
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        if (visible) {
            sidebar.style.display = '';
        } else {
            sidebar.style.display = 'none';
        }
    } catch (e) {
        console.warn('toggleSidebar error', e);
    }
}

function setupEventListeners() {
    const nateLoginForm = document.getElementById('nateLoginForm');
    const transferForm = document.getElementById('transferForm');
    const recipientAccount = document.getElementById('recipientAccount');
    const bankAccountInput = document.getElementById('accountNumber');
    const logoutBtn = document.getElementById('logoutBtn');

    if (nateLoginForm) nateLoginForm.addEventListener('submit', handleNateLogin);
    if (transferForm) transferForm.addEventListener('submit', handleTransfer);
    if (recipientAccount) recipientAccount.addEventListener('input', handleRecipientLookup);
    if (bankAccountInput) bankAccountInput.addEventListener('input', handleBankAccountLookup);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    const refreshBtn = document.getElementById('refreshHistoryBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => {
        if (currentUser && currentUser.accountNumber) {
            refreshIncomingTransfers({ accountNumber: currentUser.accountNumber, markSeen: true, render: true });
        }
    });
}

/* Create test account feature removed */

// Login
async function handleNateLogin(e) {
    e.preventDefault();
    const accountNumberEl = document.getElementById('nateAccountNumber');
    const passwordEl = document.getElementById('natePassword');
    const accountNumber = accountNumberEl ? accountNumberEl.value.trim() : '';
    const password = passwordEl ? passwordEl.value : '';

    if (!accountNumber || !password) {
        showError('Please enter both account number and password');
        return;
    }

    try {
        showLoading('Logging in...');
        const res = await fetch(`${API_BASE_URL}/api/login-nate-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountNumber, password })
        });
            const data = await res.json();
            hideLoading();
            if (!res.ok) {
                // server responded with error - try local fallback (offline / dev)
                const local = tryLocalLogin(accountNumber, password);
                if (local) {
                    currentUser = local;
                } else {
                    showError(data.message || 'Login failed');
                    return;
                }
            } else {
                currentUser = data.account || null;
                if (!currentUser) {
                    // if server response is missing account, try local fallback
                    const local = tryLocalLogin(accountNumber, password);
                    if (local) {
                        currentUser = local;
                    } else {
                        showError('Invalid account data from server');
                        return;
                    }
                }
            }

        // persist user to localStorage so next visit shows dashboard immediately
        try {
            localStorage.setItem('nateCurrentUser', JSON.stringify(currentUser));
        } catch (err) {
            console.warn('Could not persist user to localStorage', err);
        }

        hideError();
        hideSection('loginSection');
        showSection('dashboardSection');
        // reveal sidebar after successful login
        toggleSidebar(true);
        populateDashboard();
    } catch (err) {
        console.error('Login error:', err);
        hideLoading();
        // network error - try a local fallback login
        const local = tryLocalLogin(accountNumber, password);
        if (local) {
            currentUser = local;
            hideError();
            hideSection('loginSection');
            showSection('dashboardSection');
            toggleSidebar(true);
            populateDashboard();
            return;
        }
        showError('An error occurred during login. Please try again.');
    }
}

// Try a local login using accounts stored in localStorage (useful for dev/offline)
function tryLocalLogin(accountNumber, password) {
    try {
        const stored = localStorage.getItem('nateRegisteredAccounts');
        if (!stored) return null;
        const accounts = JSON.parse(stored);
        if (!Array.isArray(accounts)) return null;
        const acc = accounts.find(a => String(a.accountNumber) === String(accountNumber) && (a.password === password || !password));
        if (!acc) return null;
        // only allow login if account is approved
        const approved = (acc.status && acc.status.toLowerCase() === 'approved') || acc.approved === true;
        if (!approved) return null;

        // normalize user object
        const user = {
            accountNumber: acc.accountNumber,
            fullName: acc.fullName || acc.name || 'User',
            email: acc.email || '',
            accountType: acc.accountType || 'Personal'
        };

        try { localStorage.setItem('nateCurrentUser', JSON.stringify(user)); } catch (e) { /* ignore */ }
        return user;
    } catch (e) {
        console.warn('Local login failed', e);
        return null;
    }
}

function populateDashboard() {
    if (!currentUser) return;
    
    // Update greeting
    const greetingEl = document.getElementById('userGreeting');
    if (greetingEl) greetingEl.textContent = `Welcome, ${currentUser.fullName || 'User'}!`;
    
    // Update display user name in dashboard greeting
    const displayUserNameEl = document.getElementById('displayUserName');
    if (displayUserNameEl) displayUserNameEl.textContent = currentUser.fullName || 'User';
    
    // Update account holder name
    const nameEl = document.getElementById('accountHolderName');
    if (nameEl) nameEl.textContent = currentUser.fullName || 'N/A';
    
    // Update account number
    const accNumEl = document.getElementById('displayAccountNumber');
    if (accNumEl) accNumEl.textContent = currentUser.accountNumber || 'N/A';
    
    // Update balance (default to 0 for demo)
    const balanceEl = document.getElementById('totalBalance');
    if (balanceEl) balanceEl.textContent = '$0.00';

    // Load incoming transfers for this account and show in history area
    // markSeen=true + render=true because user is viewing dashboard now
    try {
        refreshIncomingTransfers({ accountNumber: currentUser.accountNumber, markSeen: true, render: true })
            .then(() => startIncomingPoll(currentUser.accountNumber))
            .catch(err => console.error('Failed to initialize incoming transfers:', err));
    } catch (err) {
        console.error('Failed to initialize incoming transfers:', err);
    }
}

// Recipient lookup
let recipientLookupTimer = null;
async function handleRecipientLookup(e) {
    const input = (e.target.value || '').trim();
    const recipientInfoEl = document.getElementById('recipientInfo');
    const bankInfoEl = document.getElementById('detectedBankInfo');

    if (!input || input.length < 10) {
        hideElement(recipientInfoEl);
        hideElement(bankInfoEl);
        verifiedAccount = null;
        return;
    }

    // debounce
    if (recipientLookupTimer) clearTimeout(recipientLookupTimer);
    recipientLookupTimer = setTimeout(async () => {
        try {
            showLoading('Verifying account...');
            // include selected bank and country (if present) to help server-side detection
            const selectedBank = (document.getElementById('bankName') || {}).value || '';
            const selectedCountry = (document.getElementById('bankCountry') || {}).value || '';
            const res = await fetch(`${API_BASE_URL}/api/verify-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountNumber: input, bank: selectedBank, country: selectedCountry })
            });
            const data = await res.json();
            hideLoading();
            if (res.ok && data.account) {
                verifiedAccount = data.account;
                if (recipientInfoEl) {
                    recipientInfoEl.innerHTML = `<div class="recipient-verified"><i class="fas fa-check-circle"></i> <strong>${escapeHtml(data.account.fullName || 'Unknown')}</strong><small>${escapeHtml(data.account.accountNumber || '')}</small></div>`;
                    showElement(recipientInfoEl);
                }
                
                // Detect and display bank information
                if (bankInfoEl && data.account.bank) {
                    bankInfoEl.innerHTML = `<div class="bank-detected"><i class="fas fa-building"></i> <strong>Bank:</strong> ${escapeHtml(data.account.bank)}</div>`;
                    showElement(bankInfoEl);
                } else if (bankInfoEl) {
                    hideElement(bankInfoEl);
                }
            } else {
                verifiedAccount = null;
                if (recipientInfoEl) {
                    recipientInfoEl.innerHTML = '<div class="recipient-error"><i class="fas fa-exclamation-circle"></i> Account not found</div>';
                    showElement(recipientInfoEl);
                }
                if (bankInfoEl) {
                    hideElement(bankInfoEl);
                }
            }
        } catch (err) {
            console.error('Verification error:', err);
            hideLoading();
            verifiedAccount = null;
            if (recipientInfoEl) {
                recipientInfoEl.innerHTML = '<div class="recipient-error"><i class="fas fa-exclamation-circle"></i> Error verifying account</div>';
                showElement(recipientInfoEl);
            }
            if (bankInfoEl) {
                hideElement(bankInfoEl);
            }
        }
    }, 400);
}

function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Incoming transfers polling and UI helpers
let incomingPollInterval = null;
let incomingPollPeriodMs = 15000; // 15s

function getLastSeenKey(accountNumber) {
    return `nate_last_seen_transfers_${accountNumber}`;
}

async function fetchIncomingTransfersFor(accountNumber) {
    if (!accountNumber) return [];
    try {
        const resp = await fetch(`${API_BASE_URL}/api/incoming-transfers?accountNumber=${encodeURIComponent(accountNumber)}`);
        if (!resp.ok) return [];
        const json = await resp.json();
        return (json && json.data) || [];
    } catch (err) {
        console.warn('fetchIncomingTransfersFor error', err);
        return [];
    }
}

function updateIncomingBadge(accountNumber, items) {
    const badge = document.getElementById('incomingBadge');
    if (!badge || !accountNumber) return;
    const key = getLastSeenKey(accountNumber);
    const lastSeen = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    const unseen = Math.max(0, (items.length || 0) - lastSeen);
    if (unseen > 0) {
        badge.textContent = String(unseen);
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
    // also update the nav badge (history nav)
    try {
        const navBadge = document.getElementById('historyBadgeNav');
        if (navBadge) {
            if (unseen > 0) {
                navBadge.textContent = String(unseen);
                navBadge.classList.remove('hidden');
            } else {
                navBadge.classList.add('hidden');
            }
        }
    } catch (e) { /* ignore */ }
}

function renderIncomingHistory(items) {
    const historyEl = document.getElementById('transactionHistory');
    if (!historyEl) return;
    if (!items || !items.length) {
        historyEl.innerHTML = '<p class="empty-message">No transactions yet</p>';
        return;
    }
    const listHtml = items.map(t => {
        const when = t.timestamp ? (new Date(t.timestamp)).toLocaleString() : (t.processedAt ? (new Date(t.processedAt)).toLocaleString() : '');
        const amount = typeof t.amount === 'number' ? `$${t.amount.toFixed(2)}` : (t.amount || '');
        const from = t.sourceAccountNumber || t.from || 'External';
        return `
            <div class="transaction-item">
                <div class="tx-top"><strong>${escapeHtml(t.recipientName || t.recipient || '')}</strong> <span class="tx-amount">${amount}</span></div>
                <div class="tx-meta">To: ${escapeHtml(t.recipientAccountNumber || t.accountNumber || '')} • From: ${escapeHtml(from)} • ${escapeHtml(t.bank || '')}</div>
                <div class="tx-time">${escapeHtml(when)}</div>
            </div>
        `;
    }).join('');
    historyEl.innerHTML = listHtml;
}

async function refreshIncomingTransfers({ accountNumber, markSeen = false, render = false } = {}) {
    if (!accountNumber) return;
    const historyEl = document.getElementById('transactionHistory');
    if (render && historyEl) historyEl.innerHTML = '<p class="empty-message">Loading transactions...</p>';
    const items = await fetchIncomingTransfersFor(accountNumber);
    // previous last-seen count
    const key = getLastSeenKey(accountNumber);
    const prevSeen = parseInt(localStorage.getItem(key) || '0', 10) || 0;
    updateIncomingBadge(accountNumber, items);
    if (render) {
        renderIncomingHistory(items);
    }
    if (markSeen) {
        try { localStorage.setItem(getLastSeenKey(accountNumber), String(items.length || 0)); } catch (e) { /* ignore */ }
        updateIncomingBadge(accountNumber, items);
    }
    // If not marking seen and new items arrived, notify the user (toast) if history not visible
    try {
        if (!markSeen) {
            const historySection = document.getElementById('historySection');
            const historyVisible = historySection && !historySection.classList.contains('hidden');
            const newCount = Math.max(0, (items.length || 0) - prevSeen);
            if (newCount > 0 && !historyVisible) {
                window._lastNotifiedTransfers = window._lastNotifiedTransfers || {};
                const lastN = window._lastNotifiedTransfers[accountNumber] || 0;
                if (items.length > lastN) {
                    showToast(`You have ${newCount} new incoming transfer${newCount > 1 ? 's' : ''}`);
                    window._lastNotifiedTransfers[accountNumber] = items.length;
                }
            }
        }
    } catch (e) { /* ignore */ }
}

function startIncomingPoll(accountNumber) {
    if (!accountNumber) return;
    if (incomingPollInterval) clearInterval(incomingPollInterval);
    // Start interval only when tab is visible
    if (document.visibilityState === 'visible') {
        incomingPollInterval = setInterval(() => {
            refreshIncomingTransfers({ accountNumber, markSeen: false, render: false });
        }, incomingPollPeriodMs);
    }
    // ensure visibility handler is attached
    document.removeEventListener('visibilitychange', _handleVisibilityChange);
    document.addEventListener('visibilitychange', _handleVisibilityChange);
}

function stopIncomingPoll() {
    if (incomingPollInterval) {
        clearInterval(incomingPollInterval);
        incomingPollInterval = null;
    }
    document.removeEventListener('visibilitychange', _handleVisibilityChange);
}

function _handleVisibilityChange() {
    try {
        if (!currentUser || !currentUser.accountNumber) return;
        if (document.visibilityState === 'visible') {
            // refresh immediately then start interval
            refreshIncomingTransfers({ accountNumber: currentUser.accountNumber, markSeen: false, render: false })
                .then(() => {
                    if (incomingPollInterval) clearInterval(incomingPollInterval);
                    incomingPollInterval = setInterval(() => {
                        refreshIncomingTransfers({ accountNumber: currentUser.accountNumber, markSeen: false, render: false });
                    }, incomingPollPeriodMs);
                })
                .catch(() => { /* ignore */ });
        } else {
            if (incomingPollInterval) {
                clearInterval(incomingPollInterval);
                incomingPollInterval = null;
            }
        }
    } catch (e) { /* ignore */ }
}

// Simple toast notification helper
function showToast(message, timeout = 5000) {
    try {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = message;
        container.appendChild(t);
        // auto-remove after timeout
        setTimeout(() => {
            t.classList.add('fade-out');
            setTimeout(() => { try { container.removeChild(t); } catch (e) { /* ignore */ } }, 500);
        }, timeout);
    } catch (e) { console.warn('showToast error', e); }
}

// Transfer
async function handleTransfer(e) {
    e.preventDefault();
    if (!currentUser) {
        showError('Please login first');
        return;
    }

    const recipientAccount = (document.getElementById('recipientAccount') || {}).value || '';
    const amountStr = (document.getElementById('transferAmount') || {}).value || '';
    const description = (document.getElementById('transferDescription') || {}).value || 'Transfer';
    const termsChecked = (document.getElementById('termsCheck') || {}).checked;

    if (!recipientAccount || !amountStr) {
        showError('Please enter recipient account and amount');
        return;
    }

    if (!verifiedAccount || verifiedAccount.accountNumber !== recipientAccount.trim()) {
        showError('Please select a valid recipient');
        return;
    }

    if (!termsChecked) {
        showError('Please agree to the terms and conditions');
        return;
    }

    if (recipientAccount.trim() === currentUser.accountNumber) {
        showError('Cannot transfer to the same account');
        return;
    }

    const amountNum = parseFloat(amountStr);
    if (Number.isNaN(amountNum) || amountNum <= 0) {
        showError('Amount must be greater than 0');
        return;
    }

    try {
        showLoading('Processing transfer...');
        const res = await fetch(`${API_BASE_URL}/api/nate-to-nate-transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sourceAccount: currentUser.accountNumber,
                destinationAccount: recipientAccount.trim(),
                amount: amountNum,
                description
            })
        });
        const data = await res.json();
        hideLoading();
        if (!res.ok) {
            showError(data.message || 'Transfer failed');
            return;
        }

        // success
        verifiedAccount = null;
        document.getElementById('transferForm') && document.getElementById('transferForm').reset();
        displaySuccess({ transactionId: data.transferId || data.id || 'N/A', amount: amountNum, recipient: data.recipient || data.destination || verifiedAccount && verifiedAccount.fullName });
    } catch (err) {
        console.error('Transfer error:', err);
        hideLoading();
        showError('An error occurred during transfer. Please try again.');
    }
}

function displaySuccess(data) {
    hideSection('dashboardSection');
    hideSection('transferSection');
    hideSection('errorSection');
    const successSection = document.getElementById('successSection');
    if (!successSection) return;
    const txEl = document.getElementById('transactionId');
    const amountEl = document.getElementById('successAmount');
    const recEl = document.getElementById('successRecipient');
    if (txEl) txEl.textContent = data.transactionId || 'N/A';
    if (amountEl) amountEl.textContent = '₦' + (data.amount || 0).toLocaleString();
    if (recEl) recEl.textContent = data.recipient || '';
    showSection('successSection');
    setTimeout(() => {
        // return to transfer after brief success display
        hideSection('successSection');
        showSection('dashboardSection');
    }, 5000);
}

function resetForm() {
    const transferForm = document.getElementById('transferForm');
    if (transferForm) transferForm.reset();
    hideElement(document.getElementById('recipientInfo'));
    verifiedAccount = null;
}

function handleLogout() {
    currentUser = null;
    verifiedAccount = null;
    try { localStorage.removeItem('nateCurrentUser'); } catch (e) { /* ignore */ }
    hideSection('dashboardSection');
    hideSection('transferSection');
    hideSection('successSection');
    hideSection('errorSection');
    showSection('loginSection');
    // hide sidebar on logout so login page doesn't show navigation
    toggleSidebar(false);
    // Stop incoming transfers polling when logging out
    try { stopIncomingPoll(); } catch (e) { /* ignore */ }
}

// UI helpers
function showSection(id) {
    // Hide all sections first
    const allSections = document.querySelectorAll('.section');
    allSections.forEach(section => {
        section.classList.add('hidden');
        section.style.display = 'none';
    });
    
    // Show the requested section
    const section = document.getElementById(id);
    if (!section) return;
    section.classList.remove('hidden');
    section.style.display = 'flex';
    // If user navigated to history, load and mark incoming transfers as seen
    if (id === 'historySection' && currentUser && currentUser.accountNumber) {
        refreshIncomingTransfers({ accountNumber: currentUser.accountNumber, markSeen: true, render: true });
    }
}

function hideSection(id) {
    const section = document.getElementById(id);
    if (!section) return;
    section.classList.add('hidden');
    section.style.display = 'none';
}

function showElement(el) {
    if (!el) return;
    el.classList.remove('hidden');
    el.style.display = 'block';
}

function hideElement(el) {
    if (!el) return;
    el.classList.add('hidden');
    el.style.display = 'none';
}

function showError(message) {
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) errorMessage.textContent = message;
    if (errorSection) {
        errorSection.style.display = 'block';
    }
}

function hideError() {
    const errorSection = document.getElementById('errorSection');
    if (errorSection) errorSection.style.display = 'none';
}

function showLoading(message) {
    const loadingSection = document.getElementById('loadingSection');
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) loadingMessage.textContent = message || 'Loading...';
    if (loadingSection) loadingSection.style.display = 'block';
}

function hideLoading() {
    const loadingSection = document.getElementById('loadingSection');
    if (loadingSection) loadingSection.style.display = 'none';
}

// Bank transfer account lookup (fills recipient name and shows detected bank)
let bankLookupTimer = null;
async function handleBankAccountLookup(e) {
    const input = (e.target.value || '').trim();
    const bankAccountInfoEl = document.getElementById('bankAccountInfo');
    const recipientNameEl = document.getElementById('recipientName');
    const bankVerifyWarningEl = document.getElementById('bankVerifyWarning');
    const proceedBtn = document.getElementById('proceedUnverifiedBtn');
    const verifyAgainBtn = document.getElementById('verifyAgainBtn');

    if (!input || input.length < 6) {
        if (bankAccountInfoEl) hideElement(bankAccountInfoEl);
        return;
    }

    if (bankLookupTimer) clearTimeout(bankLookupTimer);
    bankLookupTimer = setTimeout(async () => {
        try {
            showLoading('Checking account...');
            // include selected bank and country to query external registries
            const selectedBank = (document.getElementById('bankName') || {}).value || '';
            const selectedCountry = (document.getElementById('bankCountry') || {}).value || '';
            const res = await fetch(`${API_BASE_URL}/api/verify-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountNumber: input, bank: selectedBank, country: selectedCountry })
            });
            const data = await res.json();
            hideLoading();
            if (res.ok && data.account) {
                // global verification state used by the bank transfer submit flow
                window.bankVerification = window.bankVerification || { allowed: false, account: null };
                window.bankVerification.account = data.account;
                window.bankVerification.allowed = false; // require explicit proceed for external/external-like responses

                // fill recipient name if empty
                if (recipientNameEl && (!recipientNameEl.value || recipientNameEl.value.trim().length === 0)) {
                    recipientNameEl.value = data.account.fullName || '';
                }

                if (data.account.status === 'external' || (data.account && data.account.bank && selectedBank && data.account.bank.toLowerCase() !== selectedBank.toLowerCase())) {
                    // show a non-blocking warning allowing user to proceed
                    if (bankAccountInfoEl) {
                        bankAccountInfoEl.innerHTML = `<div class="bank-detected"><i class="fas fa-user-circle"></i> <strong>${escapeHtml(data.account.fullName || 'Unknown')}</strong> — ${escapeHtml(data.account.bank || '')}</div>`;
                        showElement(bankAccountInfoEl);
                    }
                    if (bankVerifyWarningEl) {
                        bankVerifyWarningEl.classList.remove('hidden');
                        // set friendly message
                        const msg = document.getElementById('bankVerifyMessage');
                        if (msg) msg.textContent = 'External or unverified account detected. You can proceed, but NATE cannot guarantee the recipient name.';
                        showElement(bankVerifyWarningEl);
                    }
                    // wire proceed / verify again buttons (idempotent)
                    if (proceedBtn) {
                        proceedBtn.onclick = () => {
                            window.bankVerification.allowed = true;
                            if (bankVerifyWarningEl) bankVerifyWarningEl.classList.add('hidden');
                        };
                    }
                    if (verifyAgainBtn) {
                        verifyAgainBtn.onclick = () => {
                            // re-run lookup by dispatching input event
                            const acctEl = document.getElementById('accountNumber');
                            if (acctEl) acctEl.dispatchEvent(new Event('input'));
                        };
                    }
                } else {
                    // internal-approved or matching bank
                    window.bankVerification.allowed = true;
                    if (bankAccountInfoEl) {
                        bankAccountInfoEl.innerHTML = `<div class="bank-detected"><i class="fas fa-user-circle"></i> <strong>${escapeHtml(data.account.fullName || 'Unknown')}</strong> — ${escapeHtml(data.account.bank || '')}</div>`;
                        showElement(bankAccountInfoEl);
                    }
                    if (bankVerifyWarningEl) bankVerifyWarningEl.classList.add('hidden');
                }
            } else {
                if (bankAccountInfoEl) {
                    bankAccountInfoEl.innerHTML = `<div class="recipient-error"><i class="fas fa-exclamation-circle"></i> Account not found</div>`;
                    showElement(bankAccountInfoEl);
                }
                // clear verification state
                window.bankVerification = { allowed: false, account: null };
            }
        } catch (err) {
            console.error('Bank lookup error:', err);
            hideLoading();
            if (bankAccountInfoEl) {
                bankAccountInfoEl.innerHTML = `<div class="recipient-error"><i class="fas fa-exclamation-circle"></i> Error checking account</div>`;
                showElement(bankAccountInfoEl);
            }
        }
    }, 450);
}
