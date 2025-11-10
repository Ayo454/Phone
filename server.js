require('dotenv').config();
console.log('Starting server script (server.js)');

// Catch unhandled errors so we can see them in the console
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir).catch(() => {}); // Ignore if already exists

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static admin files
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Serve uploaded resumes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// GET endpoint to fetch applicants
app.get('/api/applicants', async (req, res) => {
    try {
        const usersFile = path.join(__dirname, 'user.json');
        let applicants = [];
        
        try {
            const raw = await fs.readFile(usersFile, 'utf8');
            applicants = JSON.parse(raw || '[]');
            if (!Array.isArray(applicants)) applicants = [];
        } catch (readErr) {
            // If file doesn't exist or is invalid, return empty array
            applicants = [];
        }
        
        // Optional sorting by received date (newest first)
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
});

// Create email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Basic environment validation
const missingEnvs = [];
if (!process.env.EMAIL_USER) missingEnvs.push('EMAIL_USER');
if (!process.env.EMAIL_PASS) missingEnvs.push('EMAIL_PASS');
if (!process.env.RECEIVER_EMAIL) missingEnvs.push('RECEIVER_EMAIL');
if (missingEnvs.length) {
    console.warn('Warning: missing required environment variables:', missingEnvs.join(', '));
    console.warn('The server may not be able to send emails until these are set.');
}
// Handle job application submissions
app.post('/api/apply', async (req, res) => {
    try {
        const {
            fullName,
            email,
            phone,
            education,
            resume,
            resumeData, // Base64 PDF data
            coverLetter,
            dob,
            country
        } = req.body;

        // Handle resume file if provided
        let resumePath = null;
        if (resumeData && resume) {
            try {
                // Convert base64 to buffer
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

        // Email content
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.RECEIVER_EMAIL || process.env.EMAIL_USER, // Send to configured receiver
            subject: `New Job Application from ${fullName}`,
            html: `
                <h2>New Job Application Received</h2>
                <p><strong>Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Date of Birth:</strong> ${dob || 'Not provided'}</p>
                <p><strong>Country:</strong> ${country || 'Not provided'}</p>
                <p><strong>Education:</strong> ${education}</p>
                <p><strong>Cover Letter:</strong></p>
                <p>${coverLetter || 'No cover letter provided'}</p>
            `
        };

        // Try to send email, but don't fail the whole request if email sending fails.
        let emailSent = false;
        let emailError = null;
        try {
            await transporter.sendMail(mailOptions);
            emailSent = true;
        } catch (err) {
            emailError = err && err.message ? err.message : String(err);
            console.error('Error sending email:', err);
        }

        // Also store application details to user.json regardless of email result
        let writeError = null;
        try {
            const usersFile = path.join(__dirname, 'user.json');
            const record = {
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

            let existing = [];
            try {
                const raw = await fs.readFile(usersFile, 'utf8');
                existing = JSON.parse(raw || '[]');
                if (!Array.isArray(existing)) existing = [];
            } catch (readErr) {
                // If file doesn't exist or is invalid, start fresh
                existing = [];
            }

            existing.push(record);
            await fs.writeFile(usersFile, JSON.stringify(existing, null, 2), 'utf8');
        } catch (err) {
            writeError = err;
            console.error('Failed to write application to user.json:', err);
        }

        // Respond: prefer success if write succeeded; if write failed, return 500.
        if (writeError) {
            res.status(500).json({
                success: false,
                message: 'Error submitting application'
            });
        } else if (!emailSent) {
            // Email failed but we saved the application
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
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting application' 
        });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});