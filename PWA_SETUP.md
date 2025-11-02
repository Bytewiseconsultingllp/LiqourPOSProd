# PWA Setup Guide - Liquor POS

Your Liquor POS application is now installable as a Progressive Web App (PWA)!

## ✅ What's Been Added

### 1. **Manifest File** (`public/manifest.json`)
- App name, description, and icons
- Display mode: standalone (looks like a native app)
- Theme colors and orientation
- Shortcuts for quick access to Sales, Inventory, and Reports

### 2. **Service Worker** (`public/sw.js`)
- Offline functionality
- Cache management
- Background sync capability
- Push notification support

### 3. **PWA Installer Component** (`components/PWAInstaller.tsx`)
- Auto-detects if app can be installed
- Shows install prompt to users
- Dismissible for 7 days
- Registers service worker automatically

### 4. **Offline Page** (`public/offline.html`)
- Fallback page when user is offline
- Beautiful UI with retry option

## 📱 How to Install

### On Desktop (Chrome, Edge, Brave)
1. Visit your app in the browser
2. Look for the install icon (⊕) in the address bar
3. Click "Install" or wait for the install prompt
4. App will be added to your desktop/start menu

### On Android
1. Open the app in Chrome
2. Tap the menu (⋮) → "Install app" or "Add to Home screen"
3. App will appear on your home screen

### On iOS (Safari)
1. Open the app in Safari
2. Tap the Share button (□↑)
3. Scroll and tap "Add to Home Screen"
4. Tap "Add"

## 🎨 Creating App Icons

You need to create two icon files:
- `public/icon-192x192.png` (192x192 pixels)
- `public/icon-512x512.png` (512x512 pixels)

### Quick Method:
1. Open `public/generate-icons.html` in your browser
2. Right-click each canvas and "Save image as..."
3. Save as `icon-192x192.png` and `icon-512x512.png` in the `public` folder

### Professional Method:
Use a design tool like:
- Figma
- Canva
- Adobe Illustrator
- Or online PWA icon generators

**Icon Requirements:**
- Square format
- Clear, simple design
- Recognizable at small sizes
- PNG format with transparency
- Represents your brand

## 🚀 Features

### ✅ Offline Support
- App works without internet connection
- Cached pages load instantly
- Offline page shown when needed

### ✅ Install Prompts
- Smart install banner
- Dismissible for 7 days
- Auto-detects installation status

### ✅ App Shortcuts
Users can right-click the installed app icon to access:
- New Sale
- Inventory
- Reports

### ✅ Native-Like Experience
- Runs in standalone window
- No browser UI
- Fast loading
- Smooth animations

## 🔧 Testing

### Test Installation
1. Run `npm run dev`
2. Open http://localhost:3000
3. Open DevTools (F12)
4. Go to "Application" tab
5. Check "Manifest" section
6. Check "Service Workers" section

### Test Offline Mode
1. Install the app
2. Open DevTools → Network tab
3. Select "Offline" from throttling dropdown
4. Refresh the page
5. App should still work

### Test on Mobile
1. Deploy to production (Vercel, Netlify, etc.)
2. Visit on mobile device
3. Install the app
4. Test offline functionality

## 📊 PWA Checklist

- ✅ Manifest file configured
- ✅ Service worker registered
- ✅ HTTPS enabled (required for PWA)
- ✅ Icons created (192x192 and 512x512)
- ✅ Offline page created
- ✅ Install prompt implemented
- ✅ Viewport meta tag configured
- ✅ Theme color set

## 🔒 Security Requirements

PWAs require HTTPS. Make sure your production deployment uses HTTPS:
- ✅ Vercel (automatic HTTPS)
- ✅ Netlify (automatic HTTPS)
- ✅ Custom domain with SSL certificate

## 📱 Browser Support

| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome  | ✅      | ✅     |
| Edge    | ✅      | ✅     |
| Safari  | ⚠️      | ✅     |
| Firefox | ✅      | ⚠️     |

⚠️ = Limited support (may not show install prompt)

## 🎯 Next Steps

1. **Create proper icons** - Replace placeholder icons with professional designs
2. **Test thoroughly** - Test installation on different devices
3. **Deploy to production** - PWA features require HTTPS
4. **Monitor usage** - Track installation and usage metrics
5. **Add push notifications** - Engage users with notifications (optional)

## 🐛 Troubleshooting

### Install button doesn't appear
- Check if HTTPS is enabled
- Check browser console for errors
- Verify manifest.json is accessible
- Check if app is already installed

### Service worker not registering
- Check browser console for errors
- Verify sw.js is in public folder
- Clear browser cache and try again

### Offline mode not working
- Check if service worker is active
- Verify cache is populated
- Check network tab in DevTools

## 📚 Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

**Your app is now installable! 🎉**

Users can install it on their devices and use it like a native application.
