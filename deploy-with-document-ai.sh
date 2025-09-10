#!/bin/bash

echo "🚀 Deploying to Vercel with Document AI support..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Set environment variables for deployment
echo "📝 Setting up environment variables..."

echo "⚠️  IMPORTANT: Make sure you have added these environment variables in Vercel Dashboard:"
echo "   - GOOGLE_APPLICATION_CREDENTIALS_JSON"
echo "   - GOOGLE_PROJECT_ID"  
echo "   - GOOGLE_LOCATION"
echo "   - GOOGLE_PROCESSOR_ID"
echo ""
echo "📖 See VERCEL_DOCUMENT_AI_ENV_SETUP.md for detailed instructions"
echo ""

# Deploy to Vercel
echo "🚢 Deploying to Vercel..."
vercel --prod

echo "✅ Deployment complete!"
echo ""
echo "🧪 Test your deployment by uploading a PDF or JPG file"
echo "📊 The server should now use Google Document AI for processing"
