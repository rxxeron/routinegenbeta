@echo off
echo 🚀 Deploying to Vercel with Document AI support...

REM Check if vercel CLI is installed
where vercel >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
)

echo.
echo 📝 Setting up environment variables...
echo.
echo ⚠️  IMPORTANT: Make sure you have added these environment variables in Vercel Dashboard:
echo    - GOOGLE_APPLICATION_CREDENTIALS_JSON
echo    - GOOGLE_PROJECT_ID  
echo    - GOOGLE_LOCATION
echo    - GOOGLE_PROCESSOR_ID
echo.
echo 📖 See VERCEL_DOCUMENT_AI_ENV_SETUP.md for detailed instructions
echo.

REM Deploy to Vercel
echo 🚢 Deploying to Vercel...
vercel --prod

echo.
echo ✅ Deployment complete!
echo.
echo 🧪 Test your deployment by uploading a PDF or JPG file
echo 📊 The server should now use Google Document AI for processing
pause
