# NATE - National Alliance for Talent Exchange

## Overview
NATE is a comprehensive job opportunities platform designed to connect students, job seekers, and employers. It provides a seamless experience for job applications, payments, and career management.

## Platform Features

### 🎓 For Students & Job Seekers
- **Easy Registration** - Simple sign-up process
- **Job Applications** - Browse and apply to opportunities
- **Payment Processing** - Secure payment via Stripe, PayPal, and Coinbase
- **Resume Upload** - Store and manage your resume
- **Profile Management** - Update personal information

### 💼 For Employers & Organizations
- **Post Opportunities** - Create job listings
- **Application Management** - Review and manage applications
- **Payment Tracking** - Monitor transactions
- **Analytics** - Track platform metrics

### 👨‍💼 For Administrators
- **Complete Dashboard** - Overview of all activities
- **Application Management** - Approve/reject applications
- **Payment History** - View all transactions
- **User Management** - Manage users and access
- **Settings Control** - Configure platform settings

## Project Structure

```
NATE/
├── index.html              # Main homepage
├── script.js               # Main application logic
├── styles.css              # Main styles
├── server.js               # Node.js Express server
├── package.json            # Project dependencies
│
├── admin/                  # Admin Panel
│   ├── index.html         # Admin dashboard
│   ├── admin.js           # Admin logic with Supabase
│   ├── styles.css         # Admin styles
│   └── login.html         # Admin login (optional)
│
├── registration/           # Registration Portal
│   ├── index.html         # Registration form
│   ├── registration.js    # Registration logic
│   └── styles.css         # Registration styles
│
├── student-jobs/           # Student jobs section
│   ├── index.html
│   └── styles.css
│
├── uploads/               # Resume uploads (local storage)
├── data/                  # Data files
│   └── pendingApplications.json
│
├── banks.json             # Bank configuration
├── config.json            # App configuration
├── giftCards.json         # Gift cards data
└── README.md              # This file

```

## Access Points

### User Facing
- **Main Portal**: `http://localhost:3000` or `https://phone-4hza.onrender.com`
- **Registration**: `http://localhost:3000/registration/` or `https://phone-4hza.onrender.com/registration/`

### Admin Panel
- **Admin Dashboard**: `http://localhost:3000/admin/` or `https://phone-4hza.onrender.com/admin/`
- **Demo Credentials**:
  - Email: `admin@nate.com`
  - Password: `admin123`

## Technology Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Font Awesome Icons
- Supabase JS Client

### Backend
- Node.js
- Express.js
- Multer (File uploads)
- Nodemailer (Email)
- Stripe (Payments)
- Coinbase Commerce (Payments)

### Database & Services
- **Supabase** (PostgreSQL database)
  - Users table
  - Applications table
  - Payments table
- **Stripe** (Payment processing)
- **Coinbase Commerce** (Crypto payments)
- **Render** (Hosting)

## Database Tables

### Users Table
```sql
- id (UUID)
- first_name (TEXT)
- last_name (TEXT)
- email (TEXT, UNIQUE)
- phone (TEXT)
- user_type (TEXT) - student/job-seeker/employer/recruiter
- organization (TEXT)
- newsletter_subscribed (BOOLEAN)
- created_at (TIMESTAMP)
```

### Applications Table
```sql
- id (UUID)
- first_name (TEXT)
- last_name (TEXT)
- email (TEXT)
- phone (TEXT)
- position (TEXT)
- experience (TEXT)
- cover_letter (TEXT)
- resume_url (TEXT)
- status (TEXT) - pending/approved/rejected
- terms (BOOLEAN)
- submitted_at (TIMESTAMP)
```

### Payments Table
```sql
- id (UUID)
- user_id (UUID, FK)
- amount (DECIMAL)
- currency (TEXT)
- payment_method (TEXT) - card/paypal/crypto
- status (TEXT) - pending/completed/failed
- transaction_id (TEXT)
- created_at (TIMESTAMP)
```

## Features & Functionality

### 1. User Registration
- Full name, email, phone validation
- Secure password with strength indicator
- Role selection (Student/Job Seeker/Employer/Recruiter)
- Newsletter subscription option
- Direct integration with Supabase

### 2. Job Applications
- Browse opportunities
- Submit applications with resume
- Track application status
- Payment processing required ($50)

### 3. Payment Processing
- **Stripe** - Credit/debit card payments
- **PayPal** - PayPal integration
- **Coinbase Commerce** - Cryptocurrency payments
- **Gift Cards** - Discount code support
- Secure transaction handling

### 4. Resume Management
- Upload PDF resumes
- Primary upload to Supabase Storage
- Fallback to local `/uploads` directory
- Automatic file naming with timestamps

### 5. Admin Dashboard
- Real-time statistics
- Application management (view, approve, reject)
- Payment history tracking
- User management
- Platform settings configuration

### 6. Responsive Design
- Mobile-friendly interface
- Tablet optimization
- Desktop-optimized admin panel
- Accessible (WCAG 2.1 compliant)

## Installation & Setup

### Prerequisites
- Node.js (v14+)
- npm or yarn
- Supabase account
- Stripe account (optional)
- Render account (for deployment)

### Local Development

1. **Clone/Navigate to project**
```bash
cd "c:\Users\HP\OneDrive\Documents\ayomide web dev\NATE"
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables** (create `.env` file)
```env
PORT=3000
STRIPE_SECRET_KEY=your_stripe_key
SUPABASE_URL=https://trcbyqdfgnlaesixhorz.supabase.co
SUPABASE_KEY=your_supabase_key
COINBASE_API_KEY=your_coinbase_key
NODE_ENV=development
```

4. **Start the server**
```bash
node server.js
```

5. **Access the application**
- Main: `http://localhost:3000`
- Registration: `http://localhost:3000/registration/`
- Admin: `http://localhost:3000/admin/`

## Deployment (Render)

The project includes `render.yaml` configuration for automatic deployment.

### Deploy Steps:
1. Push code to GitHub
2. Connect GitHub to Render
3. Render detects `render.yaml` automatically
4. Add environment variables in Render dashboard
5. Deploy!

Access deployed app at: `https://phone-4hza.onrender.com`

## API Endpoints

### Registration
- `POST /api/register` - Register new user

### Applications
- `POST /api/apply` - Submit job application
- `GET /api/applications` - Get all applications (admin)

### Payments
- `POST /api/payment/stripe` - Process Stripe payment
- `POST /api/payment/coinbase` - Process crypto payment

### Resume Upload
- `POST /api/resume` - Upload resume file

### Account Validation
- `POST /api/validate-account` - Validate bank account

### Contact
- `POST /api/contact` - Send contact message

## Key Behaviors

### Resume Upload Fallback
If Supabase storage is unavailable, resumes automatically save to local `/uploads` directory. No user-facing errors.

### Auto-URL Detection
- Frontend automatically detects environment (localhost vs Render)
- Admin panel works on any domain
- No manual configuration needed

### Error Handling
- Graceful degradation for missing services
- User-friendly error messages
- Comprehensive logging in console

## Accessibility Features
- ✅ Screen reader support (aria labels)
- ✅ Keyboard navigation
- ✅ Color contrast compliance
- ✅ Form validation feedback
- ✅ Skip links (where applicable)

## Security Features
- ✅ Form validation (client & server)
- ✅ Secure password handling
- ✅ Encrypted payment data
- ✅ HTTPS in production
- ✅ Environment variables for secrets

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Future Enhancements
- [ ] Email notifications
- [ ] Advanced search filtering
- [ ] Job recommendations
- [ ] Skill matching algorithm
- [ ] Video interview integration
- [ ] Social media login
- [ ] Mobile app (React Native)
- [ ] Advanced analytics

## Support & Contact
For issues or feature requests, contact:
- Email: admin@nate.com
- Phone: +1 (555) 000-0000

## License
Proprietary - All rights reserved to NATE

## Version
**Current Version**: 1.0.0
**Last Updated**: November 12, 2025

---

**NATE - Empowering Careers, Connecting Talents**
