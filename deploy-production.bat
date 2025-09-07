@echo off
echo 🚀 Deploying RoutineGen to Vercel Production...
echo.

echo 📤 Pushing to GitHub beta repository...
git add -A
git commit -m "Production deployment - %date% %time%"
git push beta testing

echo.
echo 🏗️ Triggering Vercel production deployment...
echo.
echo ⚡ To complete production deployment, run:
echo    vercel --prod
echo.
echo 📱 Or visit Vercel Dashboard and promote the latest preview to production
echo 🌐 Dashboard: https://vercel.com/dashboard
echo.
echo ✅ Git push completed! 
pause
