Deploying `student-jobs` to Render

This repository contains a small Node.js server and static site for job applications.

Recommended deploy options:

1) Full Node Web Service (recommended if you need backend features like email and resume uploads)
   - Start command: `npm start`
   - Environment variables (set in Render dashboard):
     - EMAIL_USER
     - EMAIL_PASS
     - RECEIVER_EMAIL
   - Health check path: `/health`

2) Static Site (only the front-end)
   - Use Render Static Site and set the publish directory to the project root or `public/` if you move files.

Notes:
- The server listens on `process.env.PORT`.
- Uploaded resumes are written to the `uploads/` folder. The filesystem on Render is ephemeral; for persistent storage use S3 or another object store.
- Do not commit `.env` or secrets; use Render Dashboard to configure environment variables.
