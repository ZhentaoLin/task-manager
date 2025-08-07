# Deployment Guide for Task Manager

## Prerequisites
- Vercel account (free): https://vercel.com/signup
- Render account (free): https://render.com/register

## Step 1: Deploy Backend to Render

1. Push your backend code to GitHub (create a new repo or use existing)
2. Go to https://render.com and sign in
3. Click "New +" → "Web Service"
4. Connect your GitHub account and select your repository
5. Configure the service:
   - Name: `task-manager-backend`
   - Root Directory: `backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add environment variable:
   - Click "Environment" tab
   - Add: `CLAUDE_API_KEY` = `your-actual-api-key`
7. Click "Create Web Service"
8. Copy the URL (e.g., `https://task-manager-backend.onrender.com`)

## Step 2: Deploy Frontend to Vercel

1. In your terminal, run:
   ```bash
   cd /Users/zhelin/personal/task-manager
   vercel
   ```

2. Follow the prompts:
   - Set up and deploy? `Y`
   - Which scope? Select your account
   - Link to existing project? `N`
   - Project name? `task-manager-app`
   - Directory? `.` (current directory)
   - Override settings? `N`

3. Add environment variables in Vercel Dashboard:
   - Go to your project on vercel.com
   - Settings → Environment Variables
   - Add:
     - `REACT_APP_BACKEND_URL` = `https://task-manager-backend.onrender.com` (your Render URL)
     - `REACT_APP_AI_ENABLED` = `true`
     - `REACT_APP_SUPABASE_URL` = `[your-supabase-url]`
     - `REACT_APP_SUPABASE_ANON_KEY` = `[your-supabase-key]`

4. Redeploy to apply environment variables:
   ```bash
   vercel --prod
   ```

## Step 3: Share with Your Wife!

Your app will be available at:
- Production: `https://task-manager-app.vercel.app`
- Both of you can access the same data (stored in Supabase)
- Works on any device with a web browser

## Local Development

To run locally:
```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
cd ..
npm install
npm start
```

## Notes

- Render free tier may sleep after 15 minutes of inactivity (first request will be slow)
- For always-on backend, consider upgrading Render or using alternatives like Railway or Fly.io
- Vercel free tier is very generous for frontend hosting
- Your Supabase database is already cloud-based and accessible from anywhere