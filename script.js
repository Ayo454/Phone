// API configuration
const API_BASE = 'https://phone-4hza.onrender.com';

// Sample job data (in a real application, this would come from a backend server)
const jobs = [
    {
        id: 1,
        title: 'Senior Software Engineer',
        department: 'Technology',
        location: 'New York',
        type: 'Full-time',
        salary: '$120,000 - $150,000',
        experience: '5+ years',
        description: 'Looking for an experienced software engineer to lead development of our core platforms.'
    },
    {
        id: 2,
        title: 'Marketing Manager',
        department: 'Marketing',
        location: 'Remote',
        type: 'Full-time',
        salary: '$80,000 - $100,000',
        experience: '3+ years',
        description: 'Join our marketing team to drive brand growth and customer engagement.'
    },
    {
        id: 3,
        title: 'UX Designer',
        department: 'Design',
        location: 'San Francisco',
        type: 'Full-time',
        salary: '$90,000 - $120,000',
        experience: '2+ years',
        description: 'Create exceptional user experiences for our digital products.'
    },
    {
        id: 4,
        title: 'Data Analyst',
        department: 'Analytics',
        location: 'Remote',
        type: 'Full-time',
        salary: '$70,000 - $90,000',
        experience: '2+ years',
        description: 'Transform data into actionable insights for business decision-making.'
    },
    {
        id: 5,
        title: 'Product Manager',
        department: 'Product',
        location: 'Boston',
        type: 'Full-time',
        salary: '$100,000 - $130,000',
        experience: '4+ years',
        description: 'Lead product strategy and development for our core offerings.'
    },
    {
        id: 6,
        title: 'Campus Ambassador',
        department: 'Marketing',
        location: 'Remote',
        type: 'Part-time',
        salary: '$15/hr',
        experience: '0-1 years',
        description: 'Represent our brand on campus and help grow our student community.'
    },
    {
        id: 7,
        title: 'Library Assistant',
        department: 'Education',
        location: 'On Campus',
        type: 'Part-time',
        salary: '$12/hr',
        experience: '0-1 years',
        description: 'Support library operations and assist students with research resources.'
    },
    {
        id: 8,
        title: 'Marketing Intern',
        department: 'Marketing',
        location: 'Hybrid',
        type: 'Internship',
        salary: '$18/hr',
        experience: '0-1 years',
        description: 'Learn and contribute to digital marketing campaigns and strategies.'
    },
    {
        id: 9,
        title: 'Research Assistant',
        department: 'Research',
        location: 'On Campus',
        type: 'Part-time',
        salary: '$16/hr',
        experience: '1-2 years',
        description: 'Support research projects and assist with data collection and analysis.'
    },
    {
        id: 10,
        title: 'Web Developer',
        department: 'Technology',
        location: 'Remote',
        type: 'Flexible',
        salary: '$20/hr',
        experience: '1-3 years',
        description: 'Build and maintain web applications using modern technologies.'
    },
    {
        id: 11,
        title: 'Student Mentor',
        department: 'Education',
        location: 'On Campus',
        type: 'Part-time',
        salary: '$14/hr',
        experience: '2+ years',
        description: 'Guide and support fellow students in their academic journey.'
    }
];

// Function to show application form directly
function showAllPositions(e) {
    if (e) e.preventDefault();
    const modal = document.getElementById('jobApplicationModal');
    if (modal) {
        // Reset the form if it exists
        const form = document.getElementById('jobApplicationForm');
        if (form) form.reset();
        
        // Show the modal
        modal.classList.add('show');

        // Add event listener to close button
        const closeBtn = modal.querySelector('.close-button');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                modal.classList.remove('show');
            };
        }

        // Close modal when clicking outside
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        };

        // Prevent clicks inside modal from closing it
        modal.querySelector('.modal-content').onclick = (e) => {
            e.stopPropagation();
        };
    }
}

// Function to populate jobs
function populateJobs() {
    const positionsList = document.querySelector('.positions-list');
    if (positionsList) {
        const jobsHTML = jobs.map(job => createJobCard(job)).join('');
        positionsList.innerHTML = jobsHTML;
    }
}

// Function to handle job application click
function openJobApplication(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
        const modal = document.getElementById('jobApplicationModal');
        if (modal) {
            document.getElementById('modalJobTitle').textContent = `Apply for ${job.title}`;
            modal.style.display = 'block';
        } else {
            alert(`Apply for: ${job.title}\nDepartment: ${job.department}`);
        }
    }
}

// Function to handle job application modal
function setupJobModal() {
    const modal = document.getElementById('jobApplicationModal');
    const closeBtn = modal.querySelector('.close-button');
    const form = document.getElementById('jobApplicationForm');

    // Open modal when clicking Apply Now
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('apply-button') || 
            e.target.closest('.banner-item')) {
            const jobId = e.target.closest('[data-job-id]').dataset.jobId;
            const job = jobs.find(j => j.id === parseInt(jobId));
            if (job) {
                document.getElementById('modalJobTitle').textContent = `Apply for ${job.title}`;
                modal.style.display = 'block';
            }
        }
    });

    // Close modal when clicking X
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }

    // Close modal when clicking outside
    window.onclick = function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    }

    // Handle form submission
    form.onsubmit = function(e) {
        e.preventDefault();
        const formData = new FormData(form);
        // In a real application, you would send this data to a server
        alert('Application submitted successfully! We will contact you soon.');
        modal.style.display = 'none';
        form.reset();
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.querySelector('.search-box input');
    const searchButton = document.querySelector('.search-box button');

    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredJobs = jobs.filter(job => 
            job.title.toLowerCase().includes(searchTerm) ||
            job.company.toLowerCase().includes(searchTerm) ||
            job.location.toLowerCase().includes(searchTerm)
        );

        const jobsGrid = document.querySelector('.jobs-grid');
        const jobsHTML = filteredJobs.map(job => createJobCard(job)).join('');
        jobsGrid.innerHTML = jobsHTML;
    }

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
}

// Contact form handling
function setupContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form values
        const name = contactForm.querySelector('input[type="text"]').value;
        const email = contactForm.querySelector('input[type="email"]').value;
        const message = contactForm.querySelector('textarea').value;
        
        // In a real application, you would send this data to a server
        alert(`Thank you for your message, ${name}! We'll get back to you at ${email} soon.`);
        
        // Clear the form
        contactForm.reset();
    });
}

// Smooth scrolling for navigation links
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            // Only scroll if href is not just "#"
            if (href && href !== '#') {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
}

// Modal handling
function setupModal() {
    const modal = document.getElementById('applicationModal');
    const closeButton = document.querySelector('.close-button');
    
    // Close modal when clicking the close button
    closeButton.onclick = function() {
        modal.style.display = "none";
    }
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Handle apply button clicks
    document.addEventListener('click', function(e) {
        if (e.target && e.target.classList.contains('apply-button')) {
            e.preventDefault();
            const jobTitle = e.target.getAttribute('data-job-title');
            const company = e.target.getAttribute('data-company');
            
            // Set hidden form fields
            document.getElementById('jobTitle').value = jobTitle;
            document.getElementById('company').value = company;
            
            // Show modal
            modal.style.display = "block";
        }
    });
}

// Handle form submission
function setupApplicationForm() {
    const form = document.getElementById('jobApplicationForm');
    
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Get form data
            const formData = new FormData(form);
                    const applicationData = {
                        fullName: formData.get('fullName'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        education: formData.get('education'),
                        coverLetter: formData.get('coverLetter'),
                        dob: formData.get('dob') || null,
                        country: formData.get('country') || null
                    };

                    // Handle resume file: include both filename and file data
                    const resumeInput = document.getElementById('resume');
                    if (resumeInput && resumeInput.files && resumeInput.files[0]) {
                        const file = resumeInput.files[0];
                        applicationData.resume = file.name; // store filename

                        // Convert file to base64
                        const reader = new FileReader();
                        try {
                            const fileData = await new Promise((resolve, reject) => {
                                reader.onload = () => resolve(reader.result);
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                            });
                            applicationData.resumeData = fileData;
                        } catch (err) {
                            console.error('Error reading file:', err);
                            throw new Error('Error processing resume file. Please try again.');
                        }
                    } else {
                        applicationData.resume = null;
                        applicationData.resumeData = null;
                    }
            
            try {
                // Show loading state
                const submitButton = form.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.textContent = 'Processing file...';

                // Validate file size (max 50MB) using the File API (check before base64 length)
                const maxSize = 50 * 1024 * 1024; // 50MB in bytes
                const resumeInputElem = document.getElementById('resume');
                if (resumeInputElem && resumeInputElem.files && resumeInputElem.files[0]) {
                    const fileObj = resumeInputElem.files[0];
                    if (fileObj.size > maxSize) {
                        throw new Error('Resume file is too large. Please use a file smaller than 50MB.');
                    }
                }

                submitButton.textContent = 'Submitting application...';

                // Always use the Render backend URL
                const apiUrl = 'https://phone-4hza.onrender.com';

                // Send data to server
                const response = await fetch(`${apiUrl}/api/apply`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(applicationData)
                });

                const result = await response.json();

                if (result.success) {
                    // Show success message
                    alert(`Thank you ${applicationData.fullName}! Your application has been submitted successfully. We will contact you soon.`);
                    
                    // Close modal and reset form
                    const modal = document.getElementById('jobApplicationModal');
                    if (modal) {
                        modal.classList.remove('show');
                    }
                    form.reset();
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('Error:', error);
                
                // Show specific error message
                let errorMessage = 'Sorry, there was an error submitting your application.';
                if (error.message.includes('too large')) {
                    errorMessage = 'The resume file is too large. Please use a file smaller than 10MB.';
                } else if (error.message.includes('processing resume')) {
                    errorMessage = 'There was an error processing your resume file. Please try a different PDF file.';
                }
                
                alert(errorMessage + ' Please try again.');
            } finally {
                // Reset button state
                const submitButton = form.querySelector('button[type="submit"]');
                submitButton.disabled = false;
                submitButton.textContent = 'Submit Application';
            }
        });
    }

    // Show selected resume filename to the user
    const resumeInput = document.getElementById('resume');
    const resumeFilename = document.getElementById('resumeFilename');
    if (resumeInput && resumeFilename) {
        resumeInput.addEventListener('change', () => {
            const f = resumeInput.files && resumeInput.files[0];
            resumeFilename.textContent = f ? `Selected file: ${f.name}` : '';
        });
    }
}

// Mobile menu toggle function
function setupMobileMenu() {
    const menuButton = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navItems = document.querySelectorAll('.nav-links a');

    if (menuButton && navLinks) {
        menuButton.addEventListener('click', () => {
            navLinks.classList.toggle('show');
            menuButton.innerHTML = navLinks.classList.contains('show') 
                ? '<i class="fas fa-times"></i>' 
                : '<i class="fas fa-bars"></i>';
        });

        // Close menu when clicking a link
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navLinks.classList.remove('show');
                menuButton.innerHTML = '<i class="fas fa-bars"></i>';
            });
        });
    }
}

// Initialize everything when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up the apply button click handler
    document.querySelector('.main-apply-button').addEventListener('click', showAllPositions);
    
    // Set up form submission
    setupApplicationForm();
    
    // Set up mobile menu
    setupMobileMenu();
    
    // Set up other functionality
    setupContactForm();
    setupSmoothScrolling();
});