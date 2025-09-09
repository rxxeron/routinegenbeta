# Vercel Deployment Setup for Google Document AI

## Environment Variables Needed in Vercel

To deploy the backend with Google Document AI support to Vercel, you need to add the following environment variables in your Vercel dashboard:

### Required Environment Variables:

1. **GOOGLE_PROJECT_ID**: `routinegenparse`
2. **GOOGLE_LOCATION**: `us` 
3. **GOOGLE_PROCESSOR_ID**: `674477949cb16d50`
4. **GOOGLE_APPLICATION_CREDENTIALS_JSON**: (The entire contents of your google-service-account.json file as a JSON string)

### Steps to Deploy:

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your `routinegenbeta` project
3. Go to Settings → Environment Variables
4. Add the above environment variables
5. For GOOGLE_APPLICATION_CREDENTIALS_JSON, copy the entire content of your `google-service-account.json` file
6. Redeploy your project

### Alternative: Use Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Set environment variables
vercel env add GOOGLE_PROJECT_ID
vercel env add GOOGLE_LOCATION  
vercel env add GOOGLE_PROCESSOR_ID
vercel env add GOOGLE_APPLICATION_CREDENTIALS_JSON

# Deploy
vercel --prod
```

## Backend Code Update Required

The current server.js expects a local file, but Vercel needs to use environment variables. Update needed in server.js.
