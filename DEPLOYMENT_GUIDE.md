# RoutineGen - Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (sign up at vercel.com)
- Git installed on your computer

## Step-by-Step Deployment

### 1. Push Code to GitHub

```bash
# Initialize git repository (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial commit - RoutineGen MERN app"

# Add GitHub remote (replace with your repo URL)
git remote add origin https://github.com/yourusername/routinegen.git

# Push to GitHub
git push -u origin main
```

### 2. Deploy Backend to Vercel

1. Go to [vercel.com](https://vercel.com) and login
2. Click "New Project"
3. Import your GitHub repository
4. **Root Directory**: Leave as `.` (root)
5. **Framework Preset**: Other
6. **Build Command**: Leave empty
7. **Output Directory**: Leave empty
8. **Install Command**: `npm install`
9. Click "Deploy"
10. **Note the backend URL** (e.g., `https://your-backend.vercel.app`)

### 3. Deploy Frontend to Vercel

1. In Vercel dashboard, click "New Project" again
2. Import the **same GitHub repository**
3. **Root Directory**: `frontend`
4. **Framework Preset**: Create React App
5. **Build Command**: `npm run build`
6. **Output Directory**: `build`
7. **Install Command**: `npm install`
8. **Environment Variables**: Add `REACT_APP_API_URL` with your backend URL
9. Click "Deploy"

### 4. Update CORS Configuration

After deployment, update the backend CORS settings:

1. Edit `server.js` line 13
2. Replace `'https://your-frontend-url.vercel.app'` with your actual frontend URL
3. Commit and push changes to GitHub
4. Vercel will automatically redeploy

### 5. Test Your Application

1. Visit your frontend URL
2. Upload a CSV file
3. Verify schedule displays correctly
4. Test PDF and PNG downloads

## Environment Variables Setup

### Frontend (.env.production)
```
REACT_APP_API_URL=https://your-backend-url.vercel.app
```

### Backend (Vercel Dashboard)
Set these in Vercel dashboard under Project Settings > Environment Variables:
```
NODE_ENV=production
```

## Troubleshooting

### Common Issues:
1. **CORS Error**: Update CORS origins in server.js
2. **Build Fails**: Check package.json dependencies
3. **API Not Found**: Verify REACT_APP_API_URL is set correctly
4. **File Upload Issues**: Ensure multer is configured for serverless

### Vercel Logs:
- Go to your project dashboard
- Click on "Functions" tab
- Check logs for errors

## Project Structure After Deployment

```
your-repo/
├── server.js          # Backend (deployed separately)
├── vercel.json        # Backend config
├── package.json       # Backend dependencies
├── frontend/          # Frontend (deployed separately)
│   ├── vercel.json    # Frontend config
│   ├── package.json   # Frontend dependencies
│   └── src/           # React components
└── README.md          # This file
```

## URLs After Deployment
- **Backend API**: `https://your-backend.vercel.app`
- **Frontend App**: `https://your-frontend.vercel.app`
- **API Endpoints**: `https://your-backend.vercel.app/api/upload`

## Maintenance

### Updating Your App:
1. Make changes locally
2. Commit and push to GitHub
3. Vercel automatically redeploys both frontend and backend

### Monitoring:
- Check Vercel dashboard for deployment status
- Monitor function execution logs
- Set up Vercel analytics if needed

## Support
If you encounter issues:
1. Check Vercel documentation
2. Review GitHub repository settings
3. Verify environment variables
4. Check browser console for errors
