# Deployment Guide

This guide provides step-by-step instructions for deploying the Voice Grocery List App using Netlify for the frontend and Railway for the backend with MongoDB Atlas.

## Architecture Overview

- **Frontend**: React app deployed on Netlify
- **Backend**: Node.js/Express API deployed on Railway
- **OCR Service**: Python/FastAPI + EasyOCR deployed on Railway (same project, separate service)
- **Database**: MongoDB Atlas (cloud database)

## Prerequisites

- GitHub account
- Netlify account (free tier available)
- Railway account (free tier available)
- MongoDB Atlas account (free tier available)

## Step 1: MongoDB Atlas Setup

### 1.1 Create MongoDB Atlas Account
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Sign up for a free account
3. Create a new project (e.g., "Voice Grocery List")

### 1.2 Create Database Cluster
1. Click "Build a Database"
2. Choose "M0 Sandbox" (free tier)
3. Select your preferred cloud provider and region
4. Name your cluster (e.g., "voice-grocery-cluster")
5. Click "Create Cluster"

### 1.3 Configure Database Access
1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create username and secure password
5. Set "Database User Privileges" to "Read and write to any database"
6. Click "Add User"

### 1.4 Configure Network Access
1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0) for deployment
4. Click "Confirm"

### 1.5 Get Connection String
1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string (replace `<password>` with your actual password)
5. Save this for later: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority`

## Step 2: Railway Backend Deployment (Node.js API)

### 2.1 Create Railway Account
1. Go to [Railway](https://railway.app)
2. Sign up with GitHub
3. Authorize Railway to access your repositories

### 2.2 Deploy Backend
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your voice-grocery-list_app repository
4. Railway will auto-detect the Node.js backend

### 2.3 Configure Build Settings
1. In your Railway project dashboard, click on your service
2. Go to "Settings" tab
3. Set the following:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### 2.4 Set Environment Variables
1. In Railway dashboard, go to "Variables" tab
2. Add the following environment variables:

```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/voice-grocery-list?retryWrites=true&w=majority
PORT=3001
CORS_ORIGIN=https://your-netlify-app-name.netlify.app
NODE_ENV=production
```

**Note**: Replace the values with your actual MongoDB connection string and Netlify URL (you'll get the Netlify URL in the next step).

### 2.5 Get Railway Backend URL
1. After deployment, Railway will provide a URL like: `https://your-app-name.up.railway.app`
2. Save this URL for frontend configuration

## Step 2b: Railway OCR Microservice (EasyOCR)

The OCR microservice runs as a **separate Railway service** in the same project. It uses Python/FastAPI with EasyOCR for deep-learning text extraction from receipt and product-label photos.

### 2b.1 Add a New Service
1. Open your existing Railway project (the one containing the Node.js backend)
2. Click **"+ New"** → **"GitHub Repo"**
3. Select the **same** `voice-grocery-list_app` repository

### 2b.2 Configure Build Settings
1. Click on the newly created service
2. Go to **"Settings"** tab
3. Set the following:
   - **Service Name**: `ocr-service` (or any descriptive name)
   - **Root Directory**: `ocr-service`
   - **Builder**: `Dockerfile` (Railway will auto-detect the Dockerfile)

> **Note**: The `ocr-service/railway.json` file is included in the repo and configures Dockerfile-based builds, the health check endpoint (`/health`), and restart policies automatically.

### 2b.3 Set Environment Variables
1. In the OCR service dashboard, go to **"Variables"** tab
2. No mandatory environment variables are required — the defaults work. Optionally set:

```
PORT=8000
```

> Railway automatically injects `PORT` and the service respects it via `${PORT:-8000}`.

### 2b.4 Generate a Public Domain
1. In the OCR service's **"Settings"** → **"Networking"**
2. Click **"Generate Domain"** to create a public Railway URL like:
   `https://ocr-service-production-xxxx.up.railway.app`
3. Save this URL — the Node.js backend needs it

### 2b.5 Connect the Node.js Backend to the OCR Service
1. Go back to your **Node.js backend service** on Railway
2. Open the **"Variables"** tab
3. Add a new environment variable:

```
OCR_SERVICE_URL=https://ocr-service-production-xxxx.up.railway.app
```

Replace with the actual URL from step 2b.4.

> **Private networking alternative**: If both services are in the same Railway project, you can use Railway's internal networking for lower latency and zero egress costs. In the OCR service's Settings → Networking, note the **private domain** (e.g., `ocr-service.railway.internal`). Then set:
> ```
> OCR_SERVICE_URL=http://ocr-service.railway.internal:8000
> ```
> Private networking is only available on Railway's paid plans.

### 2b.6 Verify OCR Service Deployment
1. Visit the OCR service health endpoint:
   ```
   https://ocr-service-production-xxxx.up.railway.app/health
   ```
   Should return: `{"status":"ok"}`

2. Test OCR with curl:
   ```bash
   curl -X POST -F "file=@receipt.jpg" \
     https://ocr-service-production-xxxx.up.railway.app/ocr
   ```
   Should return: `{"raw_text": "...", "lines": [...], "items": [...]}`

3. Upload a receipt through the app's Receipts page and verify the OCR text appears correctly

### 2b.7 Important Notes

- **First deploy takes ~3–5 minutes** because the Docker build downloads the EasyOCR model (~100 MB). Subsequent deploys are faster since Docker layers are cached.
- **Memory usage**: EasyOCR loads a deep-learning model into memory. The service needs at least **512 MB RAM**. Railway's free tier provides 512 MB; if you experience OOM crashes, upgrade to the Hobby plan ($5/month) for 8 GB.
- **Cold starts**: If the OCR service sleeps (free tier), the first request after wakeup takes a few seconds for model loading. This is normal. Consider using Railway's "Always On" setting on paid plans.

## Step 3: Netlify Frontend Deployment

### 3.1 Create Netlify Account
1. Go to [Netlify](https://www.netlify.com)
2. Sign up with GitHub
3. Authorize Netlify to access your repositories

### 3.2 Deploy Frontend
1. Click "New site from Git"
2. Choose GitHub
3. Select your voice-grocery-list_app repository
4. Configure build settings:
   - **Build command**: `pnpm install && pnpm build`
   - **Publish directory**: `dist`
   - **Base directory**: (leave empty - uses root)
   - **Node version**: `18` (or latest LTS)

### 3.3 Set Environment Variables
1. In Netlify dashboard, go to "Site settings"
2. Click "Environment variables"
3. Add the following:

```
VITE_API_BASE_URL=https://your-railway-app.up.railway.app/api
```

**Note**: Replace with your actual Railway backend URL from Step 2.5.

### 3.4 Configuration via netlify.toml (Recommended)
This repository includes a `netlify.toml` file with optimized pnpm configuration:

**Key configurations in netlify.toml:**
- **Build command**: `pnpm install --no-frozen-lockfile && pnpm build`
- **Node version**: `18.18.0`
- **SPA redirects**: All routes redirect to `index.html`
- **Security headers**: X-Frame-Options, XSS Protection, etc.
- **Caching**: Optimized caching for static assets and fonts
- **Environment contexts**: Different settings for production, deploy-preview, and branch deploys

**Manual configuration alternative (if not using netlify.toml):**
1. In "Build & deploy" settings
2. Set Node version if needed:
   - Add environment variable: `NODE_VERSION=18`
   - Add environment variable: `NPM_FLAGS=--version` (helps with pnpm detection)

### 3.5 Get Netlify Frontend URL
1. After deployment, Netlify will provide a URL like: `https://your-app-name.netlify.app`
2. Update your Railway CORS_ORIGIN environment variable with this URL

## Step 4: Update CORS Configuration

### 4.1 Update Railway Backend
1. Go back to Railway dashboard
2. Update the `CORS_ORIGIN` environment variable with your Netlify URL:
```
CORS_ORIGIN=https://your-actual-netlify-app.netlify.app
```

### 4.2 Redeploy Backend
1. Railway will automatically redeploy when environment variables change
2. Wait for deployment to complete

## Step 5: Test Deployment

### 5.1 Test Backend API
1. Visit your Railway backend URL: `https://your-railway-app.up.railway.app/api/health`
2. Should return: `{"status":"ok","timestamp":"..."}`

### 5.2 Test Frontend
1. Visit your Netlify frontend URL
2. Try to register a new account
3. Test voice recognition functionality
4. Verify data persistence

## Step 6: Custom Domain (Optional)

### 6.1 Netlify Custom Domain
1. In Netlify dashboard, go to "Domain settings"
2. Click "Add custom domain"
3. Follow instructions to configure DNS

### 6.2 Railway Custom Domain
1. In Railway dashboard, go to "Settings"
2. Click "Domains"
3. Add custom domain and configure DNS

## Environment Variables Reference

### Backend (Railway)
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/voice-grocery-list?retryWrites=true&w=majority
PORT=3001
CORS_ORIGIN=https://your-netlify-app.netlify.app
NODE_ENV=production
OCR_SERVICE_URL=https://ocr-service-production-xxxx.up.railway.app
OPENAI_API_KEY=sk-your-prod-key
RAG_EMBEDDINGS_MODEL=text-embedding-3-small
RAG_COMPLETIONS_MODEL=gpt-4o-mini
RAG_TOP_K=5
RAG_CHUNK_SIZE=512
RAG_VECTOR_INDEX=receiptVectorIndex
EMBEDDINGS_VERSION=1
```

**Verification tips**
- After saving the variables in Railway, open the service shell and run `env | grep RAG_` to confirm they are injected.
- Hit `https://<railway-app>/api/health` and confirm no errors appear in logs related to missing OpenAI credentials.
- Trigger `pnpm --filter backend ingest:receipts` once in production to ensure the ingestion job can see the credentials.

### Frontend (Netlify)
```
VITE_API_BASE_URL=https://your-railway-app.up.railway.app/api
NODE_VERSION=18
NPM_FLAGS=--version
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors
- Ensure `CORS_ORIGIN` in Railway matches your Netlify URL exactly
- Check for trailing slashes and protocol (https://)

#### 2. MongoDB Connection Issues
- Verify MongoDB Atlas IP whitelist includes 0.0.0.0/0
- Check username/password in connection string
- Ensure database user has proper permissions

#### 3. Build Failures on Netlify
- **pnpm not found**: Netlify supports pnpm natively, but ensure you're using the correct build command
- **Use netlify.toml**: Create a `netlify.toml` file for better pnpm configuration
- **Alternative approach**: If pnpm fails, temporarily use `npm ci && npm run build` as fallback build command
- **Clear cache**: In Netlify dashboard, go to "Deploys" → "Deploy settings" → "Clear cache and deploy"
- **Check pnpm version**: Add `NPM_FLAGS=--version` environment variable
- **Verify all dependencies are in package.json**
- **Check Node version compatibility** (Node 16+ recommended for pnpm)

#### 4. Voice Recognition Not Working
- Voice recognition requires HTTPS in production
- Netlify provides HTTPS by default
- Test with supported browsers (Chrome, Edge)

#### 5. API Connection Issues
- Verify `VITE_API_BASE_URL` is correctly set
- Check Railway backend is running and accessible
- Test API endpoints directly

### Monitoring and Logs

#### Railway Logs
1. Go to Railway dashboard
2. Click on your service
3. View "Deployments" tab for build logs
4. View "Metrics" tab for runtime monitoring

#### Netlify Logs
1. Go to Netlify dashboard
2. Click on your site
3. View "Deploys" tab for build logs
4. Check "Functions" tab if using Netlify Functions

### Performance Optimization

#### Frontend (Netlify)
- Enable asset optimization in Netlify settings
- Configure caching headers
- Use Netlify's CDN for static assets

#### Backend (Railway)
- Monitor memory and CPU usage
- Consider upgrading Railway plan for production
- Implement database connection pooling

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **CORS Configuration**: Keep CORS_ORIGIN specific to your domain
3. **MongoDB Access**: Use specific IP ranges in production if possible
4. **HTTPS**: Both Netlify and Railway provide HTTPS by default
5. **Rate Limiting**: Backend includes rate limiting middleware

## Backup and Maintenance

1. **Database Backups**: MongoDB Atlas provides automated backups
2. **Code Backups**: Keep repository updated and use tags for releases
3. **Monitor Usage**: Check Railway and Netlify usage limits
4. **Dependencies**: Regularly update pnpm packages for security

## Cost Considerations

- **MongoDB Atlas**: M0 tier is free (512MB storage)
- **Railway**: $5/month after free tier usage
- **Netlify**: 100GB bandwidth/month free
- **Custom Domains**: Additional cost for premium domains

For production use, monitor usage and upgrade plans as needed.