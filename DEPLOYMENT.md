# 🚀 Netlify Deployment Guide for GroceryAI

## Prerequisites

1. **GitHub Repository**: Ensure your code is pushed to a GitHub repository
2. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
3. **Backend Deployed**: Your backend should be deployed first (Heroku, Railway, Render, etc.)

## 📋 Deployment Steps

### 1. Connect Repository to Netlify

1. Log into your Netlify dashboard
2. Click "New site from Git"
3. Choose "GitHub" as your Git provider
4. Select your `voice-grocery-list_app` repository
5. Configure build settings:

   ```
   Build command: npm run build
   Publish directory: dist
   ```

### 2. Environment Variables

In Netlify dashboard, go to **Site settings** → **Environment variables** and add:

```bash
# Required: Your backend API URL
VITE_API_BASE_URL=https://your-backend-api.herokuapp.com

# Optional: Production mode
NODE_ENV=production

# Optional: Enable source maps for debugging
GENERATE_SOURCEMAP=true
```

**⚠️ Important**: Replace `https://your-backend-api.herokuapp.com` with your actual deployed backend URL.

### 3. Build Configuration

The `netlify.toml` file is already configured with:
- ✅ Build settings
- ✅ SPA redirect rules
- ✅ Security headers
- ✅ Cache optimization
- ✅ Node.js version

### 4. Deploy

1. Click "Deploy site" in Netlify
2. Wait for the build to complete (usually 2-3 minutes)
3. Your site will be available at a generated URL like `https://amazing-site-name.netlify.app`

## 🔧 Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# Install Netlify CLI (one-time setup)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Build the project
npm run build

# Deploy to production
netlify deploy --prod --dir=dist
```

## 🛠️ Available Scripts

```bash
# Development
npm run dev                 # Start development server

# Production builds
npm run build              # Standard build
npm run build:prod         # Production optimized build
npm run build:analyze      # Build with bundle analysis

# Preview & serve
npm run preview            # Preview production build locally
npm run serve              # Serve build on network

# Deployment
npm run deploy:netlify     # Build and deploy to Netlify (requires CLI)

# Cleanup
npm run clean              # Remove build directory
```

## 🌐 Domain Configuration

### Custom Domain (Optional)

1. In Netlify dashboard → **Domain settings**
2. Click "Add custom domain"
3. Follow the DNS configuration instructions
4. Enable HTTPS (automatic with Let's Encrypt)

### Subdomain
Your site URL will be: `https://your-site-name.netlify.app`

## 🔒 Security Features

The deployment includes:
- ✅ HTTPS enforcement
- ✅ Security headers (XSS, CSRF protection)
- ✅ Content Security Policy
- ✅ Asset caching optimization

## 📱 Performance Optimizations

- ✅ Code splitting (React, MUI, utilities in separate chunks)
- ✅ Asset compression and minification
- ✅ Tree shaking (removes unused code)
- ✅ Source maps for debugging
- ✅ Long-term caching with hashed filenames

## 🐛 Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify `VITE_API_BASE_URL` points to your deployed backend
- Review build logs in Netlify dashboard

### 404 Errors on Refresh
- SPA redirects are configured in `netlify.toml`
- All routes should redirect to `index.html`

### API Connection Issues
- Verify backend is deployed and accessible
- Check CORS settings on your backend
- Ensure `VITE_API_BASE_URL` environment variable is set

### Performance Issues
- Run `npm run build:analyze` to check bundle size
- Consider lazy loading for large components
- Optimize images and assets

## 📊 Monitoring

After deployment, monitor your site:
- **Netlify Analytics**: Built-in traffic analytics
- **Performance**: Use Lighthouse or WebPageTest
- **Uptime**: Consider using UptimeRobot or similar
- **Error Tracking**: Consider Sentry for production error monitoring

## 🔄 Continuous Deployment

Netlify automatically redeploys when you push to your main branch:
1. Push code to GitHub
2. Netlify detects changes
3. Automatic build and deployment
4. Site updates in ~2-3 minutes

## 📞 Support

- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Community**: [community.netlify.com](https://community.netlify.com)
- **GitHub Issues**: For app-specific issues

---

🎉 **Your GroceryAI app is now ready for the world!**