# 🎤 Voice Grocery List App

A modern, intelligent voice-enabled grocery list application with cloud synchronization, smart categorization, spell correction, and **AI-powered receipt analysis**. Features **enhanced voice recognition** that understands natural speech patterns, plus a full **Receipt AI** system that lets you upload receipts, extract data via OCR, and ask natural language questions about your spending history.

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

## 🤖 Receipt AI & Smart Insights

Upload your grocery receipts and let AI analyze your spending. The app features a full **Retrieval-Augmented Generation (RAG)** pipeline that turns your receipts into a searchable knowledge base.

### How It Works
1. **📸 Upload** — Snap a photo or drop a receipt image (JPG, PNG, HEIC, WebP)
2. **🔍 OCR** — Automatic text extraction captures merchant, date, total, and individual items
3. **🧠 Embed** — Receipt content is chunked and embedded into vectors using OpenAI's `text-embedding-3-small`
4. **💬 Ask** — Chat naturally: *"How much did I spend on dairy last month?"* and get accurate answers with receipt citations

### AI Features
- 💬 **Natural Language Q&A** — Ask questions about your spending in plain English
- 🏷️ **Category-Aware Search** — Understands grocery categories (asking about "dairy" finds milk, yogurt, cheese, etc.)
- 📊 **Spending Analysis** — Totals, comparisons, and breakdowns across receipts
- 🔗 **Source Citations** — Every answer references the specific receipts it drew from
- 📅 **Date & Merchant Filters** — Narrow your queries to specific time periods or stores
- ⚡ **Vector Search** — Uses MongoDB Atlas Vector Search with cosine similarity for fast, accurate retrieval

## ✨ Features

### Core Features
- 🎤 **Advanced Voice Recognition** — Add multiple items by speaking naturally with instant processing
- 🧠 **Smart Item Parsing** — Intelligently separates space-separated items ("onion spinach milk" → 3 items)
- 🎯 **Filler Word Filtering** — Removes "uhh", "umm", "you know" and other speech artifacts automatically
- 🏷️ **Intelligent Categorization** — AI-powered sorting into grocery categories (Produce, Dairy, Asian Pantry, etc.)
- ✨ **Smart Auto-correction** — Spell checking with user confirmation using comprehensive grocery database
- 🔍 **Duplicate Detection** — Prevents adding the same items twice
- 📱 **Responsive Design** — Optimized for desktop and mobile devices
- 🎨 **Dynamic Theming** — Dark/light mode with customizable color schemes
- 📤 **Share & Export** — Share lists via the Web Share API on supported devices and download lists as an image or PDF
- 🧾 **Receipt OCR** — Upload grocery receipts for automatic text extraction, item parsing, and storage
- 🤖 **AI-Powered Receipt Chat** — Ask natural language questions about your receipts and spending history

### User Experience
- 🔐 **Secure Authentication** — Protected user accounts with validation
- ☁️ **Cloud Synchronization** — Access your lists from any device
- 📅 **Date-based Organization** — Separate lists for different dates
- ✅ **Progress Tracking** — Visual progress bars and completion status
- 🎯 **Category Management** — Expandable/collapsible category views
- ❓ **Built-in Help** — Comprehensive user guide and tips

### Advanced Features
- ⚡ **Instant Voice Processing** — Items appear immediately when you stop recording
- 🔄 **Real-time Updates** — Instant synchronization across devices
- 🎭 **Beautiful Animations** — Smooth transitions, pulsing voice indicators, and visual feedback
- 🛡️ **Security Headers** — Production-ready security configuration
- 📊 **Smart Analytics** — Track shopping progress and completion rates
- 🔧 **Enhanced Error Handling** — Clean console output with proper error management

### Receipts Workspace
- Switch to the **Receipts** view from the app bar to manage your uploaded receipts alongside grocery lists.
- Drag-and-drop or select image files (JPG, PNG, HEIC, WebP) to trigger OCR, structured parsing, and storage.
- Review detected metadata + items, preview the original image, delete entries, and ask AI questions about your receipt history.

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
- **Resend Integration**: Professional email delivery via Resend API

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
- **Resend** for transactional emails
- **Helmet** for security headers
- **Express Rate Limit** for API protection
- **CORS** middleware for cross-origin requests

### AI & Receipt Intelligence
- **OpenAI API** — `text-embedding-3-small` for vector embeddings, `gpt-4o-mini` for answer generation
- **MongoDB Atlas Vector Search** — Cosine similarity search with native pre-filtering (`$vectorSearch`)
- **RAG Pipeline** — Chunking → embedding → vector store → retrieval → LLM generation
- **Receipt OCR** — Automatic text extraction and structured parsing from receipt images

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

   # Email Configuration (Resend)
   RESEND_API_KEY=your_resend_api_key_here
   EMAIL_FROM=Grocery List App <onboarding@resend.dev>
   FRONTEND_URL=http://localhost:5173

   # Receipt AI / RAG (optional — feature is disabled without OPENAI_API_KEY)
   OPENAI_API_KEY=your_openai_api_key_here
   RAG_EMBEDDINGS_MODEL=text-embedding-3-small
   RAG_COMPLETIONS_MODEL=gpt-4o-mini
   RAG_NUM_CANDIDATES=150
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

### Receipt OCR Requirements
- Receipt uploads run [`tesseract.js`](https://github.com/naptha/tesseract.js) inside the Node backend. The first upload downloads the English language data (~30–50 MB), so allow outbound internet access and a little extra startup time.
- Original images are stored in MongoDB GridFS (`receiptFiles` bucket). Keep an eye on Atlas storage usage if you plan to archive lots of high-resolution photos.

## 🚀 Deployment

### Production Setup
- **Frontend**: Deployed on [Netlify](https://netlify.com) with automatic builds
- **Backend**: Deployed on [Railway](https://railway.app) with MongoDB Atlas
- **Database**: MongoDB Atlas (cloud-hosted)

See **[Deployment Guide](./docs/DEPLOYMENT.md)** for complete deployment instructions.

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

### User Documentation
- **[Usage Guide](./docs/Usage.md)** - Complete guide for using the app, from basics to advanced features
- **[PWA Setup](./docs/PWA_SETUP.md)** - Install the app on your device for native-like experience

### Developer Documentation
- **[Architecture](./docs/Architecture.md)** — Comprehensive technical architecture and design decisions
- **[Deployment Guide](./docs/DEPLOYMENT.md)** — Step-by-step deployment instructions for Netlify + Railway
- **[MongoDB Setup](./docs/MONGODB_SETUP.md)** — Database configuration and setup guide
- **[Atlas Vector Index](./docs/atlas_vector_index.md)** — Vector Search index setup for the Receipt AI feature
- **[RAG Implementation](./docs/RAG_IMPLEMENTATION_TASKS.md)** — Detailed breakdown of the RAG pipeline tasks
- **[Claude.md](./CLAUDE.md)** — AI assistant guidance for development


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
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API and utility services
│   └── utils/              # Helper utilities
├── backend/                # Node.js backend
│   ├── models/             # MongoDB models
│   ├── routes/             # Express routes
│   ├── middleware/         # Express middleware
│   └── server.js           # Main server file
├── docs/                   # Documentation
│   ├── Architecture.md     # Technical architecture
│   ├── Usage.md            # User guide
│   ├── DEPLOYMENT.md       # Deployment guide
│   ├── PWA_SETUP.md        # PWA installation
│   └── MONGODB_SETUP.md    # Database setup
├── public/                 # Static assets & PWA icons
├── netlify.toml            # Netlify configuration
├── CLAUDE.md               # AI development guidance
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