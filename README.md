# 🎤 Voice Grocery List App

A modern, intelligent voice-enabled grocery list application with cloud synchronization, smart categorization, and spell correction. Features **enhanced voice recognition** that understands natural speech patterns and processes items instantly.

## 🎤 Voice Recognition Highlights

### **Natural Speech Processing**
Say your grocery items naturally and the app intelligently separates them:
- **"onion spinach milk"** → 3 separate items
- **"uhh I need basmati rice and umm green chilies"** → "basmati rice", "green chilies"
- **"get me some apples, you know, and bananas"** → "apples", "bananas"

### **Smart Features**
- ⚡ **Instant Processing** - Items appear immediately when you click to stop
- 🧹 **Filler Word Removal** - Automatically filters out "uhh", "umm", "you know", etc.
- 🎯 **Intelligent Separation** - Uses grocery database to identify compound items like "basmati rice"
- 📝 **Auto-correction** - Suggests corrections for misspelled items with user confirmation
- 🏷️ **Smart Categorization** - Automatically sorts items into appropriate categories

## ✨ Features

### Core Features
- 🎤 **Advanced Voice Recognition** - Add multiple items by speaking naturally with instant processing
- 🧠 **Smart Item Parsing** - Intelligently separates space-separated items ("onion spinach milk" → 3 items)
- 🎯 **Filler Word Filtering** - Removes "uhh", "umm", "you know" and other speech artifacts automatically
- 🏷️ **Intelligent Categorization** - AI-powered sorting into grocery categories (Produce, Dairy, Asian Pantry, etc.)
- ✨ **Smart Auto-correction** - Spell checking with user confirmation using comprehensive grocery database
- 🔍 **Duplicate Detection** - Prevents adding the same items twice
- 📱 **Responsive Design** - Optimized for desktop and mobile devices
- 🎨 **Dynamic Theming** - Dark/light mode with customizable color schemes
 - 📤 **Share & Export** - Share lists via the Web Share API on supported devices and download lists as an image or PDF using built-in utilities (`shareList`, `downloadListAsImage`, `downloadListAsPDF`). A printable list component (`PrintableList`) is available and wired to a `printableListRef` for easy export/print workflows.

### User Experience
- 🔐 **Secure Authentication** - Protected user accounts with validation
- ☁️ **Cloud Synchronization** - Access your lists from any device
- 📅 **Date-based Organization** - Separate lists for different dates
- ✅ **Progress Tracking** - Visual progress bars and completion status
- 🎯 **Category Management** - Expandable/collapsible category views
- ❓ **Built-in Help** - Comprehensive user guide and tips

### Advanced Features
- ⚡ **Instant Voice Processing** - Items appear immediately when you stop recording
- 🔄 **Real-time Updates** - Instant synchronization across devices
- 🎭 **Beautiful Animations** - Smooth transitions, pulsing voice indicators, and visual feedback
- 🛡️ **Security Headers** - Production-ready security configuration
- 📊 **Smart Analytics** - Track shopping progress and completion rates
- 🔧 **Enhanced Error Handling** - Clean console output with proper error management

## 🔐 Security Features

### Enterprise-Grade Security
- **Password Protection**: bcrypt hashing with 12 salt rounds, secure session management
- **Password Reset**: One-time use tokens with SHA-256 hashing, 1-hour expiration
- **Rate Limiting**: Brute-force protection on all auth endpoints (login, registration, password reset)
- **Anti-Phishing**: Email verification details (masked email, IP location, timestamp, one-time use notice)
- **User Privacy**: User enumeration prevention, timing attack mitigation
- **Email Security**: HTTPS-only links, professional templates with security warnings
- **Request Tracking**: IP logging, request metadata, comprehensive audit trail
- **CORS & Helmet**: Cross-origin protection and security headers

### Email System
- **Welcome Email**: Sent on registration with app features overview
- **Password Reset**: Secure reset links with anti-phishing verification details
- **Reset Confirmation**: Success notification with security tips
- **ProtonMail Support**: Configured for secure email delivery

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite for fast development and builds
- **Material-UI (MUI)** for modern, accessible components
- **Emotion CSS-in-JS** for styled components and theming
- **Web Speech API** for voice recognition
- **Day.js** for lightweight date handling
- **Context API** for state management

### Backend
- **Node.js** with Express framework
- **MongoDB Atlas** for cloud database storage
- **Mongoose ODM** for data modeling
- **bcryptjs** for secure password hashing
- **Helmet** for security headers
- **Express Rate Limit** for API protection
- **CORS** middleware for cross-origin requests

### Infrastructure
- **Netlify** for frontend hosting with CDN
- **Railway** for backend deployment
- **pnpm** workspace for efficient dependency management
- **Vite** for optimized production builds

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **pnpm** package manager ([Install](https://pnpm.io/installation))
- **MongoDB Atlas** account (free tier available)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/surajfale/voice-grocery-list_app.git
   cd voice-grocery-list_app
   ```

2. **Install all dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   **Backend (.env in backend/ directory):**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voice-grocery-list
   PORT=3001
   CORS_ORIGIN=http://localhost:5173
   NODE_ENV=development

   # Email Configuration (ProtonMail)
   EMAIL_HOST=smtp.protonmail.ch
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-email@protonmail.com
   EMAIL_PASS_KEY=key
   EMAIL_PASS_ENC=enc
   EMAIL_FROM=Grocery List App <your-email@protonmail.com>
   FRONTEND_URL=http://localhost:5173
   ```

   **Frontend (.env in root directory):**
   ```env
   VITE_API_BASE_URL=http://localhost:3001/api
   ```

4. **Start the development servers**
   ```bash
   # Terminal 1 - Backend (port 3001)
   pnpm --filter backend dev

   # Terminal 2 - Frontend (port 5173)
   pnpm dev
   ```

5. **Open your browser**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001/api/health

## 🚀 Deployment

### Production Setup
- **Frontend**: Deployed on [Netlify](https://netlify.com) with automatic builds
- **Backend**: Deployed on [Railway](https://railway.app) with MongoDB Atlas
- **Database**: MongoDB Atlas (cloud-hosted)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete deployment instructions.

### Quick Deploy Links
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/surajfale/voice-grocery-list_app)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/surajfale/voice-grocery-list_app)

### Build Commands
```bash
# Frontend build
pnpm build                    # Production build
pnpm build:prod              # Build with NODE_ENV=production
pnpm preview                 # Preview production build

# Backend build
pnpm --filter backend start  # Production server
```

## 📖 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide for Netlify + Railway
- **[CLAUDE.md](./CLAUDE.md)** - Developer guidance for Claude Code
- **[MONGODB_SETUP.md](./MONGODB_SETUP.md)** - Database setup instructions


## �🛠️ Development

### Available Scripts
```bash
# Development
pnpm dev                     # Start frontend dev server
pnpm --filter backend dev    # Start backend dev server

# Building
pnpm build                   # Build frontend for production
pnpm clean                   # Clean build directory

# Deployment
pnpm deploy:netlify          # Deploy to Netlify
```

### Project Structure
```
voice-grocery-list_app/
├── src/                     # React frontend source
│   ├── components/          # React components
│   ├── contexts/           # Context providers
│   └── services/           # API and utility services
├── backend/                # Node.js backend
│   ├── models/             # MongoDB models
│   ├── routes/             # Express routes
│   └── server.js           # Main server file
├── netlify.toml            # Netlify configuration
└── pnpm-workspace.yaml     # pnpm workspace config
```

## 🤝 Contributing

This project was developed using AI-assisted development with [Claude Code](https://claude.ai/code) for rapid prototyping and implementation.

### Development Guidelines
- Use pnpm for package management
- Follow existing code patterns and structure
- Test changes locally before deploying
- Update documentation when adding features

## 📊 Status

[![Netlify Status](https://api.netlify.com/api/v1/badges/3538ac16-d6ff-4b5b-9c8c-e76335f8cadc/deploy-status)](https://app.netlify.com/projects/voice-grocery-list/deploys)

## 📄 License

This project is open source and available under the [MIT License](LICENSE).