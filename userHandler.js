const fs = require('fs').promises;
const path = require('path');
const nodemailer = require('nodemailer');

// Create transporter for emails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// User data operations
async function getAllUsers() {
    const usersFile = path.join(__dirname, 'user.json');
    try {
        const raw = await fs.readFile(usersFile, 'utf8');
        const users = JSON.parse(raw || '[]');
        return Array.isArray(users) ? users : [];
    } catch (err) {
        if (err.code === 'ENOENT') {
            await fs.writeFile(usersFile, '[]', 'utf8');
            return [];
        }
        throw err;
    }
}

async function saveUser(userData) {
    const usersFile = path.join(__dirname, 'user.json');
    const users = await getAllUsers();
    users.push(userData);
    await fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8');
}

async function sendEmail(userData) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.RECEIVER_EMAIL || process.env.EMAIL_USER,
        subject: `New Job Application from ${userData.fullName}`,
        html: `
            <h2>New Job Application Received</h2>
            <p><strong>Name:</strong> ${userData.fullName}</p>
            <p><strong>Email:</strong> ${userData.email}</p>
            <p><strong>Phone:</strong> ${userData.phone}</p>
            <p><strong>Date of Birth:</strong> ${userData.dob || 'Not provided'}</p>
            <p><strong>Country:</strong> ${userData.country || 'Not provided'}</p>
            <p><strong>Education:</strong> ${userData.education}</p>
            <p><strong>Cover Letter:</strong></p>
            <p>${userData.coverLetter || 'No cover letter provided'}</p>
        `
    };

    return transporter.sendMail(mailOptions);
}

module.exports = {
    // Handler for GET /api/applicants
        getApplicants: async function(req, res) {
        try {
            const applicants = await getAllUsers();
            applicants.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));
            res.json({
                success: true,
                data: applicants
            });
        } catch (error) {
            console.error('Error fetching applicants:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching applicants'
            });
        }
    },

    // Handler for POST /api/apply
        handleApplication: async function(req, res) {
        try {
            const {
                fullName,
                email,
                phone,
                education,
                resume,
                resumeData,
                coverLetter,
                dob,
                country
            } = req.body;

            // Handle resume file if provided
            let resumePath = null;
            if (resumeData && resume) {
                try {
                    const base64Data = resumeData.split(',')[1];
                    if (!base64Data) {
                        throw new Error('Invalid file data');
                    }
                    const buffer = Buffer.from(base64Data, 'base64');
                    
                    // Validate file size (max 10MB)
                    if (buffer.length > 10 * 1024 * 1024) {
                        throw new Error('File too large');
                    }
                    
                    resumePath = path.join('uploads', `${Date.now()}-${resume}`);
                    await fs.writeFile(path.join(__dirname, resumePath), buffer);
                } catch (err) {
                    console.error('Error processing resume:', err);
                    throw new Error('Failed to process resume file: ' + err.message);
                }
            }

            // Try to send email
            let emailSent = false;
            let emailError = null;
            try {
                await sendEmail({
                    fullName,
                    email,
                    phone,
                    education,
                    dob,
                    country,
                    coverLetter
                });
                emailSent = true;
            } catch (err) {
                emailError = err.message;
                console.error('Error sending email:', err);
            }

            // Save application
            const applicationData = {
                fullName,
                email,
                phone,
                education,
                dob: dob || null,
                country: country || null,
                resume: resume,
                resumePath: resumePath,
                coverLetter: coverLetter || null,
                receivedAt: new Date().toISOString(),
                emailSent,
                emailError
            };

            await saveUser(applicationData);

            if (!emailSent) {
                res.status(200).json({
                    success: true,
                    message: 'Application saved but email failed to send'
                });
            } else {
                res.status(200).json({
                    success: true,
                    message: 'Application submitted successfully'
                });
            }
        } catch (error) {
            console.error('Error processing application:', error);
            res.status(500).json({ 
                success: false, 
                message: error.message || 'Error submitting application' 
            });
        }
    }
};