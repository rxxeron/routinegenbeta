# Vercel Production Deployment Guide

## 🎯 Setting Testing Branch as Production in Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. **Go to your Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your `routinegenbeta` project

2. **Navigate to Settings**
   - Click on the project
   - Go to "Settings" tab
   - Click "Git" in the sidebar

3. **Change Production Branch**
   - Find "Production Branch" section
   - Change from `main` to `testing`
   - Click "Save"

4. **Enable Auto-deployments**
   - Ensure "Automatic deployments" is enabled for the `testing` branch
   - Save the changes

### Method 2: Via Vercel CLI

1. **Install Vercel CLI** (if not already installed)
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Link your project**
   ```bash
   vercel link
   ```

4. **Set production branch**
   ```bash
   vercel project set production-branch testing
   ```

### Method 3: Manual Promotion

After each deployment to `testing` branch:

1. Go to Vercel Dashboard
2. Find the preview deployment
3. Click "Promote to Production" button

### Method 4: Force Production Deployment

You can force a production deployment using:

```bash
vercel --prod
```

Or in your deployment script:

```bash
vercel deploy --prod --confirm
```

## 🔧 Updated Configuration Files

The vercel.json files have been updated with:

```json
{
  "git": {
    "deploymentEnabled": {
      "testing": true
    }
  },
  "github": {
    "autoAlias": false
  }
}
```

## 📋 Deployment Script

Create a `deploy.sh` or `deploy.bat` file:

```bash
#!/bin/bash
echo "🚀 Deploying to Vercel Production..."
git push beta testing
vercel deploy --prod --confirm
echo "✅ Deployment complete!"
```

## 🎯 Best Practices

1. **Set testing as production branch** in Vercel dashboard
2. **Use environment variables** for production settings
3. **Test deployments** with preview before promoting
4. **Monitor deployment logs** for issues

## 🔍 Verification

After configuration:
- New pushes to `testing` should deploy as production
- Check Vercel dashboard shows "Production" instead of "Preview"
- Your domain should point to the latest `testing` deployment

## 🚨 Important Notes

- Production deployments get the main domain
- Preview deployments get unique URLs
- Environment variables may differ between production and preview
- Vercel dashboard settings override vercel.json git settings

Choose Method 1 (Dashboard) for the most reliable results!
