# 📋 Pre-Deployment Checklist

## ✅ Before Deploying to Netlify

### 1. Backend Preparation
- [ ] Backend is deployed and accessible
- [ ] Backend CORS is configured to allow your frontend domain
- [ ] Database is set up and accessible
- [ ] Environment variables are set on backend hosting platform

### 2. Frontend Configuration
- [ ] Update `VITE_API_BASE_URL` in Netlify environment variables
- [ ] Test build locally: `npm run build`
- [ ] Test production build locally: `npm run preview`
- [ ] All console errors are resolved
- [ ] All features work without development server

### 3. Repository Setup
- [ ] Code is pushed to GitHub
- [ ] `.env` files are in `.gitignore` (✅ Already configured)
- [ ] No sensitive data in repository
- [ ] `dist/` folder is in `.gitignore` (✅ Already configured)

### 4. Build Testing
```bash
# Clean previous builds
npm run clean

# Test production build
npm run build

# Preview locally
npm run preview
```

### 5. Netlify Configuration
- [ ] `netlify.toml` is present (✅ Already created)
- [ ] Build command: `npm run build`
- [ ] Publish directory: `dist`
- [ ] Node.js version: 18

### 6. Environment Variables in Netlify
Set these in Netlify dashboard → Site settings → Environment variables:

```bash
VITE_API_BASE_URL=https://your-deployed-backend.com
NODE_ENV=production
```

### 7. Final Testing After Deployment
- [ ] App loads without errors
- [ ] All pages/routes work (SPA routing)
- [ ] API calls work with deployed backend
- [ ] Authentication flow works
- [ ] Voice recognition works (HTTPS required)
- [ ] Theme switching works
- [ ] Responsive design on mobile/tablet
- [ ] Performance is acceptable (< 3s load time)

### 8. Post-Deployment Monitoring
- [ ] Set up uptime monitoring
- [ ] Check Netlify analytics
- [ ] Monitor for JavaScript errors
- [ ] Test from different devices/browsers

## 🚨 Common Issues & Solutions

### Build Fails
- Check Node.js version in Netlify (should be 18)
- Verify all dependencies are in `package.json`
- Check for TypeScript errors (if applicable)

### 404 on Page Refresh
- Ensure `netlify.toml` has SPA redirects (✅ Already configured)

### API Calls Fail
- Verify `VITE_API_BASE_URL` environment variable
- Check backend CORS settings
- Ensure backend is deployed and accessible

### Environment Variables Not Working
- Use `VITE_` prefix for frontend environment variables
- Set variables in Netlify dashboard, not in code
- Redeploy after adding environment variables

## 📱 Performance Optimization Checklist
- [ ] Images are optimized
- [ ] Code splitting is working (check Network tab)
- [ ] Unused dependencies removed
- [ ] Bundle size is reasonable (< 1MB total)
- [ ] Lighthouse score > 90

## 🔐 Security Checklist
- [ ] No API keys in frontend code
- [ ] HTTPS is enabled (automatic with Netlify)
- [ ] Security headers are set (✅ Already configured)
- [ ] Content Security Policy is working

---

📝 **Note**: Complete all checkboxes before deploying to production!