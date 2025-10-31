# Progressive Web App (PWA) Setup

Your Grocery List app is now a fully functional Progressive Web App! 🎉

## What's New

Your app now works like a native Android app with these features:

### ✨ Key PWA Features

1. **Install to Home Screen**: Add the app to your Android home screen for quick access
2. **Standalone Display**: Opens in full-screen mode without browser UI
3. **Offline Support**: Service worker caches assets for offline functionality
4. **App-like Experience**: Hides the address bar and browser controls
5. **Custom App Icon**: Branded shopping cart icon in indigo gradient
6. **Fast Loading**: Cached resources load instantly

### 📱 How to Install on Android

1. **Open Chrome Browser** on your Android device
2. Navigate to your app URL (e.g., `https://your-app.netlify.app`)
3. Chrome will show an **"Install app"** banner at the bottom
4. Tap **"Install"** or use the Chrome menu (⋮) → **"Add to Home Screen"**
5. Confirm the installation
6. The app icon will appear on your home screen

### 🍎 iOS Support

iOS also supports PWA features:
- Open in Safari
- Tap the Share button
- Select "Add to Home Screen"
- The app will work in standalone mode

## Technical Details

### PWA Configuration

The PWA is configured in [`vite.config.js`](vite.config.js):

- **Manifest**: Defines app name, colors, icons, and display mode
- **Service Worker**: Auto-generated with Workbox for offline caching
- **Icons**: 192x192 and 512x512 PNG icons with maskable support
- **Caching Strategy**:
  - Static assets: Precached during installation
  - Google Fonts: Cached for 1 year
  - API calls: Network-first with 5-minute cache fallback

### Generated Files

After running `pnpm build`, these PWA files are created:

- `dist/manifest.webmanifest` - App manifest with metadata
- `dist/sw.js` - Service worker for offline functionality
- `dist/registerSW.js` - Service worker registration script
- `public/pwa-192x192.png` - Small app icon
- `public/pwa-512x512.png` - Large app icon

### PWA Meta Tags

Added to [`index.html`](index.html):

```html
<!-- PWA Meta Tags -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="application-name" content="Grocery List" />

<!-- iOS Meta Tags -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Grocery List" />
```

## Testing PWA Features

### Local Testing

1. Build the app: `pnpm build`
2. Serve locally: `pnpm serve`
3. Open Chrome DevTools → Application tab
4. Check:
   - **Manifest**: Verify all fields are correct
   - **Service Workers**: Should show as activated
   - **Storage**: Check cached assets

### Production Testing

After deploying to Netlify:

1. Open your app in Chrome on Android
2. Check for install prompt
3. Install the app
4. Test offline by turning off WiFi/data
5. App should still load cached content

## Customizing Your PWA

### Change App Colors

Edit theme colors in [`vite.config.js`](vite.config.js):

```javascript
theme_color: '#6366F1',        // Status bar color
background_color: '#ffffff',   // Splash screen background
```

### Update App Name

Change the app name in the manifest section:

```javascript
name: 'Your App Name',
short_name: 'Short Name',
```

### Custom Icons

Replace the generated icons with your own:

1. Create 192x192 and 512x512 PNG images
2. Save as `public/pwa-192x192.png` and `public/pwa-512x512.png`
3. Rebuild: `pnpm build`

The current icons use the shopping cart emoji (🛒) on an indigo gradient background.

### Advanced Caching

Modify caching strategies in [`vite.config.js`](vite.config.js) under `workbox.runtimeCaching`:

- **CacheFirst**: For static assets that rarely change
- **NetworkFirst**: For API calls with fallback to cache
- **StaleWhileRevalidate**: For assets that update occasionally

## Deployment

### Netlify Deployment

The PWA works automatically on Netlify:

```bash
pnpm build
netlify deploy --prod --dir=dist
```

Netlify will serve:
- `manifest.webmanifest` with correct MIME type
- Service worker at root level
- All cached assets with proper headers

### Environment Variables

Ensure your `.env` has the correct API URL:

```env
VITE_API_BASE_URL=https://your-backend.railway.app/api
```

## Troubleshooting

### Install Prompt Not Showing

1. **Check HTTPS**: PWA requires HTTPS (localhost is OK for testing)
2. **Valid Manifest**: Ensure manifest.webmanifest is accessible
3. **Service Worker**: Must register successfully
4. **Icons**: Both 192x192 and 512x512 icons must exist
5. **Chrome Requirements**: User must visit site at least twice with 5-minute gap

### Service Worker Not Updating

1. **Hard Refresh**: Ctrl+Shift+R (Cmd+Shift+R on Mac)
2. **Clear Cache**: DevTools → Application → Clear Storage
3. **Skip Waiting**: Check "Update on reload" in DevTools
4. **Version Change**: Service worker updates automatically when files change

### Offline Mode Not Working

1. **Check Caching**: DevTools → Application → Cache Storage
2. **Network Tab**: Filter by "Service Worker"
3. **Console Errors**: Look for SW registration errors
4. **Cache Strategy**: Verify routes are configured correctly

## PWA Best Practices

✅ **Do:**
- Keep service worker simple and focused
- Cache only necessary assets
- Test on real devices
- Update icons regularly
- Monitor cache size

❌ **Don't:**
- Cache sensitive user data
- Create overly aggressive caching
- Forget to version your service worker
- Ignore offline UX considerations

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Workbox Guide](https://developers.google.com/web/tools/workbox)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## Next Steps

1. ✅ **Deploy to Production**: `pnpm build && netlify deploy --prod`
2. 📱 **Test on Real Device**: Install on your Android phone
3. 🎨 **Customize Icons**: Replace default icons with branded versions
4. 📊 **Monitor Usage**: Check Analytics for PWA installs
5. 🚀 **Add Features**: Consider push notifications, background sync

---

**Note**: The PWA features are production-ready. After deploying, you can immediately add the app to your home screen on Android and iOS devices for a native app-like experience!
