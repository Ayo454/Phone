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

// Helper: get phone from user/application object - accounts for different field names
function getPhone(obj) {
    if (!obj) return null;
    return obj.phone || obj.phone_number || obj.phoneNumber || obj.mobile || obj.contact || obj.contact_number || null;
}

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
    } else if (page === 'resume') {
        setupResumeHandlers();
        loadApplicationsForResume();
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
                <td>${getPhone(app) || 'N/A'}</td>
                <td>${new Date(app.submittedAt || new Date()).toLocaleDateString()}</td>
                <td><span class="badge badge-${status}">${status}</span></td>
            `;
            
            // Actions cell
            const actionsTd = document.createElement('td');
            
            const viewBtn = document.createElement('button');
            viewBtn.className = 'action-btn view';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', () => viewApplicationDetails(app.id));
            
            const approveBtn = document.createElement('button');
            approveBtn.className = 'action-btn approve';
            approveBtn.textContent = 'Approve';
            // Use accountNumber when available (matches local file), otherwise fall back to app.id
            approveBtn.addEventListener('click', () => approveApplication(app.accountNumber || app.id, app.email));
            
            const rejectBtn = document.createElement('button');
            rejectBtn.className = 'action-btn reject';
            rejectBtn.textContent = 'Reject';
            // Use accountNumber when available (matches local file), otherwise fall back to app.id
            rejectBtn.addEventListener('click', () => rejectApplication(app.accountNumber || app.id, app.email));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete';
            deleteBtn.textContent = 'Delete';
            // Use accountNumber when available (matches local file), otherwise fall back to app.id
            deleteBtn.addEventListener('click', () => deleteApplication(app.accountNumber || app.id));
            
            actionsTd.appendChild(viewBtn);
            actionsTd.appendChild(approveBtn);
            actionsTd.appendChild(rejectBtn);
            actionsTd.appendChild(deleteBtn);
            row.appendChild(actionsTd);
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
                            <p><strong>Phone:</strong> ${getPhone(app) || 'N/A'}</p>
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
                <p><strong>Phone:</strong> ${getPhone(app) || 'N/A'}</p>
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
                        <p><strong>Phone:</strong> ${getPhone(user) || 'N/A'}</p>
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
                // Remove the default approveApplication listener
                approveBtn.removeEventListener('click', approveApplication);
                // Add registration-specific handler
                approveBtn.onclick = () => approveRegistration(regId);
            }
            if (rejectBtn) {
                // Remove the default rejectApplication listener
                rejectBtn.removeEventListener('click', rejectApplication);
                // Add registration-specific handler
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
                <p><strong>Phone:</strong> ${getPhone(user) || 'N/A'}</p>
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
            <p><strong>Phone:</strong> ${getPhone(user) || 'N/A'}</p>
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
async function approveApplication(appId, appEmail) {
    // If called with parameters (from table row), use those; otherwise use currentApplicationId (from modal)
    const id = appId !== undefined ? appId : currentApplicationId;
    
    if (id !== null) {
        try {
            console.log('📨 Approving application ID:', id);
            const resp = await fetch(`${API_BASE_URL}/api/applications/${encodeURIComponent(id)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.message || 'Approve failed');
            console.log('✅ Application approved successfully from server:', json);
            
            // Show congratulations message with registration link
            showApprovalCongratulations(appEmail);
            
            if (appId === undefined) {
                closeModal();
            }
            loadApplications();
        } catch (err) {
            console.error('❌ Error approving application from server:', err);
            alert('Error approving application: ' + (err.message || err));
        }
    }
}

// Reject Application
async function rejectApplication(appId, appEmail) {
    // If called with parameters (from table row), use those; otherwise use currentApplicationId (from modal)
    const id = appId !== undefined ? appId : currentApplicationId;
    
    if (id !== null) {
        const confirmed = appEmail ? confirm(`Reject application for ${appEmail}?`) : true;
        if (!confirmed) return;
        
        try {
            console.log('📨 Rejecting application ID:', id);
            const resp = await fetch(`${API_BASE_URL}/api/applications/${encodeURIComponent(id)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' })
            });
            const json = await resp.json();
            if (!resp.ok) throw new Error(json.message || 'Reject failed');
            console.log('✅ Application rejected successfully from server:', json);
            alert('Application rejected successfully!');
            if (appId === undefined) {
                closeModal();
            }
            loadApplications();
        } catch (err) {
            console.error('❌ Error rejecting application from server:', err);
            alert('Error rejecting application: ' + (err.message || err));
        }
    }
}

// Show Approval Congratulations Message
function showApprovalCongratulations(applicantEmail) {
    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'congratulations-backdrop';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'congratulations-modal';
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        padding: 40px;
        max-width: 500px;
        text-align: center;
        animation: slideUp 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
        <h2 style="color: #059669; margin: 0 0 15px 0; font-size: 28px;">Congratulations!</h2>
        <p style="color: #555; margin: 0 0 10px 0; font-size: 16px;">Your application has been approved and sent to NATE Company.</p>
        <p style="color: #888; margin: 0 0 30px 0; font-size: 14px;">Click the button below to complete your registration.</p>
        
        <div style="display: flex; gap: 10px; justify-content: center;">
            <a href="https://nateregister.netlify.app" target="_blank" rel="noopener noreferrer" style="
                background: #059669;
                color: white;
                padding: 12px 30px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
                transition: background 0.3s;
                cursor: pointer;
                border: none;
                font-size: 16px;
            " onmouseover="this.style.background='#047857'" onmouseout="this.style.background='#059669'">
                Register Now
            </a>
            <button onclick="this.closest('.congratulations-backdrop').remove()" style="
                background: #e5e7eb;
                color: #333;
                padding: 12px 30px;
                border-radius: 6px;
                border: none;
                font-weight: 600;
                cursor: pointer;
                font-size: 16px;
                transition: background 0.3s;
            " onmouseover="this.style.background='#d1d5db'" onmouseout="this.style.background='#e5e7eb'">
                Close
            </button>
        </div>
        
        <p style="color: #999; margin-top: 20px; font-size: 12px;">Applicant: ${applicantEmail || 'N/A'}</p>
    `;
    
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    if (!document.querySelector('style[data-animation]')) {
        style.setAttribute('data-animation', 'true');
        document.head.appendChild(style);
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
            tableBody.innerHTML = '<tr><td colspan="10">No users found</td></tr>';
            return;
        }

        users.forEach((user, index) => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${user.id || index + 1}</td>
                <td>${user.first_name || 'N/A'}</td>
                <td>${user.last_name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${getPhone(user) || 'N/A'}</td>
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
            tableBody.innerHTML = '<tr><td colspan="10">Error loading users</td></tr>';
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
        
        // Call server endpoint (Supabase direct updates blocked by RLS policies on anon key)
        // The server has proper auth to update the users table
        try {
            const resp = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });

            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                console.error('❌ Server approve failed:', json.message || json.error || 'Unknown error');
                throw new Error(json.message || 'Failed to approve registration');
            } else {
                console.log('✅ Registration approved by server:', json);
            }
        } catch (err) {
            console.error('Error calling server endpoint:', err);
            throw err;
        }

        // For compatibility with the registration page polling (demo), set localStorage key
        try {
            const approvedKey = `registration_approved_${userId}`;
            localStorage.setItem(approvedKey, JSON.stringify({ approved: true, approvedAt: new Date().toISOString() }));
        } catch (e) {
            console.warn('Could not set localStorage approved key (cross-origin):', e.message);
        }

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
        
        // Call server endpoint (Supabase direct updates blocked by RLS policies on anon key)
        // The server has proper auth to update the users table
        try {
            const resp = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' })
            });

            const json = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                console.error('❌ Server reject failed:', json.message || json.error || 'Unknown error');
                throw new Error(json.message || 'Failed to reject registration');
            } else {
                console.log('✅ Registration rejected by server:', json);
            }
        } catch (err) {
            console.error('Error calling server endpoint:', err);
            throw err;
        }

        // Optionally set a local key to indicate rejection for demo purposes
        try {
            const key = `registration_rejected_${userId}`;
            localStorage.setItem(key, JSON.stringify({ rejected: true, rejectedAt: new Date().toISOString() }));
        } catch (e) {
            console.warn('Could not set localStorage rejected key (cross-origin):', e.message);
        }

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

// Resume Page Handlers
function setupResumeHandlers() {
    const downloadBtn = document.getElementById('downloadResume');
    const printBtn = document.getElementById('printResume');

    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadResumePDF);
    }

    if (printBtn) {
        printBtn.addEventListener('click', printResume);
    }
}

// Download Resume as PDF
function downloadResumePDF() {
    const element = document.querySelector('.resume');
    const nameEl = document.getElementById('resumeName');
    const nameSlug = (nameEl && nameEl.textContent ? nameEl.textContent.replace(/\s+/g, '_') : 'applicant').replace(/[^a-zA-Z0-9_\-]/g, '');
    const opt = {
        margin: 10,
        filename: `${nameSlug}_Resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    // Check if html2pdf library is available
    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
    } else {
        // Fallback: Use browser's print-to-PDF feature
        printResume();
    }
}

// Print Resume
function printResume() {
    window.print();
}

// Applications cache for resume page
let applicationsCache = [];

// Load applications and populate the applicant selector on the Resume page
async function loadApplicationsForResume() {
    const select = document.getElementById('applicantSelect');
    const refreshBtn = document.getElementById('refreshApplicants');

    if (!select) return;

    select.innerHTML = '<option>Loading applicants...</option>';

    try {
        // Try Supabase first
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data: applications, error } = await supabaseClient
                .from('applications')
                .select('*')
                .order('submittedAt', { ascending: false });

            if (!error && applications) {
                applicationsCache = applications;
            }
        }

        // If cache is empty, fallback to server API
        if (!applicationsCache || applicationsCache.length === 0) {
            try {
                const resp = await fetch(`${API_BASE_URL}/api/applications`);
                if (resp.ok) {
                    const apps = await resp.json();
                    applicationsCache = apps || [];
                }
            } catch (err) {
                console.warn('Fallback fetch for applications failed:', err);
            }
        }

        // Populate selector
        select.innerHTML = '';
        if (!applicationsCache || applicationsCache.length === 0) {
            select.innerHTML = '<option value="">No applications found</option>';
            return;
        }

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose an applicant to view resume...';
        select.appendChild(placeholder);

        applicationsCache.forEach(app => {
            const opt = document.createElement('option');
            opt.value = app.id;
            opt.textContent = `${app.firstName || ''} ${app.lastName || ''} — ${app.position || 'Applicant'}`.trim();
            select.appendChild(opt);
        });

        // Wire selection change
        select.onchange = () => {
            const id = select.value;
            const app = applicationsCache.find(a => String(a.id) === String(id));
            if (app) renderResume(app);
        };

        // Refresh button
        if (refreshBtn) {
            refreshBtn.onclick = () => loadApplicationsForResume();
        }

    } catch (err) {
        console.error('Error loading applicants for resume:', err);
        select.innerHTML = '<option value="">Error loading applicants</option>';
    }
}

// Render selected application into the resume area
function renderResume(app) {
    if (!app) return;

    // Basic header
    const nameEl = document.getElementById('resumeName');
    const titleEl = document.getElementById('resumeTitle');
    const contactEl = document.getElementById('resumeContact');
    const summaryEl = document.getElementById('resumeSummary');
    const expListEl = document.getElementById('resumeExperienceList');

    if (nameEl) nameEl.textContent = `${app.firstName || ''} ${app.lastName || ''}`.trim() || 'Applicant';
    if (titleEl) titleEl.textContent = app.position || 'Applicant';

    // Contact
    if (contactEl) {
        const parts = [];
        if (app.email) parts.push(`<span><i class="fas fa-envelope"></i> ${app.email}</span>`);
        if (app.phone) parts.push(`<span><i class="fas fa-phone"></i> ${app.phone}</span>`);
        if (app.location) parts.push(`<span><i class="fas fa-map-marker-alt"></i> ${app.location}</span>`);
        if (app.website) parts.push(`<span><i class="fas fa-globe"></i> <a href="${app.website}" target="_blank">Website</a></span>`);
        if (app.linkedin) parts.push(`<span><i class="fab fa-linkedin"></i> <a href="${app.linkedin}" target="_blank">LinkedIn</a></span>`);
        if (app.resumeUrl) parts.push(`<span><i class="fas fa-file"></i> <a href="${app.resumeUrl}" target="_blank">Original Resume</a></span>`);
        contactEl.innerHTML = parts.join(' ');
    }

    // Summary / cover letter
    if (summaryEl) {
        summaryEl.textContent = app.summary || app.coverLetter || 'No summary available.';
    }

    // Experience
    if (expListEl) {
        expListEl.innerHTML = '';
        // If applicant supplied structured experience array, render it. Otherwise show a single entry.
        if (Array.isArray(app.experience) && app.experience.length > 0) {
            app.experience.forEach(item => {
                const node = document.createElement('div');
                node.className = 'resume-item';
                node.innerHTML = `
                    <div class="resume-item-header">
                        <h3>${item.title || item.role || 'Role'}</h3>
                        <span class="resume-date">${item.dates || item.period || ''}</span>
                    </div>
                    <p class="resume-company">${item.company || ''}</p>
                    <ul class="resume-list">
                        ${(item.details || []).map(d => `<li>${d}</li>`).join('')}
                    </ul>
                `;
                expListEl.appendChild(node);
            });
        } else if (app.position || app.experienceSummary || app.work) {
            // Render a single experience block from available fields
            const node = document.createElement('div');
            node.className = 'resume-item';
            node.innerHTML = `
                <div class="resume-item-header">
                    <h3>${app.position || (app.work && app.work.title) || 'Experience'}</h3>
                    <span class="resume-date">${app.dates || ''}</span>
                </div>
                <p class="resume-company">${(app.company || (app.work && app.work.company)) || ''}</p>
                <ul class="resume-list">
                    <li>${app.experienceSummary || app.work?.summary || app.coverLetter || 'No additional details.'}</li>
                </ul>
            `;
            expListEl.appendChild(node);
        } else {
            expListEl.innerHTML = '<p>No experience details provided.</p>';
        }
    }
}


