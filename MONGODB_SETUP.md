# MongoDB Atlas Setup Guide

This guide will help you set up MongoDB Atlas and configure the backend for your Voice Grocery List app.

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account if you don't have one
3. Create a new project called "VoiceGroceryApp"

## Step 2: Create a Cluster

1. Click "Build a Database"
2. Choose "M0 Sandbox" (Free tier)
3. Select a cloud provider and region closest to you
4. Name your cluster (e.g., "grocery-cluster")
5. Click "Create Cluster"

## Step 3: Create Database User

1. In the left sidebar, click "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Create a username and strong password (save these!)
5. Grant "Read and write to any database" privilege
6. Click "Add User"

## Step 4: Configure Network Access

1. In the left sidebar, click "Network Access"
2. Click "Add IP Address"
3. Choose "Allow Access from Anywhere" (0.0.0.0/0) for development
4. Click "Confirm"

## Step 5: Get Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string (it looks like: `mongodb+srv://username:<password>@cluster...`)
5. Replace `<password>` with your actual database password

## Step 6: Configure Backend Environment

1. Navigate to the `backend` folder in your project
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and add your MongoDB connection string:
   ```
   MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net/voice_grocery_app?retryWrites=true&w=majority
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   ```

## Step 7: Install All Dependencies

```bash
pnpm install
```

## Step 8: Start the Backend Server

```bash
# Development mode (with auto-restart)
pnpm --filter backend dev

# Or production mode
pnpm --filter backend start
```

## Step 9: Configure Frontend Environment

1. In the root project folder, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. The default API URL should work for local development:
   ```
   VITE_API_BASE_URL=http://localhost:3001/api
   VITE_APP_NAME=VoiceGroceryApp
   ```

## Step 10: Test the Setup

1. Start the backend server: `pnpm --filter backend dev`
2. Start the frontend: `pnpm dev`
3. Navigate to your app in the browser
4. Try registering a new account
5. Try logging in and creating grocery lists

## Troubleshooting

- **MongoDB connection error**: Check your connection string and ensure your IP is whitelisted
- **CORS errors**: Ensure the `CORS_ORIGIN` in backend `.env` matches your frontend URL
- **Port conflicts**: Change the PORT in backend `.env` if 3001 is in use

## Production Deployment

For production deployment:
1. Restrict MongoDB network access to your server's IP
2. Use strong database credentials
3. Set `NODE_ENV=production` in backend
4. Update `CORS_ORIGIN` to your production frontend URL
5. Use environment variables for all sensitive data