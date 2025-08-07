#!/bin/bash

echo "🚀 Task Manager Deployment Script"
echo "================================="
echo ""

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Not logged in to Vercel. Please run: vercel login"
    exit 1
fi

echo "✅ Logged in to Vercel"
echo ""

# Deploy to Vercel
echo "📦 Deploying frontend to Vercel..."
vercel --prod

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Deploy your backend to Render.com (see DEPLOYMENT.md)"
echo "2. Update REACT_APP_BACKEND_URL in Vercel dashboard with your Render URL"
echo "3. Redeploy with: vercel --prod"
echo ""
echo "Share your app URL with your wife and enjoy! 💑"