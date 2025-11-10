require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

// Local handler (saves to user.json and sends emails)
const userHandler = require('./userHandler');

const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads directory exists at project root
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadsDir).catch(() => {});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve site static files from the project root
app.use(express.static(path.join(__dirname)));
// Serve uploads
app.use('/uploads', express.static(uploadsDir));

// API
app.get('/api/applicants', userHandler.getApplicants);
app.post('/api/apply', userHandler.handleApplication);

// Quick env warning (emails rely on these)
const missingEnvs = [];
if (!process.env.EMAIL_USER) missingEnvs.push('EMAIL_USER');
if (!process.env.EMAIL_PASS) missingEnvs.push('EMAIL_PASS');
if (!process.env.RECEIVER_EMAIL) missingEnvs.push('RECEIVER_EMAIL');
if (missingEnvs.length) console.warn('Warning: missing envs:', missingEnvs.join(', '));

app.listen(port, () => console.log(`Server running on port ${port}`));