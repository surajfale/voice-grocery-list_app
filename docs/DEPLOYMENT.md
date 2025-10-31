# Deployment Guide

This guide provides step-by-step instructions for deploying the Voice Grocery List App using Netlify for the frontend and Railway for the backend with MongoDB Atlas.

## Architecture Overview

- **Frontend**: React app deployed on Netlify
- **Backend**: Node.js/Express API deployed on Railway
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

## Step 2: Railway Backend Deployment

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
```

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