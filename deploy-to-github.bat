@echo off
echo Deploying RoutineGen to GitHub...

REM Check if git is available
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not installed. Please run setup-git.bat first.
    pause
    exit /b 1
)

REM Prompt for GitHub repository URL
set /p REPO_URL="Enter your GitHub repository URL (e.g., https://github.com/username/routinegen.git): "

if "%REPO_URL%"=="" (
    echo Repository URL cannot be empty!
    pause
    exit /b 1
)

echo Adding GitHub remote...
git remote add origin %REPO_URL%

echo Pushing to GitHub...
git branch -M main
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ✅ Successfully pushed to GitHub!
    echo.
    echo Next steps for Vercel deployment:
    echo 1. Go to https://vercel.com
    echo 2. Click "New Project"
    echo 3. Import your GitHub repository
    echo 4. Deploy backend first (root directory)
    echo 5. Deploy frontend second (frontend directory)
    echo.
    echo See DEPLOYMENT_GUIDE.md for detailed instructions.
) else (
    echo.
    echo ❌ Push failed. Please check:
    echo - Repository URL is correct
    echo - You have access to the repository
    echo - Repository exists on GitHub
)

pause
