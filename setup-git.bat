@echo off
echo Setting up RoutineGen for GitHub deployment...

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git is not installed or not in PATH. Please install Git first:
    echo https://git-scm.com/download/win
    pause
    exit /b 1
)

echo Git found. Proceeding with setup...

REM Initialize repository
git init

REM Create .gitignore file
echo node_modules/ > .gitignore
echo .env >> .gitignore
echo *.log >> .gitignore
echo .DS_Store >> .gitignore
echo build/ >> .gitignore
echo dist/ >> .gitignore

REM Add all files
git add .

REM Configure git user (you may need to change these)
git config user.name "Your Name"
git config user.email "your.email@example.com"

REM Commit files
git commit -m "Initial commit - RoutineGen MERN application ready for Vercel deployment"

echo.
echo Git repository initialized and files committed!
echo.
echo Next steps:
echo 1. Create a new repository on GitHub
echo 2. Copy the repository URL
echo 3. Run: git remote add origin [YOUR_REPO_URL]
echo 4. Run: git push -u origin main
echo.
echo Or run deploy-to-github.bat after creating the GitHub repo
pause
