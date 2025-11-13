// NATE Bank JavaScript

// API Configuration
const API_BASE_URL = (() => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:3000';
    }
    return window.location.origin;
})();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // CTA Buttons
    const ctaButtons = document.querySelectorAll('.cta-btn, .open-btn');
    ctaButtons.forEach(btn => {
        btn.addEventListener('click', handleAccountOpening);
    });

    // Contact Form
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmit);
    }

    // Navigation Links
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

// Handle Account Opening
function handleAccountOpening(e) {
    const accountType = e.target.textContent;
    showAccountModal(accountType);
}

// Show Account Modal
function showAccountModal(accountType) {
    let modal = document.getElementById('accountModal');
    if (modal) {
        modal.remove();
    }

    modal = document.createElement('div');
    modal.id = 'accountModal';
    modal.className = 'modal account-modal';
    modal.innerHTML = `
        <div class="modal-content account-modal-content">
            <span class="close-modal">&times;</span>
            <h2>Open Your Account</h2>
            <p class="modal-subtitle">Account Type: <strong>${accountType}</strong></p>
            
            <form class="account-form">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" name="fullName" placeholder="John Doe" required>
                </div>
                
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" name="email" placeholder="john@example.com" required>
                </div>
                
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" placeholder="+1 (555) 123-4567" required>
                </div>
                
                <div class="form-group">
                    <label>Date of Birth</label>
                    <input type="date" name="dateOfBirth" required>
                </div>
                
                <div class="form-group">
                    <label>Country</label>
                    <select name="country" required>
                        <option value="">Select Country</option>
                        <option value="US">United States</option>
                        <option value="UK">United Kingdom</option>
                        <option value="NG">Nigeria</option>
                        <option value="CA">Canada</option>
                        <option value="AU">Australia</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="IN">India</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" name="password" placeholder="Create a strong password" required>
                </div>
                
                <button type="submit" class="submit-btn">Create Account</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Close handler
    modal.querySelector('.close-modal').onclick = function() {
        modal.remove();
        document.body.style.overflow = 'auto';
    };

    // Close on outside click
    modal.onclick = function(e) {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    };

    // Form submission
    modal.querySelector('.account-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitAccountApplication(accountType, modal);
    });

    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Submit Account Application
async function submitAccountApplication(accountType, modal) {
    const form = modal.querySelector('.account-form');
    const formData = new FormData(form);
    
    // Generate Account Number
    const accountNumber = generateAccountNumber();
    
    const applicationData = {
        accountType: accountType,
        accountNumber: accountNumber,
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        dateOfBirth: formData.get('dateOfBirth'),
        country: formData.get('country'),
        password: formData.get('password'),
        applicationDate: new Date().toISOString(),
        status: 'pending'
    };

    console.log('Submitting application data:', applicationData);

    try {
        const response = await fetch(`${API_BASE_URL}/api/account-application`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(applicationData)
        });

        if (response.ok) {
            // Show success modal with account number
            showAccountSuccessModal(applicationData);
            modal.remove();
            document.body.style.overflow = 'auto';
        } else {
            const errorData = await response.json();
            console.error('Server error:', errorData);
            showNotification('Failed to submit application. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error submitting application:', error);
        showNotification('An error occurred. Please try again later.', 'error');
    }
}

// Generate Account Number
function generateAccountNumber() {
    // Generate 10-digit account number
    const accountNumber = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return accountNumber;
}

// Show Account Success Modal with Account Number
function showAccountSuccessModal(accountData) {
    const successModal = document.createElement('div');
    successModal.id = 'successModal';
    successModal.className = 'modal success-modal';
    successModal.innerHTML = `
        <div class="modal-content success-modal-content">
            <div class="success-header">
                <i class="fas fa-check-circle"></i>
                <h2>Account Created Successfully!</h2>
            </div>
            
            <div class="account-details">
                <div class="detail-row">
                    <span class="label">Account Number:</span>
                    <span class="value account-number">${accountData.accountNumber}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${accountData.accountNumber}')">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                
                <div class="detail-row">
                    <span class="label">Account Type:</span>
                    <span class="value">${accountData.accountType}</span>
                </div>
                
                <div class="detail-row">
                    <span class="label">Account Holder:</span>
                    <span class="value">${accountData.fullName}</span>
                </div>
                
                <div class="detail-row">
                    <span class="label">Email:</span>
                    <span class="value">${accountData.email}</span>
                </div>
                
                <div class="detail-row">
                    <span class="label">Phone:</span>
                    <span class="value">${accountData.phone}</span>
                </div>
                
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value status-pending"><i class="fas fa-clock"></i> Pending Verification</span>
                </div>
            </div>
            
            <div class="success-message">
                <p>Your account has been created successfully! A confirmation email has been sent to <strong>${accountData.email}</strong></p>
                <p>Please keep your account number safe for future transactions.</p>
            </div>
            
            <button class="close-success-btn" onclick="document.getElementById('successModal').remove(); document.body.style.overflow = 'auto';">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(successModal);
    successModal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

// Copy Account Number to Clipboard
function copyToClipboard(accountNumber) {
    navigator.clipboard.writeText(accountNumber).then(() => {
        showNotification('✓ Account number copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

// Handle Contact Form Submission
async function handleContactSubmit(e) {
    e.preventDefault();
    
    const inputs = e.target.querySelectorAll('input, textarea');
    const data = {
        fullName: inputs[0].value,
        email: inputs[1].value,
        phone: inputs[2].value,
        message: inputs[3].value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showNotification('✓ Message sent successfully! We will get back to you soon.', 'success');
            e.target.reset();
        } else {
            showNotification('Failed to send message. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showNotification('An error occurred. Please try again later.', 'error');
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        max-width: 400px;
        animation: slideIn 0.3s ease-in-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        font-weight: 500;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}
