// Admin Panel JavaScript

// API Base URL - same as main app
// Automatically detect if running on Render or localhost
const API_BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    // Use current origin for deployed environments (Render, etc.)
    return window.location.origin;
})();

// Supabase Configuration
const SUPABASE_URL = 'https://trcbyqdfgnlaesixhorz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyY2J5cWRmZ25sYWVzaXhob3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3OTU0ODEsImV4cCI6MjA3ODM3MTQ4MX0.SHMr2WS1-q0zDX5p51MMqiO4Dfz1ZZwVjbNTkMiEUsc';

// Initialize Supabase client
const supabaseClient = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Admin Panel initialized with API_BASE_URL:', API_BASE_URL);
console.log('Supabase client:', supabaseClient ? 'Connected' : 'Not available');

// Track current admin user
let currentAdminUser = { name: 'Admin' };
let currentApplicationId = null;

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin panel DOM loaded');
    setupEventListeners();
    loadDashboardData();
});

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Menu toggle for mobile
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);

    // Modal close
    document.querySelector('.modal-close').addEventListener('click', closeModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);

    // Dashboard buttons
    document.getElementById('approveBtn').addEventListener('click', approveApplication);
    document.getElementById('rejectBtn').addEventListener('click', rejectApplication);

    // Export button
    document.getElementById('exportApplications').addEventListener('click', exportApplications);

    // Search and filter
    document.getElementById('searchApplications').addEventListener('keyup', filterApplications);
    document.getElementById('searchPayments').addEventListener('keyup', filterPayments);
    document.getElementById('searchUsers').addEventListener('keyup', filterUsers);
    document.getElementById('paymentFilter').addEventListener('change', filterPayments);

    // Settings
    document.querySelectorAll('.settings-section .btn').forEach(btn => {
        btn.addEventListener('click', saveSettings);
    });
}

// Navigation Handler
function handleNavigation(e) {
    e.preventDefault();
    const page = this.dataset.page;

    if (page === 'logout') {
        logout();
        return;
    }

    // Update active nav
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    this.classList.add('active');

    // Update page title
    document.getElementById('pageTitle').textContent = this.textContent.trim();

    // Show active page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');

    // Load page data
    if (page === 'applications') {
        loadApplications();
    } else if (page === 'payments') {
        loadPayments();
    } else if (page === 'users') {
        loadUsers();
    } else if (page === 'dashboard') {
        loadDashboardData();
    }

    // Close sidebar on mobile
    document.querySelector('.sidebar').classList.remove('active');
}

// Toggle sidebar on mobile
function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Fetch applications from Supabase
        const { data: applications, error } = await supabaseClient
            .from('applications')
            .select('*')
            .order('submittedAt', { ascending: false });

        if (error) throw error;

        const totalApplications = applications?.length || 0;
        const pendingApplications = applications?.filter(app => app.status === 'pending' || !app.status).length || 0;

        // Calculate total payments (assuming $50 per completed application)
        const completedApps = applications?.filter(app => app.status === 'approved').length || 0;
        const totalPayments = completedApps * 50;

        // Stats
        document.getElementById('totalApplications').textContent = totalApplications;
        document.getElementById('totalPayments').textContent = '$' + totalPayments;
        document.getElementById('totalUsers').textContent = totalApplications; // Each applicant is a user
        document.getElementById('pendingApplications').textContent = pendingApplications;

        // Load recent applications (first 5)
        const tableBody = document.getElementById('recentAppsBody');
        tableBody.innerHTML = '';

        (applications?.slice(0, 5) || []).forEach(app => {
            const row = document.createElement('tr');
            const status = app.status || 'pending';
            row.innerHTML = `
                <td>${app.firstName} ${app.lastName}</td>
                <td>${app.position}</td>
                <td>${app.email}</td>
                <td>${new Date(app.submittedAt).toLocaleDateString()}</td>
                <td><span class="badge badge-${status}">${status}</span></td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading dashboard:', err);
        // Fallback to mock data if Supabase fails
        document.getElementById('totalApplications').textContent = '0';
        document.getElementById('totalPayments').textContent = '$0';
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('pendingApplications').textContent = '0';
    }
}

// Load Applications
async function loadApplications() {
    try {
        // Fetch applications from Supabase
        const { data: applications, error } = await supabaseClient
            .from('applications')
            .select('*')
            .order('submittedAt', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById('applicationsBody');
        tableBody.innerHTML = '';

        (applications || []).forEach((app, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${app.firstName} ${app.lastName}</td>
                <td>${app.position}</td>
                <td>${app.email}</td>
                <td>${app.phone}</td>
                <td>${new Date(app.submittedAt).toLocaleDateString()}</td>
                <td>
                    ${app.resume_url ? `<a href="${app.resume_url}" target="_blank" class="link">View</a>` : 'N/A'}
                </td>
                <td>
                    <button class="action-btn view" onclick="viewApplicationDetails(${app.id})">View</button>
                    <button class="action-btn delete" onclick="deleteApplication(${app.id})">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading applications:', err);
        document.getElementById('applicationsBody').innerHTML = '<tr><td colspan="8">Error loading applications</td></tr>';
    }
}

// View Application Details
function viewApplicationDetails(index) {
    currentApplicationId = index;
    const modal = document.getElementById('applicationModal');
    const modalBody = document.getElementById('modalBody');

    // Populate modal with application details
    modalBody.innerHTML = `
        <p><strong>Name:</strong> John Doe</p>
        <p><strong>Email:</strong> john@example.com</p>
        <p><strong>Position:</strong> Software Developer</p>
        <p><strong>Experience:</strong> 5 years</p>
        <p><strong>Cover Letter:</strong> Lorem ipsum dolor sit amet...</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
    `;

    modal.classList.add('active');
}

// Approve Application
async function approveApplication() {
    if (currentApplicationId !== null) {
        // Try Supabase first (if available), otherwise fall back to local API
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('applications')
                    .update({ status: 'approved' })
                    .eq('id', currentApplicationId);

                if (!error) {
                    alert('Application approved successfully (Supabase).');
                    closeModal();
                    loadApplications();
                    return;
                }
                console.warn('Supabase approve returned error, falling back to local API:', error);
            } catch (err) {
                console.warn('Supabase approve failed, falling back to local API:', err);
            }
        }

        // Local fallback: call server PUT endpoint to update status in pendingApplications.json
        try {
            const resp = await fetch(`/api/applications/${encodeURIComponent(currentApplicationId)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.message || 'Approve failed');
            alert('Application approved successfully!');
            closeModal();
            loadApplications();
        } catch (err) {
            console.error('Error approving application (local fallback):', err);
            alert('Error approving application');
        }
    }
}

// Reject Application
async function rejectApplication() {
    if (currentApplicationId !== null) {
        // Try Supabase first, then fallback to local API
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('applications')
                    .update({ status: 'rejected' })
                    .eq('id', currentApplicationId);

                if (!error) {
                    alert('Application rejected successfully (Supabase).');
                    closeModal();
                    loadApplications();
                    return;
                }
                console.warn('Supabase reject returned error, falling back to local API:', error);
            } catch (err) {
                console.warn('Supabase reject failed, falling back to local API:', err);
            }
        }

        try {
            const resp = await fetch(`/api/applications/${encodeURIComponent(currentApplicationId)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' })
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.message || 'Reject failed');
            alert('Application rejected successfully!');
            closeModal();
            loadApplications();
        } catch (err) {
            console.error('Error rejecting application (local fallback):', err);
            alert('Error rejecting application');
        }
    }
}

// Delete Application
async function deleteApplication(appId) {
    if (confirm('Are you sure you want to delete this application?')) {
        // Try Supabase first (if available), otherwise fall back to local API
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { error } = await supabaseClient
                    .from('applications')
                    .delete()
                    .eq('id', appId);

                if (!error) {
                    alert('Application deleted successfully (Supabase).');
                    loadApplications();
                    return;
                }
                console.warn('Supabase delete returned error, falling back to local API:', error);
            } catch (err) {
                console.warn('Supabase delete failed, falling back to local API:', err);
            }
        }

        // Local fallback: call server DELETE endpoint which removes entry from pendingApplications.json
        try {
            const resp = await fetch(`/api/applications/${encodeURIComponent(appId)}`, { method: 'DELETE' });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.message || 'Delete failed');
            alert('Application deleted successfully!');
            loadApplications(); // Refresh list
        } catch (err) {
            console.error('Error deleting application (local fallback):', err);
            alert('Error deleting application');
        }
    }
}

// Close Modal
function closeModal() {
    document.getElementById('applicationModal').classList.remove('active');
    currentApplicationId = null;
}

// Load Payments
async function loadPayments() {
    try {
        const tableBody = document.getElementById('paymentsBody');
        tableBody.innerHTML = '';

        // Simulate payment data
        const payments = [
            { id: 'TXN001', user: 'John Doe', amount: 50, method: 'Card', status: 'completed', date: '2024-11-10' },
            { id: 'TXN002', user: 'Jane Smith', amount: 50, method: 'PayPal', status: 'completed', date: '2024-11-09' },
            { id: 'TXN003', user: 'Mike Brown', amount: 50, method: 'Card', status: 'pending', date: '2024-11-08' }
        ];

        payments.forEach(payment => {
            const row = document.createElement('tr');
            const statusClass = `badge-${payment.status}`;
            row.innerHTML = `
                <td>${payment.id}</td>
                <td>${payment.user}</td>
                <td>$${payment.amount}</td>
                <td>${payment.method}</td>
                <td><span class="badge ${statusClass}">${payment.status}</span></td>
                <td>${payment.date}</td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading payments:', err);
    }
}

// Load Users
async function loadUsers() {
    try {
        const tableBody = document.getElementById('usersBody');
        tableBody.innerHTML = '';

        // Simulate user data
        const users = [
            { name: 'John Doe', email: 'john@example.com', joined: '2024-01-15', applications: 2, status: 'active' },
            { name: 'Jane Smith', email: 'jane@example.com', joined: '2024-02-20', applications: 1, status: 'active' },
            { name: 'Mike Brown', email: 'mike@example.com', joined: '2024-03-10', applications: 0, status: 'inactive' }
        ];

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.joined}</td>
                <td>${user.applications}</td>
                <td><span class="badge badge-${user.status}">${user.status}</span></td>
                <td>
                    <button class="action-btn view">Edit</button>
                    <button class="action-btn delete">Ban</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading users:', err);
    }
}

// Filter Applications
function filterApplications() {
    const searchTerm = document.getElementById('searchApplications').value.toLowerCase();
    const rows = document.querySelectorAll('#applicationsBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Filter Payments
function filterPayments() {
    const searchTerm = document.getElementById('searchPayments').value.toLowerCase();
    const status = document.getElementById('paymentFilter').value;
    const rows = document.querySelectorAll('#paymentsBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const hasStatus = !status || row.textContent.includes(status);
        row.style.display = (text.includes(searchTerm) && hasStatus) ? '' : 'none';
    });
}

// Filter Users
function filterUsers() {
    const searchTerm = document.getElementById('searchUsers').value.toLowerCase();
    const rows = document.querySelectorAll('#usersBody tr');

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Export Applications
function exportApplications() {
    const rows = document.querySelectorAll('#applicationsBody tr');
    let csv = 'Name,Position,Email,Phone,Date\n';

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        csv += `${cells[1].textContent},${cells[2].textContent},${cells[3].textContent},${cells[4].textContent},${cells[5].textContent}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// Save Settings
function saveSettings(e) {
    e.preventDefault();
    console.log('Settings saved');
    alert('Settings saved successfully!');
}

// Logout
function logout() {
    alert('Logged out successfully');
    // Reload page to reset admin panel
    window.location.reload();
}
