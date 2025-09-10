# Vercel Environment Variables Setup Guide

## Add these environment variables in your Vercel dashboard:

### 1. GOOGLE_APPLICATION_CREDENTIALS_JSON
Copy the entire content of your Google Cloud service account JSON file and paste it as one line.

**Example format (replace with your actual credentials):**
```
{"type":"service_account","project_id":"your-project-id","private_key_id":"your-private-key-id","private_key":"-----BEGIN PRIVATE KEY-----\n[YOUR_PRIVATE_KEY_CONTENT]\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com","client_id":"your-client-id","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs/your-service-account%40your-project.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

### 2. GOOGLE_PROJECT_ID
```
your-google-project-id
```

### 3. GOOGLE_LOCATION  
```
us
```

### 4. GOOGLE_PROCESSOR_ID
```
your-processor-id
```

## Steps to add in Vercel Dashboard:

1. Go to https://vercel.com/dashboard
2. Select your project (routinegenbeta)
3. Go to Settings > Environment Variables
4. Add each variable above with the exact names and values
5. Make sure to select "Production", "Preview", and "Development" for all variables
6. Save and redeploy your project

## Important Notes:
- The GOOGLE_APPLICATION_CREDENTIALS_JSON should be the entire JSON content as a single line
- Make sure there are no extra spaces or line breaks
- The server.js already has the code to handle these environment variables in production
