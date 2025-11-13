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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadApplications();
    updateStats();
});

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
    try {
        const response = await fetch(`${API_BASE_URL}/api/applications`);
        if (response.ok) {
            const result = await response.json();
            // Handle both formats: direct array or wrapped in data property
            allApplications = Array.isArray(result) ? result : (result.data || []);
        } else {
            // Fallback: Load from local file
            allApplications = loadFromLocalStorage();
        }
        
        // Load transfers
            await loadTransfers();
            // Load registered bank accounts (for active accounts view)
            await loadRegisteredAccounts();
        
        populateTables();
        updateStats();
    } catch (error) {
        console.error('Error loading applications:', error);
        allApplications = loadFromLocalStorage();
        populateTables();
    }
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
            return;
        }

        // If API returned 404 or failed (likely the deployed service hasn't been updated),
        // try a fallback to the raw GitHub file so the admin can still show demo accounts.
        try {
            const rawUrl = 'https://raw.githubusercontent.com/Ayo454/Phone/main/data/registeredBankAccounts.json';
            const rawResp = await fetch(rawUrl);
            if (rawResp.ok) {
                const rawData = await rawResp.json();
                allRegisteredAccounts = Array.isArray(rawData) ? rawData : (rawData.data || []);
                return;
            }
        } catch (err) {
            console.warn('Fallback to raw GitHub file failed:', err);
        }

        // Final fallback: empty list
        allRegisteredAccounts = [];
    } catch (error) {
        console.error('Error loading registered accounts:', error);
        allRegisteredAccounts = [];
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
