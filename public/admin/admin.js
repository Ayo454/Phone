// Admin Panel JavaScript

// API Base URL - Use Render deployment URL
const API_BASE_URL = 'https://phone-4hza.onrender.com';

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
    if (document.getElementById('searchPayments')) {
        document.getElementById('searchPayments').addEventListener('keyup', filterPayments);
    }
    if (document.getElementById('searchUsers')) {
        document.getElementById('searchUsers').addEventListener('keyup', filterUsers);
    }
    if (document.getElementById('paymentFilter')) {
        document.getElementById('paymentFilter').addEventListener('change', filterPayments);
    }
    if (document.getElementById('searchRegister')) {
        document.getElementById('searchRegister').addEventListener('keyup', filterRegister);
    }

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
    } else if (page === 'register') {
        loadRegister();
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

// Load Applications - Show Applications from Supabase
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

        if (!applications || applications.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8">No applications found</td></tr>';
            return;
        }

        (applications || []).forEach((app, index) => {
            const row = document.createElement('tr');
            const status = app.status || 'pending';
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${app.firstName || ''} ${app.lastName || ''}</td>
                <td>${app.position || 'N/A'}</td>
                <td>${app.email || 'N/A'}</td>
                <td>${app.phone || 'N/A'}</td>
                <td>${new Date(app.submittedAt || new Date()).toLocaleDateString()}</td>
                <td><span class="badge badge-${status}">${status}</span></td>
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

    try {
        // Try to fetch from Supabase first
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            supabaseClient
                .from('applications')
                .select('*')
                .eq('id', index)
                .single()
                .then(({ data: app, error }) => {
                    if (error || !app) {
                        console.warn('Supabase fetch failed, using server fallback:', error);
                        fetchApplicationFromServer(index, modalBody);
                        return;
                    }
                    
                    const status = app.status || 'pending';
                    modalBody.innerHTML = `
                        <div class="application-details">
                            <p><strong>ID:</strong> ${app.id || 'N/A'}</p>
                            <p><strong>Name:</strong> ${app.firstName || ''} ${app.lastName || ''}</p>
                            <p><strong>Email:</strong> ${app.email || 'N/A'}</p>
                            <p><strong>Phone:</strong> ${app.phone || 'N/A'}</p>
                            <p><strong>Position:</strong> ${app.position || 'N/A'}</p>
                            <p><strong>Experience:</strong> ${app.experience || 'N/A'} years</p>
                            <p><strong>Cover Letter:</strong> ${app.coverLetter || 'N/A'}</p>
                            <p><strong>Status:</strong> <span class="badge badge-${status}">${status}</span></p>
                            <p><strong>Submitted:</strong> ${new Date(app.submittedAt || new Date()).toLocaleDateString()}</p>
                        </div>
                    `;
                    modal.classList.add('active');
                })
                .catch(err => {
                    console.warn('Error fetching from Supabase:', err);
                    fetchApplicationFromServer(index, modalBody);
                });
        } else {
            fetchApplicationFromServer(index, modalBody);
        }
    } catch (err) {
        console.error('Error loading application details:', err);
        modalBody.innerHTML = '<p>Error loading application details</p>';
        modal.classList.add('active');
    }
}

// Fetch application from server (fallback)
async function fetchApplicationFromServer(appId, modalBody) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/applications`);
        if (!resp.ok) throw new Error('Failed to fetch applications');
        
        const applications = await resp.json();
        const app = applications.find(a => a.id == appId || a.accountNumber == appId);
        
        if (!app) {
            modalBody.innerHTML = '<p>Application not found</p>';
            return;
        }
        
        const status = app.status || 'pending';
        modalBody.innerHTML = `
            <div class="application-details">
                <p><strong>ID:</strong> ${app.id || app.accountNumber || 'N/A'}</p>
                <p><strong>Name:</strong> ${app.firstName || ''} ${app.lastName || ''}</p>
                <p><strong>Email:</strong> ${app.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${app.phone || 'N/A'}</p>
                <p><strong>Position:</strong> ${app.position || 'N/A'}</p>
                <p><strong>Experience:</strong> ${app.experience || 'N/A'} years</p>
                <p><strong>Cover Letter:</strong> ${app.coverLetter || 'N/A'}</p>
                <p><strong>Status:</strong> <span class="badge badge-${status}">${status}</span></p>
                <p><strong>Submitted:</strong> ${new Date(app.submittedAt || new Date()).toLocaleDateString()}</p>
            </div>
        `;
        
        const modal = document.getElementById('applicationModal');
        modal.classList.add('active');
    } catch (err) {
        console.error('Error fetching application from server:', err);
        modalBody.innerHTML = '<p>Error loading application details from server</p>';
        const modal = document.getElementById('applicationModal');
        modal.classList.add('active');
    }
}

// View Registration Details
function viewRegistrationDetails(regId) {
    const modal = document.getElementById('applicationModal');
    const modalBody = document.getElementById('modalBody');

    // Clear and show loading
    modalBody.innerHTML = '<p>Loading registration details...</p>';
    modal.classList.add('active');

    // Store current registration id so approve/reject can use it
    currentApplicationId = regId;

    // Fetch user details from Supabase or server
    (async () => {
        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                const { data: user, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .eq('id', regId)
                    .single();

                if (error || !user) {
                    console.warn('Supabase fetch failed for registration, falling back to server:', error);
                    await fetchRegistrationFromServer(regId, modalBody);
                    return;
                }

                const status = user.status || (user.approved ? 'approved' : 'pending');
                modalBody.innerHTML = `
                    <div class="application-details">
                        <p><strong>ID:</strong> ${user.id || 'N/A'}</p>
                        <p><strong>Name:</strong> ${user.first_name || ''} ${user.last_name || ''}</p>
                        <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                        <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                        <p><strong>User Type:</strong> ${user.user_type || 'N/A'}</p>
                        <p><strong>Organization:</strong> ${user.organization || 'N/A'}</p>
                        <p><strong>Newsletter:</strong> ${user.newsletter_subscribed ? 'Yes' : 'No'}</p>
                        <p><strong>Status:</strong> <span class="badge badge-${status}">${status}</span></p>
                        <p><strong>Created:</strong> ${new Date(user.created_at || new Date()).toLocaleDateString()}</p>
                    </div>
                `;
            } else {
                await fetchRegistrationFromServer(regId, modalBody);
            }

            // Wire modal action buttons to registration approve/reject
            const approveBtn = document.getElementById('approveBtn');
            const rejectBtn = document.getElementById('rejectBtn');
            // Replace click handlers so they operate on registrations
            if (approveBtn) {
                approveBtn.onclick = () => approveRegistration(regId);
            }
            if (rejectBtn) {
                rejectBtn.onclick = () => rejectRegistration(regId);
            }
        } catch (err) {
            console.error('Error loading registration details:', err);
            modalBody.innerHTML = '<p>Error loading registration details</p>';
        }
    })();
}

// Fetch registration from server fallback
async function fetchRegistrationFromServer(regId, modalBody) {
    try {
        const resp = await fetch(`${API_BASE_URL}/api/users`);
        if (!resp.ok) throw new Error('Failed to fetch users from server');
        const users = await resp.json();
        const user = users.find(u => u.id == regId || u.email == regId);
        if (!user) {
            modalBody.innerHTML = '<p>Registration not found</p>';
            return;
        }

        const status = user.status || (user.approved ? 'approved' : 'pending');
        modalBody.innerHTML = `
            <div class="application-details">
                <p><strong>ID:</strong> ${user.id || 'N/A'}</p>
                <p><strong>Name:</strong> ${user.first_name || ''} ${user.last_name || ''}</p>
                <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
                <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
                <p><strong>User Type:</strong> ${user.user_type || 'N/A'}</p>
                <p><strong>Organization:</strong> ${user.organization || 'N/A'}</p>
                <p><strong>Newsletter:</strong> ${user.newsletter_subscribed ? 'Yes' : 'No'}</p>
                <p><strong>Status:</strong> <span class="badge badge-${status}">${status}</span></p>
                <p><strong>Created:</strong> ${new Date(user.created_at || new Date()).toLocaleDateString()}</p>
            </div>
        `;
    } catch (err) {
        console.error('Error fetching registration from server:', err);
        modalBody.innerHTML = '<p>Error loading registration details from server</p>';
    }
}

// View User Details
async function viewUserDetails(userId) {
    try {
        // Fetch user details from Supabase
        const { data: user, error } = await supabaseClient
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        const modal = document.getElementById('applicationModal');
        const modalBody = document.getElementById('modalBody');

        // Populate modal with user details
        modalBody.innerHTML = `
            <p><strong>User ID:</strong> ${user.id || 'N/A'}</p>
            <p><strong>Name:</strong> ${user.first_name || ''} ${user.last_name || ''}</p>
            <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${user.phone || 'N/A'}</p>
            <p><strong>User Type:</strong> ${user.user_type || 'N/A'}</p>
            <p><strong>Organization:</strong> ${user.organization || 'N/A'}</p>
            <p><strong>Newsletter Subscribed:</strong> ${user.newsletter_subscribed ? 'Yes' : 'No'}</p>
            <p><strong>Joined:</strong> ${new Date(user.created_at).toLocaleDateString()}</p>
        `;

        modal.classList.add('active');
    } catch (err) {
        console.error('Error loading user details:', err);
        alert('Error loading user details: ' + err.message);
    }
}

// Delete User
async function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                const { error } = await supabaseClient
                    .from('users')
                    .delete()
                    .eq('id', userId);

                if (!error) {
                    alert('User deleted successfully!');
                    loadApplications();
                    return;
                }
                console.warn('Supabase delete failed:', error);
            }
        } catch (err) {
            console.error('Error deleting user:', err);
            alert('Error deleting user');
        }
    }
}

// Delete Registration
async function deleteRegistration(regId) {
    if (confirm('Are you sure you want to delete this registration?')) {
        try {
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                const { error } = await supabaseClient
                    .from('registrations')
                    .delete()
                    .eq('id', regId);

                if (!error) {
                    alert('Registration deleted successfully!');
                    loadRegister();
                    return;
                }
                console.warn('Supabase delete failed:', error);
            }
        } catch (err) {
            console.error('Error deleting registration:', err);
            alert('Error deleting registration');
        }
    }
}

// Approve Application
async function approveApplication() {
    if (currentApplicationId !== null) {
        // Call server endpoint to update status (primary method)
        try {
            console.log('📨 Approving application ID:', currentApplicationId);
            const resp = await fetch(`${API_BASE_URL}/api/applications/${encodeURIComponent(currentApplicationId)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.message || 'Approve failed');
            console.log('✅ Application approved successfully from server:', json);
            alert('Application approved successfully!');
            closeModal();
            loadApplications();
        } catch (err) {
            console.error('❌ Error approving application from server:', err);
            alert('Error approving application');
        }
    }
}

// Reject Application
async function rejectApplication() {
    if (currentApplicationId !== null) {
        // Call server endpoint to update status (primary method)
        try {
            console.log('📨 Rejecting application ID:', currentApplicationId);
            const resp = await fetch(`${API_BASE_URL}/api/applications/${encodeURIComponent(currentApplicationId)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' })
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.message || 'Reject failed');
            console.log('✅ Application rejected successfully from server:', json);
            alert('Application rejected successfully!');
            closeModal();
            loadApplications();
        } catch (err) {
            console.error('❌ Error rejecting application from server:', err);
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
            const resp = await fetch(`${API_BASE_URL}/api/applications/${encodeURIComponent(appId)}`, { method: 'DELETE' });
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

// Load Register - Show Users from Supabase
async function loadRegister() {
    try {
        // Fetch users from Supabase
        const { data: users, error } = await supabaseClient
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById('registersBody');
        tableBody.innerHTML = '';

        if (!users || users.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="8">No users found</td></tr>';
            return;
        }

        users.forEach((user, index) => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${user.id || index + 1}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.phone || 'N/A'}</td>
                <td>${user.user_type || 'N/A'}</td>
                <td>${user.organization || 'N/A'}</td>
                <td>${user.newsletter_subscribed ? 'Yes' : 'No'}</td>
                <td>${new Date(user.created_at || new Date()).toLocaleDateString()}</td>
            `;

            // Actions cell: show View and Delete (View opens modal with Approve/Reject)
            const actionsTd = document.createElement('td');

            const viewBtn = document.createElement('button');
            viewBtn.className = 'action-btn view';
            viewBtn.textContent = 'View';
            viewBtn.title = 'View registration details';
            viewBtn.addEventListener('click', () => viewRegistrationDetails(user.id));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteUser(user.id));

            actionsTd.appendChild(viewBtn);
            actionsTd.appendChild(deleteBtn);
            row.appendChild(actionsTd);
            tableBody.appendChild(row);
        });
    } catch (err) {
        console.error('Error loading users:', err);
        const tableBody = document.getElementById('registersBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8">Error loading users</td></tr>';
        }
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

// Filter Register
function filterRegister() {
    const searchTerm = document.getElementById('searchRegister').value.toLowerCase();
    const rows = document.querySelectorAll('#registerBody tr');

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

// Approve Registration - call server endpoint and signal client (localStorage for demo)
async function approveRegistration(userId, userEmail) {
    try {
        const proceed = userEmail ? confirm(`Approve registration for ${userEmail}?`) : confirm('Approve this registration?');
        if (!proceed) return;

        console.log('📨 Sending approve request for user ID:', userId);
        const resp = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' })
        });

        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(json.message || 'Server approve failed');

        // For compatibility with the registration page polling (demo), set localStorage key
        try {
            const approvedKey = `registration_approved_${userId}`;
            localStorage.setItem(approvedKey, JSON.stringify({ approved: true, approvedAt: new Date().toISOString() }));
        } catch (e) {
            console.warn('Could not set localStorage approved key (cross-origin):', e.message);
        }

        console.log('✅ Registration approved by server:', json);
        alert('Registration approved successfully!');
        loadRegister();
    } catch (err) {
        console.error('❌ Error approving registration:', err);
        alert('Error approving registration: ' + (err.message || err));
    }
}

// Reject Registration - call server endpoint and optionally signal client
async function rejectRegistration(userId, userEmail) {
    try {
        const proceed = userEmail ? confirm(`Reject registration for ${userEmail}?`) : confirm('Reject this registration?');
        if (!proceed) return;

        console.log('📨 Sending reject request for user ID:', userId);
        const resp = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected' })
        });

        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(json.message || 'Server reject failed');

        // Optionally set a local key to indicate rejection for demo purposes
        try {
            const key = `registration_rejected_${userId}`;
            localStorage.setItem(key, JSON.stringify({ rejected: true, rejectedAt: new Date().toISOString() }));
        } catch (e) {
            console.warn('Could not set localStorage rejected key (cross-origin):', e.message);
        }

        console.log('✅ Registration rejected by server:', json);
        alert('Registration rejected successfully!');
        loadRegister();
    } catch (err) {
        console.error('❌ Error rejecting registration:', err);
        alert('Error rejecting registration: ' + (err.message || err));
    }
}

// Logout
function logout() {
    alert('Logged out successfully');
    // Reload page to reset admin panel
    window.location.reload();
}

