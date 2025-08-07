#!/bin/bash

echo "🧪 Testing Production Deployment"
echo "================================"
echo ""

BACKEND_URL="https://task-manager-backend-99uz.onrender.com"
FRONTEND_URL="https://task-manager-9lgvqhxzp-zhentao-lins-projects.vercel.app"

echo "Testing Backend API..."
echo "URL: $BACKEND_URL"
echo ""

# Test if backend is responding
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/claude/summary" -X POST -H "Content-Type: application/json" -d '{"prompt":"Test"}')

if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ Backend is responding correctly!"
elif [ "$BACKEND_STATUS" = "000" ]; then
    echo "⏳ Backend is still deploying or sleeping (Render free tier). Please wait..."
else
    echo "❌ Backend returned status: $BACKEND_STATUS"
fi

echo ""
echo "Frontend URL: $FRONTEND_URL"
echo ""
echo "📱 Share this URL with your wife: $FRONTEND_URL"
echo ""
echo "Note: Render free tier sleeps after 15 minutes of inactivity."
echo "First request after sleep takes ~30 seconds to wake up."