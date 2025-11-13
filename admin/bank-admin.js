// NATE Bank Admin Panel - JavaScript

// Determine API base URL with a few fallbacks:
// 1. window.API_BASE_URL (manual override you can set in the page)
// 2. If page is running from a non-local origin, use window.location.origin
// 3. If page is served from a static local dev server (e.g. Live Server on :5500),
//    fall back to the deployed Render URL so the admin UI can call the real API
const API_BASE_URL = (() => {
    // Manual override (useful for local testing)
    if (window.API_BASE_URL) return window.API_BASE_URL;

    const host = window.location.hostname;
    const origin = window.location.origin;

    // Detect common local dev servers (Live Server, etc.). Adjust ports if you use different dev servers.
    const isLikelyStaticDevServer = host === 'localhost' || host === '127.0.0.1' || origin.includes(':5500') || origin.includes(':8080');

    if (isLikelyStaticDevServer) {
        // Prefer the deployed API for convenience so the admin UI works when opened from VS Code Live Server.
        // If you want to test against a local backend, start the backend (node server.js) and set
        // window.API_BASE_URL = 'http://localhost:3000' in the console before the scripts run.
        return 'https://phone-4hza.onrender.com';
    }

    // In normal (deployed) case, talk to same origin
    return origin;
})();

// Debug: show which API_BASE_URL the client is using (helps verify deployed vs local)
console.log('🔎 bank-admin: computed API_BASE_URL =', API_BASE_URL);

let allApplications = [];
let allTransfers = [];
let allRegisteredAccounts = [];

// Built-in fallback registered accounts (mirrors data/registeredBankAccounts.json)
const FALLBACK_REGISTERED_ACCOUNTS = [
    {
        "id": "demo-reg-001",
        "bank": "Zenith Bank",
        "accountNumber": "1234512345",
        "accountHolderName": "Ahmed Hassan",
        "country": "NG",
        "status": "registered",
        "registeredAt": "2025-11-13T02:30:00.000Z",
        "verifiedAt": "2025-11-13T02:30:00.000Z"
    },
    {
        "id": "demo-reg-002",
        "bank": "GTBank",
        "accountNumber": "0140149185",
        "accountHolderName": "Chioma Eze",
        "country": "NG",
        "status": "registered",
        "registeredAt": "2025-11-13T02:30:00.000Z",
        "verifiedAt": "2025-11-13T02:30:00.000Z"
    },
    {
        "id": "demo-reg-003",
        "bank": "Access Bank",
        "accountNumber": "1234567890",
        "accountHolderName": "Tunde Adeyemi",
        "country": "NG",
        "status": "registered",
        "registeredAt": "2025-11-13T02:30:00.000Z",
        "verifiedAt": "2025-11-13T02:30:00.000Z"
    },
    {
        "id": "demo-reg-004",
        "bank": "Opay",
        "accountNumber": "9876543210",
        "accountHolderName": "Zainab Mohammed",
        "country": "NG",
        "status": "registered",
        "registeredAt": "2025-11-13T02:30:00.000Z",
        "verifiedAt": "2025-11-13T02:30:00.000Z"
    },
    {
        "id": "demo-reg-005",
        "bank": "Canadian Bank",
        "accountNumber": "2075861747",
        "accountHolderName": "Oluniyi Funmilayo Abigeli",
        "country": "CA",
        "status": "registered",
        "registeredAt": "2025-11-13T06:00:00.000Z",
        "verifiedAt": "2025-11-13T06:00:00.000Z"
    }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // Check server health/info first (updates header badge), then load data
    loadServerInfo();
    loadApplications();
    updateStats();
});

// Load server health and show startup marker / commit if available
async function loadServerInfo() {
    const el = document.getElementById('serverInfo');
    if (!el) return;
    try {
        const resp = await fetch(`${API_BASE_URL}/__health`);
        if (resp.ok) {
            const j = await resp.json();
            const marker = j.startup_marker || j.commit || '';
            el.textContent = `Server: live ${marker ? `(${marker})` : ''}`;
            el.style.color = '#0b8a3e';
            return;
        }
        el.textContent = `Server: unreachable (status ${resp.status})`;
        el.style.color = '#aa7700';
    } catch (err) {
        el.textContent = 'Server: unreachable (using fallback)';
        el.style.color = '#888';
        // Add a retry control so the admin can try reconnecting without reloading the page
        addServerRetryButton(el);
    }
}

function addServerRetryButton(containerEl) {
    // Avoid adding multiple buttons
    if (document.getElementById('serverRetryBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'serverRetryBtn';
    btn.textContent = 'Retry';
    btn.title = 'Retry server connection';
    btn.style.marginLeft = '12px';
    btn.style.padding = '4px 8px';
    btn.style.fontSize = '0.85rem';
    btn.onclick = async () => {
        btn.disabled = true;
        btn.textContent = 'Checking...';
        try {
            await loadServerInfo();
            // also attempt loading applications again when server comes back
            await loadApplications();
        } finally {
            btn.disabled = false;
            btn.textContent = 'Retry';
        }
    };
    containerEl.appendChild(btn);
}

function updateServerInfoDataLabel(source) {
    const el = document.getElementById('serverInfo');
    if (!el) return;
    const base = (el.textContent || '').replace(/\s*\|\s*Data:.*/,'');
    el.textContent = `${base} | Data: ${source}`;
}

// Setup Event Listeners
function setupEventListeners() {
    // Sidebar Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
            updateActiveLink(link);
        });
    });

    // Filter
    document.getElementById('statusFilter').addEventListener('change', filterApplications);
    document.getElementById('typeFilter').addEventListener('change', filterApplications);

    // Search
    document.getElementById('searchInput').addEventListener('input', filterApplications);

    // Buttons
    document.getElementById('exportBtn')?.addEventListener('click', exportData);
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
        loadApplications();
        updateStats();
    });

    // Modal Close
    document.querySelector('.modal-close')?.addEventListener('click', () => {
        document.getElementById('detailModal').classList.remove('show');
    });

    document.querySelector('.btn-close')?.addEventListener('click', () => {
        document.getElementById('detailModal').classList.remove('show');
    });
}

// Show Section
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId)?.classList.add('active');
}

// Update Active Link
function updateActiveLink(link) {
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active');
    });
    link.classList.add('active');
}

// Load Applications
async function loadApplications() {
    // Try fetching from API, but have a few local static fallbacks for offline/workspace usage
    const localCandidates = [
        // Prefer top-level pendingApplications.json in the repo (common location)
        './pendingApplications.json',
        '../pendingApplications.json',
        '/pendingApplications.json',
        'pendingApplications.json',
        // Also try older data/ locations
        './data/pendingApplications.json',    // admin/data (if present)
        '../data/pendingApplications.json',   // repository data folder when opened from admin/ directory
        '/data/pendingApplications.json',     // absolute path from site root
        'data/pendingApplications.json'       // relative path fallback
    ];

    try {
        const response = await fetch(`${API_BASE_URL}/api/applications`);
        if (response.ok) {
            const result = await response.json();
            // Handle both formats: direct array or wrapped in data property
            allApplications = Array.isArray(result) ? result : (result.data || []);
            updateServerInfoDataLabel('server');
        } else {
            // Try local static JSON files before falling back to localStorage
            const local = await tryLocalJson(localCandidates);
            if (local) {
                allApplications = Array.isArray(local) ? local : (local.data || []);
                updateServerInfoDataLabel('static-local');
            } else {
                allApplications = loadFromLocalStorage();
                updateServerInfoDataLabel('fallback-storage');
            }
        }

        // Load transfers
        await loadTransfers();
        // Load registered bank accounts (for active accounts view)
        await loadRegisteredAccounts();

        populateTables();
        updateStats();
    } catch (error) {
        console.error('Error loading applications:', error);
        // Likely network error: attempt local JSON fallbacks then localStorage
        try {
            const local = await tryLocalJson(localCandidates);
            if (local) {
                allApplications = Array.isArray(local) ? local : (local.data || []);
                updateServerInfoDataLabel('static-local');
            } else {
                allApplications = loadFromLocalStorage();
                updateServerInfoDataLabel('fallback-storage');
            }
        } catch (err) {
            console.warn('Local fallback attempt failed:', err);
            allApplications = loadFromLocalStorage();
            updateServerInfoDataLabel('fallback-storage');
        }

        populateTables();
    }
}

// Try several local JSON file paths (useful when working in the repo offline)
async function tryLocalJson(paths) {
    for (const p of paths) {
        try {
            const resp = await fetch(p);
            if (resp && resp.ok) {
                return await resp.json();
            }
        } catch (err) {
            // ignore and try next path
        }
    }
    return null;
}

// Load Transfers
async function loadTransfers() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/transfers`);
        if (response.ok) {
            const result = await response.json();
            allTransfers = Array.isArray(result) ? result : (result.data || []);
        } else {
            allTransfers = [];
        }
    } catch (error) {
        console.error('Error loading transfers:', error);
        allTransfers = [];
    }
}

// Load Registered Accounts
async function loadRegisteredAccounts() {
    try {
        // If API_BASE_URL is empty (local dev), use relative path
        const base = API_BASE_URL || '';
        let response;
        try {
            response = await fetch(`${base}/api/registered-accounts`);
        } catch (err) {
            response = null;
        }

        if (response && response.ok) {
            const result = await response.json();
            allRegisteredAccounts = Array.isArray(result) ? result : (result.data || []);
            // indicate data came from server
            const el = document.getElementById('serverInfo');
            if (el) el.textContent = (el.textContent.replace(/\s*\|\s*Data:.*/,'') || 'Server') + ` | Data: server`;
            return;
        }

        // If API explicitly returns 404, try a same-origin static file first (some deployments
        // serve the JSON at /data/registeredBankAccounts.json). If that also fails, fall back
        // to the embedded demo data.
        if (response && response.status === 404) {
            console.info('Registered accounts API returned 404 — attempting several local/static fallbacks before embedded demo');

            // 1) Try same-origin absolute path (useful when static site is deployed at same domain)
            try {
                const originStatic = await fetch(`${window.location.origin}/data/registeredBankAccounts.json`);
                if (originStatic.ok) {
                    const data = await originStatic.json();
                    allRegisteredAccounts = Array.isArray(data) ? data : (data.data || []);
                    const el = document.getElementById('serverInfo');
                    if (el) el.textContent = (el.textContent.replace(/\s*\|\s*Data:.*/,'') || 'Server') + ` | Data: static-origin`;
                    return;
                } else {
                    console.info('Same-origin origin/static file not available (status:', originStatic.status, ')');
                }
            } catch (err) {
                console.warn('Origin static fetch failed:', err);
            }

            // 2) Try API host static path (legacy attempt)
            try {
                const staticResp = await fetch(`${base}/data/registeredBankAccounts.json`);
                if (staticResp.ok) {
                    const staticData = await staticResp.json();
                    allRegisteredAccounts = Array.isArray(staticData) ? staticData : (staticData.data || []);
                    const el = document.getElementById('serverInfo');
                    if (el) el.textContent = (el.textContent.replace(/\s*\|\s*Data:.*/,'') || 'Server') + ` | Data: static-api-host`;
                    return;
                } else {
                    console.info('API-host static file not available (status:', staticResp.status, ')');
                }
            } catch (err) {
                console.warn('API-host static fetch failed:', err);
            }

            // 3) Try relative path from current page (./data/...) — useful when opening admin from a folder or local static server
            try {
                const relResp = await fetch('./data/registeredBankAccounts.json');
                if (relResp.ok) {
                    const relData = await relResp.json();
                    allRegisteredAccounts = Array.isArray(relData) ? relData : (relData.data || []);
                    const el = document.getElementById('serverInfo');
                    if (el) el.textContent = (el.textContent.replace(/\s*\|\s*Data:.*/,'') || 'Server') + ` | Data: static-relative`;
                    return;
                } else {
                    console.info('Relative static file not available (status:', relResp.status, ')');
                }
            } catch (err) {
                console.warn('Relative static fetch failed:', err);
            }

            // Final embedded fallback
            console.info('All static fallbacks failed — using embedded fallback data');
            allRegisteredAccounts = FALLBACK_REGISTERED_ACCOUNTS;
            const el = document.getElementById('serverInfo');
            if (el) el.textContent = (el.textContent.replace(/\s*\|\s*Data:.*/,'') || 'Server') + ` | Data: fallback`;
            return;
        }

        // Otherwise, attempt a remote fallback (raw GitHub) for convenience; if that fails, use embedded fallback.
        try {
            const rawUrl = 'https://raw.githubusercontent.com/Ayo454/Phone/main/data/registeredBankAccounts.json';
            const rawResp = await fetch(rawUrl);
            if (rawResp.ok) {
                const rawData = await rawResp.json();
                allRegisteredAccounts = Array.isArray(rawData) ? rawData : (rawData.data || []);
                const el = document.getElementById('serverInfo');
                if (el) el.textContent = (el.textContent.replace(/\s*\|\s*Data:.*/,'') || 'Server') + ` | Data: github-fallback`;
                return;
            } else {
                console.info('Raw GitHub file not available (status:', rawResp.status, ') — using embedded fallback');
            }
        } catch (err) {
            console.warn('Fallback to raw GitHub file failed:', err);
        }

        // Final fallback: use embedded demo data
        allRegisteredAccounts = FALLBACK_REGISTERED_ACCOUNTS;
    } catch (error) {
        console.error('Error loading registered accounts:', error);
        allRegisteredAccounts = FALLBACK_REGISTERED_ACCOUNTS;
    }
}

// Load from Local Storage Fallback
function loadFromLocalStorage() {
    const stored = localStorage.getItem('bankApplications');
    return stored ? JSON.parse(stored) : [];
}

// Populate Tables
function populateTables() {
    const dashboardBody = document.getElementById('dashboardTableBody');
    const applicationsBody = document.getElementById('applicationsTableBody');
    const approvalsBody = document.getElementById('approvalsTableBody');
    const accountsContainer = document.getElementById('accountsContainer');

    // Dashboard - Recent Applications
    dashboardBody.innerHTML = '';
    allApplications.slice(0, 5).forEach(app => {
        const row = createTableRow(app);
        dashboardBody.appendChild(row);
    });

    if (allApplications.length === 0) {
        dashboardBody.innerHTML = '<tr><td colspan="8" class="empty-state">No applications yet</td></tr>';
    }

    // Applications - All Applications
    applicationsBody.innerHTML = '';
    allApplications.forEach(app => {
        const row = createTableRow(app);
        applicationsBody.appendChild(row);
    });

    if (allApplications.length === 0) {
        applicationsBody.innerHTML = '<tr><td colspan="9" class="empty-state">No applications found</td></tr>';
    }

    // Approvals - Pending Only
    approvalsBody.innerHTML = '';
    const pendingApps = allApplications.filter(app => app.status === 'pending');
    
    if (pendingApps.length > 0) {
        pendingApps.forEach(app => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${app.accountNumber || 'N/A'}</td>
                <td>${app.fullName || 'N/A'}</td>
                <td>${app.accountType || 'N/A'}</td>
                <td>${app.email || 'N/A'}</td>
                <td>${new Date(app.applicationDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn-approve" onclick="approveApplication('${app.accountNumber}')">Approve</button>
                    <button class="btn-reject" onclick="rejectApplication('${app.accountNumber}')">Reject</button>
                </td>
            `;
            approvalsBody.appendChild(row);
        });
    } else {
        approvalsBody.innerHTML = '<tr><td colspan="6" class="empty-state">No pending approvals</td></tr>';
    }

    // Active Accounts - Approved Only with Transfers
    accountsContainer.innerHTML = '';
    // Merge approved NATE applications with registered bank accounts and dedupe by account number
    const approvedApps = allApplications.filter(app => app.status === 'approved') || [];
    const registered = allRegisteredAccounts || [];

    // Map registered accounts to a compatible shape
    const mappedRegistered = registered.map(r => ({
        accountNumber: r.accountNumber,
        fullName: r.accountHolderName || r.fullName || 'N/A',
        accountType: r.accountType || 'Registered Account',
        email: r.email || '',
        phone: r.phone || '',
        status: r.status || 'registered'
    }));

    // Combine and dedupe (prefer application record if duplicate)
    const byAcc = {};
    approvedApps.concat(mappedRegistered).forEach(a => {
        byAcc[String(a.accountNumber)] = byAcc[String(a.accountNumber)] || a;
    });

    const activeAccounts = Object.values(byAcc);

    if (activeAccounts.length > 0) {
        const accountsTable = document.createElement('table');
        accountsTable.className = 'table';
        accountsTable.innerHTML = `
            <thead>
                <tr>
                    <th>Account #</th>
                    <th>Name</th>
                    <th>Account Type</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Total Received</th>
                    <th>Transfer Count</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody id="activeAccountsBody">
            </tbody>
        `;
        accountsContainer.appendChild(accountsTable);
        
        const tbody = accountsTable.querySelector('tbody');
        activeAccounts.forEach(account => {
            // Calculate transfers received
            const receivedTransfers = allTransfers.filter(t => t.destinationAccountNumber === account.accountNumber);
            const totalReceived = receivedTransfers.reduce((sum, t) => sum + (t.amount || 0), 0);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${account.accountNumber}</strong></td>
                <td>${account.fullName || 'N/A'}</td>
                <td>${account.accountType || 'N/A'}</td>
                <td>${account.email || 'N/A'}</td>
                <td>${account.phone || 'N/A'}</td>
                <td class="amount-column">$${totalReceived.toFixed(2)}</td>
                <td>${receivedTransfers.length}</td>
                <td><span class="status-badge status-approved">APPROVED</span></td>
            `;
            tbody.appendChild(row);
        });
    } else {
        accountsContainer.innerHTML = '<p class="empty-state">No active approved accounts</p>';
    }
}

// Create Table Row
function createTableRow(app) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><strong>${app.accountNumber || 'N/A'}</strong></td>
        <td>${app.fullName || 'N/A'}</td>
        <td>${app.accountType || 'N/A'}</td>
        <td>${app.email || 'N/A'}</td>
        <td>${app.phone || 'N/A'}</td>
        <td>${app.country || 'N/A'}</td>
        <td>
            <span class="status-badge status-${app.status || 'pending'}">
                ${(app.status || 'pending').toUpperCase()}
            </span>
        </td>
        <td>${new Date(app.applicationDate).toLocaleDateString()}</td>
        <td>
            <button onclick="viewDetails('${app.accountNumber}')" class="btn-view">View</button>
        </td>
    `;
    return row;
}

// View Details
function viewDetails(accountNumber) {
    const app = allApplications.find(a => a.accountNumber === accountNumber);
    if (!app) return;

    const modal = document.getElementById('detailModal');
    const content = document.getElementById('detailContent');

    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item">
                <label>Account Number</label>
                <p>${app.accountNumber}</p>
            </div>
            <div class="detail-item">
                <label>Full Name</label>
                <p>${app.fullName}</p>
            </div>
            <div class="detail-item">
                <label>Account Type</label>
                <p>${app.accountType}</p>
            </div>
            <div class="detail-item">
                <label>Email</label>
                <p>${app.email}</p>
            </div>
            <div class="detail-item">
                <label>Phone</label>
                <p>${app.phone}</p>
            </div>
            <div class="detail-item">
                <label>Date of Birth</label>
                <p>${app.dateOfBirth || 'N/A'}</p>
            </div>
            <div class="detail-item">
                <label>Country</label>
                <p>${app.country || 'N/A'}</p>
            </div>
            <div class="detail-item">
                <label>Status</label>
                <p class="status-${app.status}">${(app.status || 'pending').toUpperCase()}</p>
            </div>
            <div class="detail-item">
                <label>Applied Date</label>
                <p>${new Date(app.applicationDate).toLocaleString()}</p>
            </div>
        </div>
    `;

    modal.classList.add('show');
    
    // Store current account number for approval/rejection
    document.getElementById('approveBtn').onclick = () => approveApplication(accountNumber);
    document.getElementById('rejectBtn').onclick = () => rejectApplication(accountNumber);
}

// Approve Application
function approveApplication(accountNumber) {
    const app = allApplications.find(a => a.accountNumber === accountNumber);
    if (!app) {
        alert('Application not found');
        return;
    }

    // Send to server
    updateApplicationStatus(accountNumber, 'approved');
}

// Reject Application
function rejectApplication(accountNumber) {
    if (confirm('Are you sure you want to reject this application?')) {
        updateApplicationStatus(accountNumber, 'rejected');
    }
}

// Update Application Status on Server
async function updateApplicationStatus(accountNumber, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/applications/${accountNumber}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: status })
        });

        if (response.ok) {
            const result = await response.json();
            // Update local array
            const appIndex = allApplications.findIndex(a => a.accountNumber === accountNumber);
            if (appIndex !== -1) {
                allApplications[appIndex].status = status;
            }
            
            // Refresh UI
            updateStats();
            populateTables();
            document.getElementById('detailModal').classList.remove('show');
            
            const statusText = status === 'approved' ? 'approved' : 'rejected';
            alert(`Application ${statusText} successfully!`);
        } else {
            const errorData = await response.json();
            alert(`Error: ${errorData.message}`);
        }
    } catch (error) {
        console.error('Error updating application status:', error);
        alert('Failed to update application status. Please try again.');
    }
}

// Update Stats
function updateStats() {
    const personalCount = allApplications.filter(a => a.accountType === 'Personal Account').length;
    const businessCount = allApplications.filter(a => a.accountType === 'Business Account').length;
    const savingsCount = allApplications.filter(a => a.accountType === 'Savings Account').length;
    const pendingCount = allApplications.filter(a => a.status === 'pending').length;

    document.getElementById('personalCount').textContent = personalCount;
    document.getElementById('businessCount').textContent = businessCount;
    document.getElementById('savingsCount').textContent = savingsCount;
    document.getElementById('pendingCount').textContent = pendingCount;
}

// Filter Applications
function filterApplications() {
    const status = document.getElementById('statusFilter').value;
    const type = document.getElementById('typeFilter').value;
    const search = document.getElementById('searchInput').value.toLowerCase();

    let filtered = allApplications.filter(app => {
        const statusMatch = !status || app.status === status;
        const typeMatch = !type || app.accountType === type;
        const searchMatch = !search || 
            app.accountNumber.toLowerCase().includes(search) ||
            app.fullName.toLowerCase().includes(search) ||
            app.email.toLowerCase().includes(search);
        
        return statusMatch && typeMatch && searchMatch;
    });

    const tbody = document.getElementById('applicationsTableBody');
    tbody.innerHTML = '';

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No applications found</td></tr>';
        return;
    }

    filtered.forEach(app => {
        const row = createTableRow(app);
        tbody.appendChild(row);
    });
}

// Save Applications
function saveApplications() {
    localStorage.setItem('bankApplications', JSON.stringify(allApplications));
}

// Export Data
function exportData() {
    const csv = convertToCSV(allApplications);
    downloadCSV(csv);
}

// Convert to CSV
function convertToCSV(data) {
    const headers = ['Account Number', 'Full Name', 'Account Type', 'Email', 'Phone', 'Country', 'Status', 'Applied Date'];
    const rows = data.map(app => [
        app.accountNumber,
        app.fullName,
        app.accountType,
        app.email,
        app.phone,
        app.country,
        app.status,
        new Date(app.applicationDate).toLocaleString()
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell || ''}"`).join(',') + '\n';
    });

    return csv;
}

// Download CSV
function downloadCSV(csv) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bank-applications-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
}

// Add CSS for status badges and details
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .status-badge {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
    }
    
    .status-pending {
        background: rgba(255, 149, 0, 0.15);
        color: var(--warning-yellow);
    }
    
    .status-approved {
        background: rgba(76, 175, 80, 0.15);
        color: var(--accent-green);
    }
    
    .status-rejected {
        background: rgba(255, 59, 48, 0.15);
        color: var(--danger-red);
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin: 20px 0;
    }
    
    .detail-item {
        background: var(--light-gray);
        padding: 16px;
        border-radius: 8px;
    }
    
    .detail-item label {
        display: block;
        font-weight: 600;
        color: var(--text-light);
        font-size: 0.85rem;
        text-transform: uppercase;
        margin-bottom: 8px;
    }
    
    .detail-item p {
        font-size: 1rem;
        color: var(--text-dark);
        font-weight: 500;
    }
    
    .btn-view {
        background: var(--primary-blue);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 600;
        transition: all 0.2s;
    }
    
    .btn-view:hover {
        background: var(--primary-dark);
    }
`;
document.head.appendChild(styleSheet);
