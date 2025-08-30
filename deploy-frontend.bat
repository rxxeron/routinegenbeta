@echo off
echo Deploying Frontend to Vercel...
echo.

cd frontend
echo Current directory: %cd%
echo.

echo Installing dependencies...
npm install

echo.
echo Building the project...
npm run build

echo.
echo Deploying to Vercel...
vercel --prod

echo.
echo Frontend deployment complete!
echo Your app should be available at: https://schedulegenewu.vercel.app/

pause
