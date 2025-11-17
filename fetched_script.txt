<<<<<<< HEAD
// API Configuration - Point to Node.js backend
// Support both localhost development and Render deployment
const API_BASE_URL = (() => {
    // If we have an injected RENDER_API_URL from the server, use it
    if (window.RENDER_API_URL) {
        return window.RENDER_API_URL;
    }
    
    // For localhost/127.0.0.1 dev, use Render instead
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'https://phone-4hza.onrender.com';
    }
    
    // For deployed Render domain, use the Render API URL
    if (window.location.hostname.includes('onrender.com')) {
        return 'https://phone-4hza.onrender.com';
    }
    
    // For Netlify or any other deployed domain, use Render backend
    if (window.location.hostname.includes('netlify.app') || !window.location.hostname.includes('localhost')) {
        return 'https://phone-4hza.onrender.com';
    }
    
    // Default: use same origin (localhost only)
    return window.location.origin;
})();

// Keep Render backend awake - ping health endpoint every 10 minutes to prevent auto-sleep
function startBackendKeepalive() {
    setInterval(async () => {
        try {
            const healthUrl = `${API_BASE_URL}/health`;
            await fetch(healthUrl, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
            console.log('✓ Backend keepalive ping sent');
        } catch (err) {
            console.warn('Backend keepalive ping failed (may be offline):', err.message);
        }
    }, 10 * 60 * 1000); // 10 minutes
}

// Start keepalive immediately
startBackendKeepalive();

// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupScrollAnimation();
});

function setupEventListeners() {
    // Contact form submission
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactSubmission);
    }

    // Apply button click
    const applyBtn = document.querySelector('.apply-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', handleApplyClick);
    }

    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavClick);
    });
}

// Show card / gift-card options
function showCardOptions(pendingId) {
    // Create modal content for card options
    let cardModal = document.getElementById('cardModal');
    if (!cardModal) {
        cardModal = document.createElement('div');
        cardModal.id = 'cardModal';
        cardModal.className = 'modal payment-modal';
        cardModal.innerHTML = `
            <div class="modal-content payment-content">
                <span class="close-modal card-close">&times;</span>
                <h2>Pay $50</h2>
                <p>Choose how you'd like to pay:</p>
                <div class="payment-options">
                    <button id="cardPayNow" class="payment-btn card-btn"><i class="fas fa-credit-card"></i> Pay with Card</button>
                    <button id="useGiftCard" class="payment-btn gift-btn"><i class="fas fa-gift"></i> Use Gift Card</button>
                </div>
                <div id="giftCardArea" style="margin-top:12px; display:none;">
                    <p>Enter your gift card code or snap a picture of the card.</p>
                    <input type="text" id="giftCodeInput" placeholder="GIFT CODE" />
                    <div style="margin-top:8px;">
                        <input type="file" id="giftScanInput" accept="image/*" capture="environment" />
                        <small>Or take a photo of the card and enter the code shown.</small>
                    </div>
                    <button id="redeemGiftBtn" class="payment-btn gift-redeem">Redeem Gift Card</button>
                </div>
            </div>
        `;
        document.body.appendChild(cardModal);

        // Close handler
        cardModal.querySelector('.card-close').onclick = function() {
            cardModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };

        // Button handlers
        cardModal.querySelector('#cardPayNow').onclick = async function() {
            await initiateCardPayment(pendingId);
        };

        const useGift = cardModal.querySelector('#useGiftCard');
        useGift.onclick = function() {
            cardModal.querySelector('#giftCardArea').style.display = 'block';
        };

        cardModal.querySelector('#redeemGiftBtn').onclick = async function() {
            const codeInput = document.getElementById('giftCodeInput');
            const code = codeInput ? codeInput.value.trim() : '';
            if (!code) {
                showNotification('Please enter a gift card code or scan a card.', 'error');
                return;
            }

            // Quick pre-check to validate the code exists and is unused before attempting to redeem
            try {
                // disable button while checking
                this.disabled = true;
                const checkResp = await fetch(`${API_BASE_URL}/api/check-giftcard`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const checkData = await checkResp.json();
                if (!checkData.success || !checkData.valid) {
                    if (checkData.redeemed) {
                        showNotification('This gift card has already been redeemed.', 'error');
                    } else {
                        showNotification(checkData.message || 'Invalid gift card code.', 'error');
                    }
                    this.disabled = false;
                    return;
                }
                // If valid, continue to redeem flow
            } catch (err) {
                console.error('Error checking gift card:', err);
                showNotification('Error checking gift card. Please try again.', 'error');
                this.disabled = false;
                return;
            }

            // If we have saved application data (no pendingId yet), call server to redeem-and-apply
            if ((!pendingId || pendingId === null) && window.savedApplicationFormData) {
                try {
                    // Append code to form data and POST to new endpoint
                    const fd = window.savedApplicationFormData;
                    fd.append('code', code);

                    const resp = await fetch(`${API_BASE_URL}/api/redeem-and-apply`, {
                        method: 'POST',
                        body: fd
                    });
                    const data = await resp.json();
                    if (data.success && !data.partial) {
                        showNotification('Gift card accepted — application submitted.', 'success');
                        cardModal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                        // Clear saved data
                        window.savedApplicationFormData = null;
                        // finalizeApplication isn't needed because server already saved it, but call to show success behavior
                        const modal = document.getElementById('applicationModal');
                        if (modal) modal.style.display = 'none';
                        const form = document.getElementById('applicationForm'); if (form) form.reset();
                    } else if (data.success && data.partial) {
                        // Partial - server returned pendingId and remaining
                        showNotification(`Partial gift applied. Please pay remaining $${data.remaining}.`, 'info');
                        // Launch Stripe for remaining amount (in cents)
                        const cents = Math.round(data.remaining * 100);
                        const resp2 = await fetch(`${API_BASE_URL}/api/create-stripe-session`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pendingId: data.pendingId, amount: cents })
                        });
                        const d2 = await resp2.json();
                        if (d2.success && d2.url) {
                            window.location.href = d2.url;
                        } else {
                            showNotification('Failed to create payment session for remaining amount.', 'error');
                        }
                    } else {
                        showNotification(data.message || 'Gift card not accepted.', 'error');
                    }
                } catch (err) {
                    console.error('Error redeeming gift card (redeem-and-apply):', err);
                    showNotification('Error redeeming gift card.', 'error');
                }
                this.disabled = false;
                return;
            }

            // Otherwise fallback to existing pendingId-based redeem
            try {
                const resp = await fetch(`${API_BASE_URL}/api/redeem-giftcard`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pendingId, code })
                });
                const data = await resp.json();
                if (data.success && !data.partial) {
                    showNotification('Gift card accepted — application paid.', 'success');
                    cardModal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    await finalizeApplication(pendingId);
                } else if (data.success && data.partial) {
                    showNotification(`Partial gift applied. Please pay remaining $${data.remaining}.`, 'info');
                    // Launch Stripe for remaining amount (in cents)
                    const cents = Math.round(data.remaining * 100);
                    const resp2 = await fetch(`${API_BASE_URL}/api/create-stripe-session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pendingId, amount: cents })
                    });
                    const d2 = await resp2.json();
                    if (d2.success && d2.url) {
                        window.location.href = d2.url;
                    } else {
                        showNotification('Failed to create payment session for remaining amount.', 'error');
                    }
                } else {
                    showNotification(data.message || 'Gift card not accepted.', 'error');
                }
            } catch (err) {
                console.error('Error redeeming gift card:', err);
                showNotification('Error redeeming gift card.', 'error');
            }
            // re-enable redeem button if still present
            try { this.disabled = false; } catch(e) {}
        };
    }

    cardModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Handle contact form submission
async function handleContactSubmission(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        // Here you would normally send the data to a server
        // For now, we'll just show a success message
        showNotification('Message sent successfully!', 'success');
        form.reset();
    } catch (error) {
        showNotification('Error sending message. Please try again.', 'error');
    }
}

// Handle apply button click and modal functionality
function handleApplyClick(e) {
    e.preventDefault();
    const modal = document.getElementById('applicationModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Modal functionality
document.addEventListener('DOMContentLoaded', function() {
    // Only wire modal/form handlers when those elements exist on the page
    const modal = document.getElementById('applicationModal');
    const closeBtn = document.querySelector('.close-modal');
    const applicationForm = document.getElementById('applicationForm');

    if (modal && closeBtn) {
        // Close modal when clicking the close button
        closeBtn.onclick = function() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };

        // Close modal when clicking outside
        window.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    if (applicationForm) {
        // Handle form submission: save form data and submit via helper
        applicationForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const formData = new FormData();
            const getVal = id => document.getElementById(id) ? document.getElementById(id).value : '';

            formData.append('position', getVal('position'));
            formData.append('firstName', getVal('firstName'));
            formData.append('lastName', getVal('lastName'));
            formData.append('email', getVal('email'));
            formData.append('phone', getVal('phone'));
            formData.append('experience', getVal('experience'));
            formData.append('coverLetter', getVal('coverLetter'));
            formData.append('terms', document.getElementById('terms') && document.getElementById('terms').checked ? 'on' : 'off');

            const resumeInput = document.getElementById('resume');
            if (resumeInput && resumeInput.files && resumeInput.files.length > 0) {
                formData.append('resume', resumeInput.files[0]);
            }

            await submitApplication(formData);
        });

        // File input validation (if resume input exists)
        const resumeInput = document.getElementById('resume');
        if (resumeInput) {
            resumeInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const allowedTypes = ['.pdf', '.doc', '.docx'];
                    const fileType = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                    if (!allowedTypes.includes(fileType)) {
                        showNotification('Please upload a PDF, DOC, or DOCX file.', 'error');
                        e.target.value = '';
                    }
                }
            });
        }

        // AUTHORIZE button handling (optional)
        const authorizeBtn = document.getElementById('authorizeBtn');
        if (authorizeBtn) {
            authorizeBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                const fd = new FormData();
                const getVal = id => document.getElementById(id) ? document.getElementById(id).value : '';
                fd.append('position', getVal('position'));
                fd.append('firstName', getVal('firstName'));
                fd.append('lastName', getVal('lastName'));
                fd.append('email', getVal('email'));
                fd.append('phone', getVal('phone'));
                fd.append('experience', getVal('experience'));
                fd.append('coverLetter', getVal('coverLetter'));
                fd.append('terms', document.getElementById('terms') && document.getElementById('terms').checked ? 'on' : 'off');

                const resumeInput2 = document.getElementById('resume');
                if (resumeInput2 && resumeInput2.files && resumeInput2.files.length > 0) {
                    fd.append('resume', resumeInput2.files[0]);
                }

                await submitApplication(fd);
            });
        }
    }
});

// Handle navigation click
function handleNavClick(e) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href').slice(1);
    const targetSection = document.getElementById(targetId);
    
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Setup scroll animations and navigation
function setupScrollAnimation() {
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    // Intersection Observer for navigation highlighting
    const navObserverOptions = {
        threshold: 0.5,
        rootMargin: '-100px 0px -50% 0px'
    };

    // Create observer for section visibility
    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active class from all nav links
                document.querySelectorAll('.nav-links a').forEach(link => {
                    link.classList.remove('active');
                });
                
                // Add active class to corresponding nav link
                const id = entry.target.id;
                const correspondingLink = document.querySelector(`.nav-links a[href="#${id}"]`);
                if (correspondingLink) {
                    correspondingLink.classList.add('active');
                }
            }
        });
    }, navObserverOptions);

    // Observe all sections for navigation
    document.querySelectorAll('section[id], header[id]').forEach(section => {
        navObserver.observe(section);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all cards and sections that should animate
    const animatedElements = document.querySelectorAll('.department-card, .benefit-card, .value-card');
    animatedElements.forEach(el => observer.observe(el));
}

// Utility function to show notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Submit application directly to server (no payment required)
async function submitApplication(formData) {
    try {
        showNotification('Submitting application...', 'info');

        const resp = await fetch(`${API_BASE_URL}/api/apply`, {
            method: 'POST',
            body: formData
        });

        // Check if response is ok
        if (!resp.ok) {
            console.error('API Error:', resp.status, resp.statusText);
            showNotification(`Server error: ${resp.status}. Please try again.`, 'error');
            return;
        }

        // Check content type before parsing JSON
        const contentType = resp.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await resp.text();
            console.error('Non-JSON response received:', text);
            showNotification('Server returned an unexpected response. Please try again.', 'error');
            return;
        }

        const data = await resp.json();
        if (data && data.success) {
            showNotification(data.message || 'Application submitted successfully!', 'success');
            // Close modal and reset form
            const modal = document.getElementById('applicationModal');
            if (modal) modal.style.display = 'none';
            const form = document.getElementById('applicationForm');
            if (form) form.reset();
            document.body.style.overflow = 'auto';
        } else {
            showNotification((data && data.message) || 'Failed to submit application.', 'error');
        }
    } catch (err) {
        console.error('Error submitting application:', err);
        showNotification('Error submitting application. Please try again.', 'error');
    }
}

// Department hover effects
const departmentCards = document.querySelectorAll('.department-card');
departmentCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Mobile menu toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });
}

// Add scroll-based navbar background
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Form validation
const inputs = document.querySelectorAll('.contact-form input, .contact-form textarea');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        if (input.value.trim() !== '') {
            input.classList.add('valid');
        } else {
            input.classList.remove('valid');
        }
    });
});

// ==================== PAYMENT FLOW ====================

// Show payment options modal
function showPaymentOptions(pendingId, formData) {
    // Hide application form modal
    const applicationModal = document.getElementById('applicationModal');
    if (applicationModal) {
        applicationModal.style.display = 'none';
    }

    // Create or show payment modal
    let paymentModal = document.getElementById('paymentModal');
    if (!paymentModal) {
        paymentModal = document.createElement('div');
        paymentModal.id = 'paymentModal';
        paymentModal.className = 'modal payment-modal';
        paymentModal.innerHTML = `
            <div class="modal-content payment-content">
                <span class="close-modal payment-close">&times;</span>
                <h2>Choose Payment Method</h2>
                <p>Please select your preferred payment method to complete your application:</p>
                
                <div class="payment-options">
                    <button id="payWithTransfer" class="payment-btn transfer-btn">
                        <i class="fas fa-exchange-alt"></i>
                        Bank Transfer
                    </button>
                    <button id="payWithGiftCard" class="payment-btn gift-btn">
                        <i class="fas fa-gift"></i>
                        Gift Card
                    </button>
                </div>

                <p class="payment-info"><small>Amount: $50.00 USD</small></p>
            </div>
        `;
        document.body.appendChild(paymentModal);

        // Close button
        const closeBtn = paymentModal.querySelector('.payment-close');
        closeBtn.onclick = function() {
            paymentModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };

        // Click outside to close
        window.onclick = function(event) {
            if (event.target === paymentModal) {
                paymentModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        };
    }

    // If a FormData was passed, keep it globally for gift-card "redeem-and-apply" flow
    if (formData) {
        window.savedApplicationFormData = formData;
    }

    paymentModal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Setup payment buttons
    const transferBtn = paymentModal.querySelector('#payWithTransfer');
    const giftCardBtn = paymentModal.querySelector('#payWithGiftCard');

    transferBtn.onclick = async () => {
        // Show bank transfer options modal
        showBankTransferOptions(pendingId);
    };

    giftCardBtn.onclick = async () => {
        // If we already have a pendingId use it, otherwise we may need to create a pending application first
        if (pendingId) {
            showCardOptions(pendingId);
        } else if (window.savedApplicationFormData) {
            // Create pending application in background so Stripe can reference it
            try {
                showNotification('Preparing application for payment...', 'info');
                const resp = await fetch(`${API_BASE_URL}/api/preapply`, { method: 'POST', body: window.savedApplicationFormData });
                const data = await resp.json();
                if (data.success && data.pendingId) {
                    window.currentPendingId = data.pendingId;
                    showCardOptions(data.pendingId);
                } else {
                    showNotification('Failed to prepare application for payment.', 'error');
                }
            } catch (err) {
                console.error('Error preparing preapply:', err);
                showNotification('Error preparing application for payment.', 'error');
            }
        } else {
            showNotification('No application data available for payment.', 'error');
        }
    };
}

// Show bank transfer options - auto-detect user country first
function showBankTransferOptions(pendingId) {
    // Detect user's country using geolocation API
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Get coordinates and reverse-geocode to country
                detectCountryFromCoordinates(position.coords, pendingId);
            },
            (error) => {
                console.warn('Geolocation denied, showing all countries:', error);
                showAllBanksModal(pendingId, null);
            }
        );
    } else {
        console.warn('Geolocation not supported, showing all countries');
        showAllBanksModal(pendingId, null);
    }
}

// Detect country from coordinates using reverse geocoding
async function detectCountryFromCoordinates(coords, pendingId) {
    try {
        // Use OpenStreetMap Nominatim API (free, no key required)
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`;
        const response = await fetch(url);
        const data = await response.json();
        const country = data.address?.country;
        console.log('Detected country:', country);
        showAllBanksModal(pendingId, country);
    } catch (err) {
        console.error('Error detecting country:', err);
        showAllBanksModal(pendingId, null);
    }
}

// Show banks modal - filtered by country if detected
function showAllBanksModal(pendingId, detectedCountry) {
    let bankModal = document.getElementById('bankTransferModal');
    if (!bankModal) {
        bankModal = document.createElement('div');
        bankModal.id = 'bankTransferModal';
        bankModal.className = 'modal payment-modal';
        bankModal.innerHTML = `
            <div class="modal-content payment-content">
                <span class="close-modal bank-close">&times;</span>
                <h2>Select Your Bank</h2>
                <p id="locationInfo" style="font-size:0.9rem; color:#666;"></p>
                <div id="bankListContainer" style="max-height: 400px; overflow-y: auto; margin: 1.5rem 0;">
                    <!-- Banks will be loaded here -->
                </div>
                <p class="payment-info"><small>Amount to transfer: $50.00 USD</small></p>
            </div>
        `;
        document.body.appendChild(bankModal);

        // Close handler
        bankModal.querySelector('.bank-close').onclick = function() {
            bankModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    // Show detected country info
    const locationInfo = bankModal.querySelector('#locationInfo');
    if (detectedCountry) {
        locationInfo.textContent = `📍 Detected: ${detectedCountry}. Showing banks for your country.`;
    } else {
        locationInfo.textContent = 'Showing all available banks. Select your country below.';
    }

    // Load and display banks, filtering by country if detected
    loadAndDisplayBanks(bankModal, detectedCountry, pendingId);
    bankModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Load banks from banks.json and display them grouped by country
async function loadAndDisplayBanks(bankModal, detectedCountry, pendingId) {
    try {
        const response = await fetch('/banks.json');
        const banks = await response.json();

        const container = bankModal.querySelector('#bankListContainer');
        container.innerHTML = '';

        // If country detected, show only that country's banks
        if (detectedCountry) {
            const matchedCountry = Object.keys(banks).find(
                c => c.toLowerCase() === detectedCountry.toLowerCase()
            );
            if (matchedCountry) {
                displayCountryBanks(matchedCountry, banks[matchedCountry], container, pendingId);
                return;
            }
        }

        // Otherwise show all countries sorted alphabetically
        const countries = Object.keys(banks).sort();
        countries.forEach(country => {
            displayCountryBanks(country, banks[country], container, pendingId);
        });
    } catch (err) {
        console.error('Error loading banks:', err);
        const container = bankModal.querySelector('#bankListContainer');
        container.innerHTML = '<p style="color: #dc3545;">Error loading bank list. Please try again.</p>';
    }
}

// Display banks for a specific country
function displayCountryBanks(country, bankList, container, pendingId) {
    const countryDiv = document.createElement('div');
    countryDiv.style.marginBottom = '1.5rem';

    const countryHeader = document.createElement('h4');
    countryHeader.style.color = '#0041C2';
    countryHeader.style.marginBottom = '0.5rem';
    countryHeader.textContent = country;
    countryDiv.appendChild(countryHeader);

    const bankListDiv = document.createElement('div');
    bankListDiv.style.display = 'flex';
    bankListDiv.style.flexDirection = 'column';
    bankListDiv.style.gap = '0.5rem';

    bankList.forEach(bank => {
        const bankBtn = document.createElement('button');
        bankBtn.className = 'bank-option-btn';
        bankBtn.style.padding = '0.75rem';
        bankBtn.style.border = '1px solid #ddd';
        bankBtn.style.borderRadius = '5px';
        bankBtn.style.background = '#f8f9fa';
        bankBtn.style.cursor = 'pointer';
        bankBtn.style.textAlign = 'left';
        bankBtn.style.transition = 'all 0.3s';
        bankBtn.innerHTML = `<strong>${bank.name}</strong><br/><small>${bank.code}</small>`;

        bankBtn.onmouseover = () => {
            bankBtn.style.background = '#e9ecef';
            bankBtn.style.borderColor = '#0041C2';
        };
        bankBtn.onmouseout = () => {
            bankBtn.style.background = '#f8f9fa';
            bankBtn.style.borderColor = '#ddd';
        };

        bankBtn.onclick = () => {
            showBankLoginForm(country, bank, pendingId);
        };

        bankListDiv.appendChild(bankBtn);
    });

    countryDiv.appendChild(bankListDiv);
    container.appendChild(countryDiv);
}

// Show bank login form (account number + password)
function showBankLoginForm(country, bank, pendingId) {
    // Simple redirect approach: show a confirmation and redirect to bank
    let redirectModal = document.getElementById('bankRedirectModal');
    if (!redirectModal) {
        redirectModal = document.createElement('div');
        redirectModal.id = 'bankRedirectModal';
        redirectModal.className = 'modal payment-modal';
        redirectModal.style.zIndex = '2002';
        document.body.appendChild(redirectModal);
    }

    redirectModal.innerHTML = `
        <div class="modal-content payment-content modal-small">
            <span class="close-modal redirect-close">&times;</span>
            <h2>Complete Payment via ${bank.name}</h2>
            <p class="modal-text-center">You will be redirected to ${bank.name} to complete your $50 payment.</p>

            <div class="info-box">
                <p class="info-amount"><strong>Amount:</strong> $50.00</p>
                <p class="info-note">✓ After payment, your application will be automatically submitted.</p>
            </div>

            <p class="modal-text-center small-note">
                <a id="bankWebsiteLink" href="${bank.website ? bank.website : '#'}" target="_blank" rel="noopener noreferrer" class="link-highlight">${bank.website ? bank.website : 'Visit bank website / search'}</a>
            </p>

            <button id="proceedToBank" class="payment-btn full-btn primary">
                Continue to ${bank.name}
            </button>
            <button id="cancelBank" class="payment-btn full-btn cancel">
                Cancel
            </button>
        </div>
    `;

    redirectModal.querySelector('.redirect-close').onclick = function() {
        redirectModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    redirectModal.querySelector('#cancelBank').onclick = function() {
        redirectModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    redirectModal.querySelector('#proceedToBank').onclick = function() {
        // Close modal and redirect to bank
        redirectModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Show notification that they're being redirected
        showNotification('Redirecting to ' + bank.name + '...', 'info');
        
        // Save pendingId in sessionStorage so we can finalize after payment
        if (pendingId) {
            sessionStorage.setItem('pendingPaymentId', pendingId);
            sessionStorage.setItem('pendingAmount', '50.00');
        }
        
        // Redirect to bank website (fallback to a Google search for the bank name if website missing)
        setTimeout(() => {
            if (bank.website) {
                window.location.href = bank.website;
            } else {
                const query = encodeURIComponent(bank.name + ' official website');
                window.location.href = `https://www.google.com/search?q=${query}`;
            }
        }, 500);
    };

    redirectModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}
        


// Account balance functions removed - using simple redirects instead

// Old payment processing functions removed - using simple bank redirects instead
// Deprecated payment-processing code removed to avoid stray top-level await/try blocks.
// If you need to reintroduce provider-specific flows (Coinbase/Stripe/BTC),
// re-add them as properly scoped async functions (e.g. async function initiateBtcPayment(...) { ... }).

// Handle payment verification callback (called after redirecting back from payment provider)
async function handlePaymentVerification() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const chargeId = urlParams.get('chargeId');
    const pendingId = urlParams.get('pendingId');

    if (sessionId && pendingId) {
        // Verify Stripe payment
        try {
                const response = await fetch(`/verify-payment?sessionId=${sessionId}&pendingId=${pendingId}`);
                const data = await response.json();
                if (data.success) {
                    showNotification('Payment successful! Finalizing application...', 'success');
                    // Finalize application
                    await finalizeApplication(pendingId);
                } else {
                    showNotification('Payment verification failed.', 'error');
                }
            } catch (err) {
                console.error('Error verifying payment:', err);
            }
    } else if (chargeId && pendingId) {
        // Verify Coinbase payment
        try {
            const response = await fetch(`/verify-coinbase?chargeId=${chargeId}&pendingId=${pendingId}`);
            const data = await response.json();
            if (data.success) {
                showNotification('BTC Payment confirmed! Finalizing application...', 'success');
                // Finalize application
                await finalizeApplication(pendingId);
            } else {
                showNotification('BTC payment verification failed.', 'error');
            }
        } catch (err) {
            console.error('Error verifying BTC payment:', err);
        }
    }
}

// Finalize application after successful payment
async function finalizeApplication(pendingId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/finalize-application`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pendingId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Application submitted successfully! We will contact you soon.', 'success');
            // Close modal and reset form
            const modal = document.getElementById('applicationModal');
            if (modal) {
                modal.style.display = 'none';
            }
            const form = document.getElementById('applicationForm');
            if (form) {
                form.reset();
            }
            document.body.style.overflow = 'auto';
            // Redirect to home after 2 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showNotification('Failed to finalize application. Please contact support.', 'error');
        }
    } catch (err) {
        console.error('Error finalizing application:', err);
        showNotification('Error finalizing application.', 'error');
    }
}

// Check for payment verification on page load
document.addEventListener('DOMContentLoaded', () => {
    handlePaymentVerification();
});
    // Apply button click
    const applyBtn = document.querySelector('.apply-btn');
    if (applyBtn) {
        applyBtn.addEventListener('click', handleApplyClick);
    }

    // Smooth scroll for navigation links
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavClick);
    });
}

// Show card / gift-card options
function showCardOptions(pendingId) {
    // Create modal content for card options
    let cardModal = document.getElementById('cardModal');
    if (!cardModal) {
        cardModal = document.createElement('div');
        cardModal.id = 'cardModal';
        cardModal.className = 'modal payment-modal';
        cardModal.innerHTML = `
            <div class="modal-content payment-content">
                <span class="close-modal card-close">&times;</span>
                <h2>Pay $50</h2>
                <p>Choose how you'd like to pay:</p>
                <div class="payment-options">
                    <button id="cardPayNow" class="payment-btn card-btn"><i class="fas fa-credit-card"></i> Pay with Card</button>
                    <button id="useGiftCard" class="payment-btn gift-btn"><i class="fas fa-gift"></i> Use Gift Card</button>
                </div>
                <div id="giftCardArea" style="margin-top:12px; display:none;">
                    <p>Enter your gift card code or snap a picture of the card.</p>
                    <input type="text" id="giftCodeInput" placeholder="GIFT CODE" />
                    <div style="margin-top:8px;">
                        <input type="file" id="giftScanInput" accept="image/*" capture="environment" />
                        <small>Or take a photo of the card and enter the code shown.</small>
                    </div>
                    <button id="redeemGiftBtn" class="payment-btn gift-redeem">Redeem Gift Card</button>
                </div>
            </div>
        `;
        document.body.appendChild(cardModal);

        // Close handler
        cardModal.querySelector('.card-close').onclick = function() {
            cardModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };

        // Button handlers
        cardModal.querySelector('#cardPayNow').onclick = async function() {
            await initiateCardPayment(pendingId);
        };

        const useGift = cardModal.querySelector('#useGiftCard');
        useGift.onclick = function() {
            cardModal.querySelector('#giftCardArea').style.display = 'block';
        };

        cardModal.querySelector('#redeemGiftBtn').onclick = async function() {
            const codeInput = document.getElementById('giftCodeInput');
            const code = codeInput ? codeInput.value.trim() : '';
            if (!code) {
                showNotification('Please enter a gift card code or scan a card.', 'error');
                return;
            }

            // Quick pre-check to validate the code exists and is unused before attempting to redeem
            try {
                // disable button while checking
                this.disabled = true;
                const checkResp = await fetch(`${API_BASE_URL}/api/check-giftcard`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                const checkData = await checkResp.json();
                if (!checkData.success || !checkData.valid) {
                    if (checkData.redeemed) {
                        showNotification('This gift card has already been redeemed.', 'error');
                    } else {
                        showNotification(checkData.message || 'Invalid gift card code.', 'error');
                    }
                    this.disabled = false;
                    return;
                }
                // If valid, continue to redeem flow
            } catch (err) {
                console.error('Error checking gift card:', err);
                showNotification('Error checking gift card. Please try again.', 'error');
                this.disabled = false;
                return;
            }

            // If we have saved application data (no pendingId yet), call server to redeem-and-apply
            if ((!pendingId || pendingId === null) && window.savedApplicationFormData) {
                try {
                    // Append code to form data and POST to new endpoint
                    const fd = window.savedApplicationFormData;
                    fd.append('code', code);

                    const resp = await fetch(`${API_BASE_URL}/api/redeem-and-apply`, {
                        method: 'POST',
                        body: fd
                    });
                    const data = await resp.json();
                    if (data.success && !data.partial) {
                        showNotification('Gift card accepted — application submitted.', 'success');
                        cardModal.style.display = 'none';
                        document.body.style.overflow = 'auto';
                        // Clear saved data
                        window.savedApplicationFormData = null;
                        // finalizeApplication isn't needed because server already saved it, but call to show success behavior
                        const modal = document.getElementById('applicationModal');
                        if (modal) modal.style.display = 'none';
                        const form = document.getElementById('applicationForm'); if (form) form.reset();
                    } else if (data.success && data.partial) {
                        // Partial - server returned pendingId and remaining
                        showNotification(`Partial gift applied. Please pay remaining $${data.remaining}.`, 'info');
                        // Launch Stripe for remaining amount (in cents)
                        const cents = Math.round(data.remaining * 100);
                        const resp2 = await fetch(`${API_BASE_URL}/api/create-stripe-session`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ pendingId: data.pendingId, amount: cents })
                        });
                        const d2 = await resp2.json();
                        if (d2.success && d2.url) {
                            window.location.href = d2.url;
                        } else {
                            showNotification('Failed to create payment session for remaining amount.', 'error');
                        }
                    } else {
                        showNotification(data.message || 'Gift card not accepted.', 'error');
                    }
                } catch (err) {
                    console.error('Error redeeming gift card (redeem-and-apply):', err);
                    showNotification('Error redeeming gift card.', 'error');
                }
                this.disabled = false;
                return;
            }

            // Otherwise fallback to existing pendingId-based redeem
            try {
                const resp = await fetch(`${API_BASE_URL}/api/redeem-giftcard`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ pendingId, code })
                });
                const data = await resp.json();
                if (data.success && !data.partial) {
                    showNotification('Gift card accepted — application paid.', 'success');
                    cardModal.style.display = 'none';
                    document.body.style.overflow = 'auto';
                    await finalizeApplication(pendingId);
                } else if (data.success && data.partial) {
                    showNotification(`Partial gift applied. Please pay remaining $${data.remaining}.`, 'info');
                    // Launch Stripe for remaining amount (in cents)
                    const cents = Math.round(data.remaining * 100);
                    const resp2 = await fetch(`${API_BASE_URL}/api/create-stripe-session`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pendingId, amount: cents })
                    });
                    const d2 = await resp2.json();
                    if (d2.success && d2.url) {
                        window.location.href = d2.url;
                    } else {
                        showNotification('Failed to create payment session for remaining amount.', 'error');
                    }
                } else {
                    showNotification(data.message || 'Gift card not accepted.', 'error');
                }
            } catch (err) {
                console.error('Error redeeming gift card:', err);
                showNotification('Error redeeming gift card.', 'error');
            }
            // re-enable redeem button if still present
            try { this.disabled = false; } catch(e) {}
        };
    }

    cardModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Handle contact form submission
async function handleContactSubmission(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        // Here you would normally send the data to a server
        // For now, we'll just show a success message
        showNotification('Message sent successfully!', 'success');
        form.reset();
    } catch (error) {
        showNotification('Error sending message. Please try again.', 'error');
    }
}

// Handle apply button click and modal functionality
function handleApplyClick(e) {
    e.preventDefault();
    const modal = document.getElementById('applicationModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Modal functionality
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('applicationModal');
    const closeBtn = document.querySelector('.close-modal');
    const applicationForm = document.getElementById('applicationForm');

    // Close modal when clicking the close button
    closeBtn.onclick = function() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    // Handle form submission
    // New flow: save the form data in-memory, show payment options first.
    applicationForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Create FormData to handle file upload and submit directly (no payment required)
        const formData = new FormData();
        formData.append('position', document.getElementById('position').value);
        formData.append('firstName', document.getElementById('firstName').value);
        formData.append('lastName', document.getElementById('lastName').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('phone', document.getElementById('phone').value);
        formData.append('experience', document.getElementById('experience').value);
        formData.append('coverLetter', document.getElementById('coverLetter').value);
        // Use 'on' to match server checks for terms
        formData.append('terms', document.getElementById('terms').checked ? 'on' : 'off');

        // Add resume file if selected
        const resumeInput = document.getElementById('resume');
        if (resumeInput && resumeInput.files.length > 0) {
            formData.append('resume', resumeInput.files[0]);
        }

        // Submit directly to server
        await submitApplication(formData);
    });

    // File input validation
    const resumeInput = document.getElementById('resume');
    if (resumeInput) {
        resumeInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const allowedTypes = ['.pdf', '.doc', '.docx'];
                const fileType = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                
                if (!allowedTypes.includes(fileType)) {
                    showNotification('Please upload a PDF, DOC, or DOCX file.', 'error');
                    e.target.value = '';
                }
            }
        });
    }

    // AUTHORIZE button: collect form data and open payment modal (non-submit flow)
    const authorizeBtn = document.getElementById('authorizeBtn');
    if (authorizeBtn) {
        authorizeBtn.addEventListener('click', async function(e) {
            e.preventDefault();

            // Build FormData from current form fields (same fields as submit) and submit directly
            const fd = new FormData();
            fd.append('position', document.getElementById('position').value);
            fd.append('firstName', document.getElementById('firstName').value);
            fd.append('lastName', document.getElementById('lastName').value);
            fd.append('email', document.getElementById('email').value);
            fd.append('phone', document.getElementById('phone').value);
            fd.append('experience', document.getElementById('experience').value);
            fd.append('coverLetter', document.getElementById('coverLetter').value);
            fd.append('terms', document.getElementById('terms').checked ? 'on' : 'off');

            const resumeInput2 = document.getElementById('resume');
            if (resumeInput2 && resumeInput2.files.length > 0) {
                fd.append('resume', resumeInput2.files[0]);
            }

            // Submit application directly (no payment)
            await submitApplication(fd);
        });
    }
});

// Handle navigation click
function handleNavClick(e) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href').slice(1);
    const targetSection = document.getElementById(targetId);
    
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// Setup scroll animations and navigation
function setupScrollAnimation() {
    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    // Intersection Observer for navigation highlighting
    const navObserverOptions = {
        threshold: 0.5,
        rootMargin: '-100px 0px -50% 0px'
    };

    // Create observer for section visibility
    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active class from all nav links
                document.querySelectorAll('.nav-links a').forEach(link => {
                    link.classList.remove('active');
                });
                
                // Add active class to corresponding nav link
                const id = entry.target.id;
                const correspondingLink = document.querySelector(`.nav-links a[href="#${id}"]`);
                if (correspondingLink) {
                    correspondingLink.classList.add('active');
                }
            }
        });
    }, navObserverOptions);

    // Observe all sections for navigation
    document.querySelectorAll('section[id], header[id]').forEach(section => {
        navObserver.observe(section);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all cards and sections that should animate
    const animatedElements = document.querySelectorAll('.department-card, .benefit-card, .value-card');
    animatedElements.forEach(el => observer.observe(el));
}

// Utility function to show notifications
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Submit application directly to server (no payment required)
async function submitApplication(formData) {
    try {
        showNotification('Submitting application...', 'info');

        const resp = await fetch(`${API_BASE_URL}/api/apply`, {
            method: 'POST',
            body: formData
        });

        const data = await resp.json();
        if (data && data.success) {
            showNotification(data.message || 'Application submitted successfully!', 'success');
            // Close modal and reset form
            const modal = document.getElementById('applicationModal');
            if (modal) modal.style.display = 'none';
            const form = document.getElementById('applicationForm');
            if (form) form.reset();
            document.body.style.overflow = 'auto';
        } else {
            showNotification((data && data.message) || 'Failed to submit application.', 'error');
        }
    } catch (err) {
        console.error('Error submitting application:', err);
        showNotification('Error submitting application. Please try again.', 'error');
    }
}

// Department hover effects
const departmentCards = document.querySelectorAll('.department-card');
departmentCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-10px)';
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
    });
});

// Mobile menu toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });
}

// Add scroll-based navbar background
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Form validation
const inputs = document.querySelectorAll('.contact-form input, .contact-form textarea');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        if (input.value.trim() !== '') {
            input.classList.add('valid');
        } else {
            input.classList.remove('valid');
        }
    });
});

// ==================== PAYMENT FLOW ====================

// Show payment options modal
function showPaymentOptions(pendingId, formData) {
    // Hide application form modal
    const applicationModal = document.getElementById('applicationModal');
    if (applicationModal) {
        applicationModal.style.display = 'none';
    }

    // Create or show payment modal
    let paymentModal = document.getElementById('paymentModal');
    if (!paymentModal) {
        paymentModal = document.createElement('div');
        paymentModal.id = 'paymentModal';
        paymentModal.className = 'modal payment-modal';
        paymentModal.innerHTML = `
            <div class="modal-content payment-content">
                <span class="close-modal payment-close">&times;</span>
                <h2>Choose Payment Method</h2>
                <p>Please select your preferred payment method to complete your application:</p>
                
                <div class="payment-options">
                    <button id="payWithTransfer" class="payment-btn transfer-btn">
                        <i class="fas fa-exchange-alt"></i>
                        Bank Transfer
                    </button>
                    <button id="payWithGiftCard" class="payment-btn gift-btn">
                        <i class="fas fa-gift"></i>
                        Gift Card
                    </button>
                </div>

                <p class="payment-info"><small>Amount: $50.00 USD</small></p>
            </div>
        `;
        document.body.appendChild(paymentModal);

        // Close button
        const closeBtn = paymentModal.querySelector('.payment-close');
        closeBtn.onclick = function() {
            paymentModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };

        // Click outside to close
        window.onclick = function(event) {
            if (event.target === paymentModal) {
                paymentModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        };
    }

    // If a FormData was passed, keep it globally for gift-card "redeem-and-apply" flow
    if (formData) {
        window.savedApplicationFormData = formData;
    }

    paymentModal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Setup payment buttons
    const transferBtn = paymentModal.querySelector('#payWithTransfer');
    const giftCardBtn = paymentModal.querySelector('#payWithGiftCard');

    transferBtn.onclick = async () => {
        // Show bank transfer options modal
        showBankTransferOptions(pendingId);
    };

    giftCardBtn.onclick = async () => {
        // If we already have a pendingId use it, otherwise we may need to create a pending application first
        if (pendingId) {
            showCardOptions(pendingId);
        } else if (window.savedApplicationFormData) {
            // Create pending application in background so Stripe can reference it
            try {
                showNotification('Preparing application for payment...', 'info');
                const resp = await fetch(`${API_BASE_URL}/api/preapply`, { method: 'POST', body: window.savedApplicationFormData });
                const data = await resp.json();
                if (data.success && data.pendingId) {
                    window.currentPendingId = data.pendingId;
                    showCardOptions(data.pendingId);
                } else {
                    showNotification('Failed to prepare application for payment.', 'error');
                }
            } catch (err) {
                console.error('Error preparing preapply:', err);
                showNotification('Error preparing application for payment.', 'error');
            }
        } else {
            showNotification('No application data available for payment.', 'error');
        }
    };
}

// Show bank transfer options - auto-detect user country first
function showBankTransferOptions(pendingId) {
    // Detect user's country using geolocation API
    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Get coordinates and reverse-geocode to country
                detectCountryFromCoordinates(position.coords, pendingId);
            },
            (error) => {
                console.warn('Geolocation denied, showing all countries:', error);
                showAllBanksModal(pendingId, null);
            }
        );
    } else {
        console.warn('Geolocation not supported, showing all countries');
        showAllBanksModal(pendingId, null);
    }
}

// Detect country from coordinates using reverse geocoding
async function detectCountryFromCoordinates(coords, pendingId) {
    try {
        // Use OpenStreetMap Nominatim API (free, no key required)
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`;
        const response = await fetch(url);
        const data = await response.json();
        const country = data.address?.country;
        console.log('Detected country:', country);
        showAllBanksModal(pendingId, country);
    } catch (err) {
        console.error('Error detecting country:', err);
        showAllBanksModal(pendingId, null);
    }
}

// Show banks modal - filtered by country if detected
function showAllBanksModal(pendingId, detectedCountry) {
    let bankModal = document.getElementById('bankTransferModal');
    if (!bankModal) {
        bankModal = document.createElement('div');
        bankModal.id = 'bankTransferModal';
        bankModal.className = 'modal payment-modal';
        bankModal.innerHTML = `
            <div class="modal-content payment-content">
                <span class="close-modal bank-close">&times;</span>
                <h2>Select Your Bank</h2>
                <p id="locationInfo" style="font-size:0.9rem; color:#666;"></p>
                <div id="bankListContainer" style="max-height: 400px; overflow-y: auto; margin: 1.5rem 0;">
                    <!-- Banks will be loaded here -->
                </div>
                <p class="payment-info"><small>Amount to transfer: $50.00 USD</small></p>
            </div>
        `;
        document.body.appendChild(bankModal);

        // Close handler
        bankModal.querySelector('.bank-close').onclick = function() {
            bankModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    // Show detected country info
    const locationInfo = bankModal.querySelector('#locationInfo');
    if (detectedCountry) {
        locationInfo.textContent = `📍 Detected: ${detectedCountry}. Showing banks for your country.`;
    } else {
        locationInfo.textContent = 'Showing all available banks. Select your country below.';
    }

    // Load and display banks, filtering by country if detected
    loadAndDisplayBanks(bankModal, detectedCountry, pendingId);
    bankModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Load banks from banks.json and display them grouped by country
async function loadAndDisplayBanks(bankModal, detectedCountry, pendingId) {
    try {
        const response = await fetch('/banks.json');
        const banks = await response.json();

        const container = bankModal.querySelector('#bankListContainer');
        container.innerHTML = '';

        // If country detected, show only that country's banks
        if (detectedCountry) {
            const matchedCountry = Object.keys(banks).find(
                c => c.toLowerCase() === detectedCountry.toLowerCase()
            );
            if (matchedCountry) {
                displayCountryBanks(matchedCountry, banks[matchedCountry], container, pendingId);
                return;
            }
        }

        // Otherwise show all countries sorted alphabetically
        const countries = Object.keys(banks).sort();
        countries.forEach(country => {
            displayCountryBanks(country, banks[country], container, pendingId);
        });
    } catch (err) {
        console.error('Error loading banks:', err);
        const container = bankModal.querySelector('#bankListContainer');
        container.innerHTML = '<p style="color: #dc3545;">Error loading bank list. Please try again.</p>';
    }
}

// Display banks for a specific country
function displayCountryBanks(country, bankList, container, pendingId) {
    const countryDiv = document.createElement('div');
    countryDiv.style.marginBottom = '1.5rem';

    const countryHeader = document.createElement('h4');
    countryHeader.style.color = '#0041C2';
    countryHeader.style.marginBottom = '0.5rem';
    countryHeader.textContent = country;
    countryDiv.appendChild(countryHeader);

    const bankListDiv = document.createElement('div');
    bankListDiv.style.display = 'flex';
    bankListDiv.style.flexDirection = 'column';
    bankListDiv.style.gap = '0.5rem';

    bankList.forEach(bank => {
        const bankBtn = document.createElement('button');
        bankBtn.className = 'bank-option-btn';
        bankBtn.style.padding = '0.75rem';
        bankBtn.style.border = '1px solid #ddd';
        bankBtn.style.borderRadius = '5px';
        bankBtn.style.background = '#f8f9fa';
        bankBtn.style.cursor = 'pointer';
        bankBtn.style.textAlign = 'left';
        bankBtn.style.transition = 'all 0.3s';
        bankBtn.innerHTML = `<strong>${bank.name}</strong><br/><small>${bank.code}</small>`;

        bankBtn.onmouseover = () => {
            bankBtn.style.background = '#e9ecef';
            bankBtn.style.borderColor = '#0041C2';
        };
        bankBtn.onmouseout = () => {
            bankBtn.style.background = '#f8f9fa';
            bankBtn.style.borderColor = '#ddd';
        };

        bankBtn.onclick = () => {
            showBankLoginForm(country, bank, pendingId);
        };

        bankListDiv.appendChild(bankBtn);
    });

    countryDiv.appendChild(bankListDiv);
    container.appendChild(countryDiv);
}

// Show bank login form (account number + password)
function showBankLoginForm(country, bank, pendingId) {
    // Simple redirect approach: show a confirmation and redirect to bank
    let redirectModal = document.getElementById('bankRedirectModal');
    if (!redirectModal) {
        redirectModal = document.createElement('div');
        redirectModal.id = 'bankRedirectModal';
        redirectModal.className = 'modal payment-modal';
        redirectModal.style.zIndex = '2002';
        document.body.appendChild(redirectModal);
    }

    redirectModal.innerHTML = `
        <div class="modal-content payment-content" style="max-width: 500px;">
            <span class="close-modal redirect-close" style="cursor:pointer;">&times;</span>
            <h2>Complete Payment via ${bank.name}</h2>
            <p style="margin: 1.5rem 0; text-align: center;">You will be redirected to ${bank.name} to complete your $50 payment.</p>
            
            <div style="background: #f0f7ff; border-left: 4px solid #0041C2; padding: 1rem; margin: 1.5rem 0; border-radius: 4px;">
                <p style="margin: 0; color: #333;"><strong>Amount:</strong> $50.00</p>
                <p style="margin: 0.5rem 0 0 0; color: #666; font-size: 0.9rem;">✓ After payment, your application will be automatically submitted.</p>
            </div>

            <p style="text-align:center; margin: 0.5rem 0 1rem 0; font-size:0.95rem;">
                <a id="bankWebsiteLink" href="${bank.website ? bank.website : '#'}" target="_blank" rel="noopener noreferrer" style="color:#0041C2; text-decoration:underline;">${bank.website ? bank.website : 'Visit bank website / search'}</a>
            </p>

            <button id="proceedToBank" class="payment-btn" style="width:100%; background:#0041C2; color:white; padding:0.75rem; font-size:1rem; cursor:pointer; margin-bottom:0.5rem;">
                Continue to ${bank.name}
            </button>
            <button id="cancelBank" class="payment-btn" style="width:100%; background:#999; color:white; padding:0.75rem; font-size:1rem; cursor:pointer;">
                Cancel
            </button>
        </div>
    `;

    redirectModal.querySelector('.redirect-close').onclick = function() {
        redirectModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    redirectModal.querySelector('#cancelBank').onclick = function() {
        redirectModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    };

    redirectModal.querySelector('#proceedToBank').onclick = function() {
        // Close modal and redirect to bank
        redirectModal.style.display = 'none';
        document.body.style.overflow = 'auto';
        
        // Show notification that they're being redirected
        showNotification('Redirecting to ' + bank.name + '...', 'info');
        
        // Save pendingId in sessionStorage so we can finalize after payment
        if (pendingId) {
            sessionStorage.setItem('pendingPaymentId', pendingId);
            sessionStorage.setItem('pendingAmount', '50.00');
        }
        
        // Redirect to bank website (fallback to a Google search for the bank name if website missing)
        setTimeout(() => {
            if (bank.website) {
                window.location.href = bank.website;
            } else {
                const query = encodeURIComponent(bank.name + ' official website');
                window.location.href = `https://www.google.com/search?q=${query}`;
            }
        }, 500);
    };

    redirectModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}
        


// Account balance functions removed - using simple redirects instead

// Old payment processing functions removed - using simple bank redirects instead
// Deprecated payment-processing code removed to avoid stray top-level await/try blocks.
// If you need to reintroduce provider-specific flows (Coinbase/Stripe/BTC),
// re-add them as properly scoped async functions (e.g. async function initiateBtcPayment(...) { ... }).

// Handle payment verification callback (called after redirecting back from payment provider)
async function handlePaymentVerification() {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sessionId');
    const chargeId = urlParams.get('chargeId');
    const pendingId = urlParams.get('pendingId');

    if (sessionId && pendingId) {
        // Verify Stripe payment
        try {
                const response = await fetch(`/verify-payment?sessionId=${sessionId}&pendingId=${pendingId}`);
                const data = await response.json();
                if (data.success) {
                    showNotification('Payment successful! Finalizing application...', 'success');
                    // Finalize application
                    await finalizeApplication(pendingId);
                } else {
                    showNotification('Payment verification failed.', 'error');
                }
            } catch (err) {
                console.error('Error verifying payment:', err);
            }
    } else if (chargeId && pendingId) {
        // Verify Coinbase payment
        try {
            const response = await fetch(`/verify-coinbase?chargeId=${chargeId}&pendingId=${pendingId}`);
            const data = await response.json();
            if (data.success) {
                showNotification('BTC Payment confirmed! Finalizing application...', 'success');
                // Finalize application
                await finalizeApplication(pendingId);
            } else {
                showNotification('BTC payment verification failed.', 'error');
            }
        } catch (err) {
            console.error('Error verifying BTC payment:', err);
        }
    }
}

// Finalize application after successful payment
async function finalizeApplication(pendingId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/finalize-application`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pendingId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('Application submitted successfully! We will contact you soon.', 'success');
            // Close modal and reset form
            const modal = document.getElementById('applicationModal');
            if (modal) {
                modal.style.display = 'none';
            }
            const form = document.getElementById('applicationForm');
            if (form) {
                form.reset();
            }
            document.body.style.overflow = 'auto';
            // Redirect to home after 2 seconds
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);
        } else {
            showNotification('Failed to finalize application. Please contact support.', 'error');
        }
    } catch (err) {
        console.error('Error finalizing application:', err);
        showNotification('Error finalizing application.', 'error');
    }
}

// Check for payment verification on page load
document.addEventListener('DOMContentLoaded', () => {
    handlePaymentVerification();
});

>>>>>>> ae83cad5b3b56f1c5efb5f6c9894034f4eca09c1
