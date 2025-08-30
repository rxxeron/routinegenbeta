# Vercel Frontend Deployment Setup

## Issue
The frontend Vercel project is trying to deploy from the root directory instead of the `frontend/` directory.

## Solution
Configure your Vercel frontend project with these settings:

### In Vercel Dashboard (https://vercel.com/dashboard)

1. **Go to your frontend project** (schedulegenewu)
2. **Go to Settings → General**
3. **Set Root Directory** to: `frontend`
4. **Go to Settings → Build & Development Settings**
5. **Set Build Command** to: `npm run build`
6. **Set Output Directory** to: `build`
7. **Set Install Command** to: `npm install`

### Alternative: Use Vercel CLI

Run these commands in your terminal:

```bash
# Navigate to frontend directory
cd frontend

# Deploy from frontend directory
vercel --prod

# Or set up project configuration
vercel project add schedulegenewu
```

## Current Status
- ✅ Backend project works: https://ewuschedule.vercel.app/
- ❌ Frontend project failing due to wrong root directory
- ✅ Code is clean and ready for deployment

## Next Steps
1. Update Vercel project settings as described above
2. Trigger a new deployment
3. Frontend should deploy successfully at: https://schedulegenewu.vercel.app/
