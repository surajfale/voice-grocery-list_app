# Architecture Documentation

This document provides a comprehensive overview of the Voice Grocery List App architecture, design decisions, and system components.

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Architecture Diagram](#architecture-diagram)
- [Frontend Architecture](#frontend-architecture)
- [Backend Architecture](#backend-architecture)
- [Database Schema](#database-schema)
- [Security Architecture](#security-architecture)
- [PWA Implementation](#pwa-implementation)
- [Deployment Architecture](#deployment-architecture)

## System Overview

The Voice Grocery List App is a full-stack Progressive Web Application (PWA) that combines modern web technologies to provide an intelligent, voice-enabled grocery list management system with cloud synchronization.

### Key Architectural Principles

1. **Separation of Concerns** - Frontend, backend, and database are cleanly separated
2. **Service-Oriented** - Business logic organized into reusable services
3. **Progressive Enhancement** - Core features work without voice; voice adds convenience
4. **Offline-First** - PWA capabilities enable offline functionality
5. **Security by Design** - Authentication, encryption, and rate limiting at all levels

## Tech Stack

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework with hooks and Context API |
| Vite | 4.5.14 | Build tool and dev server |
| Material-UI (MUI) | 5.18.0 | Component library and design system |
| Emotion | 11.14.0 | CSS-in-JS styling solution |
| Day.js | 1.11.18 | Lightweight date manipulation |
| Web Speech API | Native | Voice recognition (browser API) |
| Vite PWA Plugin | 1.1.0 | Progressive Web App capabilities |
| Workbox | 7.3.0 | Service worker and caching |
| html2canvas | 1.4.1 | List export as images |
| jsPDF | 3.0.3 | List export as PDF |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| Express | 4.21.1 | Web framework |
| MongoDB Atlas | Cloud | NoSQL database |
| Mongoose | 8.7.1 | MongoDB ODM |
| bcryptjs | 2.4.3 | Password hashing |
| Resend | 4.0.1 | Transactional email service |
| Helmet | 8.0.0 | Security headers middleware |
| Express Rate Limit | 7.4.1 | Rate limiting/throttling |
| CORS | 2.8.5 | Cross-origin request handling |

### Development & Deployment

- **Package Manager**: pnpm (workspace support)
- **Frontend Host**: Netlify (CDN + edge functions)
- **Backend Host**: Railway (container platform)
- **Database Host**: MongoDB Atlas (cloud database)
- **Version Control**: Git + GitHub

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Browser    │  │   Android    │  │     iOS      │          │
│  │   (Chrome,   │  │   (Chrome,   │  │   (Safari)   │          │
│  │   Firefox)   │  │   Samsung)   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                    ┌───────▼────────┐                           │
│                    │   Service      │                           │
│                    │   Worker       │                           │
│                    │   (Workbox)    │                           │
│                    └───────┬────────┘                           │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                    Frontend (React + Vite)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Components Layer                                         │   │
│  │  ├─ VoiceRecognition.jsx                                 │   │
│  │  ├─ GroceryListDisplay.jsx                               │   │
│  │  ├─ ManualInput.jsx                                      │   │
│  │  ├─ CorrectionDialog.jsx                                 │   │
│  │  └─ StatusAlerts.jsx                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Context Layer                                            │   │
│  │  ├─ AuthContext.jsx                                      │   │
│  │  └─ ThemeContext.jsx                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Services Layer                                           │   │
│  │  ├─ ServiceManager.js (orchestration)                    │   │
│  │  ├─ AuthService.js                                       │   │
│  │  ├─ GroceryListService.js                                │   │
│  │  ├─ ApiService.js                                        │   │
│  │  └─ groceryIntelligence.js                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Custom Hooks                                             │   │
│  │  ├─ useGroceryList.js                                    │   │
│  │  ├─ useErrorHandler.js                                   │   │
│  │  └─ useNetworkStatus.js                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                    HTTPS/REST API
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                  Backend (Node.js + Express)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Middleware Layer                                         │   │
│  │  ├─ CORS                                                  │   │
│  │  ├─ Helmet (security headers)                            │   │
│  │  ├─ Rate Limiting                                        │   │
│  │  └─ Body Parser                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Routes Layer                                             │   │
│  │  ├─ /api/auth (register, login, password reset)          │   │
│  │  ├─ /api/grocery-lists (CRUD operations)                 │   │
│  │  └─ /api/health (health check)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Models Layer (Mongoose)                                  │   │
│  │  ├─ User.js                                               │   │
│  │  └─ GroceryList.js                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Services                                                  │   │
│  │  ├─ Email Service (Resend API)                           │   │
│  │  └─ Authentication Service                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                      MongoDB Driver
                            │
┌───────────────────────────▼──────────────────────────────────────┐
│                   Database (MongoDB Atlas)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Collections                                              │   │
│  │  ├─ users (authentication, profile)                      │   │
│  │  └─ grocerylists (items, dates, categories)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Features                                                  │   │
│  │  ├─ Replication (high availability)                      │   │
│  │  ├─ Encryption at rest                                   │   │
│  │  └─ Automated backups                                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

External Services:
┌────────────────┐
│ Resend API     │ ← Email delivery (welcome, password reset)
└────────────────┘
┌────────────────┐
│ Web Speech API │ ← Browser voice recognition
└────────────────┘
```

## Frontend Architecture

### Component Hierarchy

```
App.jsx (Root)
├── AuthContext.Provider
│   ├── ThemeContext.Provider
│   │   ├── ApiErrorBoundary
│   │   │   ├── ErrorBoundary
│   │   │   │   ├── LoginPage
│   │   │   │   ├── RegisterPage
│   │   │   │   ├── ForgotPasswordPage
│   │   │   │   └── MainApp
│   │   │   │       ├── Header
│   │   │   │       ├── VoiceRecognition
│   │   │   │       ├── ManualInput
│   │   │   │       ├── GroceryListDisplay
│   │   │   │       │   └── CategorySection (multiple)
│   │   │   │       │       └── GroceryItem (multiple)
│   │   │   │       ├── CorrectionDialog
│   │   │   │       ├── StatusAlerts
│   │   │   │       ├── EmptyState
│   │   │   │       ├── SettingsPage
│   │   │   │       ├── HelpPage
│   │   │   │       └── Footer
```

### Service Layer Architecture

The frontend uses a **Service Manager pattern** for centralized orchestration:

```javascript
ServiceManager
├── AuthService (authentication, user management)
├── GroceryListService (CRUD operations, business logic)
├── ApiService (low-level HTTP communication)
└── groceryIntelligence (NLP, categorization, spell check)
```

**Key Design Decisions:**

1. **BaseService Class**: All services extend a base class for common functionality
2. **Dependency Injection**: Services receive dependencies through constructor
3. **Single Responsibility**: Each service handles one domain
4. **Testability**: Services are isolated and mockable

### State Management

**Context API** is used for global state:

1. **AuthContext**
   - User authentication state
   - Login/logout handlers
   - User profile data
   - Token management (localStorage)

2. **ThemeContext**
   - Dark/light mode toggle
   - Color scheme selection
   - Theme persistence (localStorage)

**Local State** (useState/useReducer) for:
- Component-specific UI state
- Form inputs
- Temporary data

**Custom Hooks** for reusable logic:
- `useGroceryList` - List operations and state
- `useErrorHandler` - Error management
- `useNetworkStatus` - Online/offline detection

### Voice Recognition Architecture

```javascript
VoiceRecognition Component
├── Web Speech API (browser native)
│   ├── SpeechRecognition / webkitSpeechRecognition
│   ├── continuous: true (multi-item support)
│   └── interimResults: false (final results only)
│
├── Filler Word Filter
│   └── Removes: "uhh", "umm", "you know", etc.
│
├── Item Parser (groceryIntelligence)
│   ├── Compound item detection ("basmati rice")
│   ├── Space-separated parsing ("onion spinach milk")
│   └── Smart separation logic
│
├── Spell Correction
│   ├── Levenshtein distance algorithm
│   ├── Grocery database matching
│   └── User confirmation dialog
│
└── Categorization Engine
    └── Auto-assign to predefined categories
```

## Backend Architecture

### Express Middleware Pipeline

```
Request
  │
  ├─> CORS Middleware (cross-origin requests)
  │
  ├─> Helmet Middleware (security headers)
  │
  ├─> Body Parser (JSON parsing)
  │
  ├─> Rate Limiter (brute-force protection)
  │     ├─ Global: 100 req/15min
  │     ├─ Auth: 5 req/15min (login, register)
  │     └─ Password Reset: 3 req/hour
  │
  ├─> Route Handler
  │     ├─ /api/auth/*
  │     ├─ /api/grocery-lists/*
  │     └─ /api/health
  │
  ├─> MongoDB Operation
  │
  └─> Response
```

### API Endpoints

#### Authentication Routes (`/api/auth`)

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/register` | POST | Create new user account | 5/15min |
| `/login` | POST | Authenticate user | 5/15min |
| `/forgot-password` | POST | Request password reset | 3/hour |
| `/reset-password/:token` | POST | Reset password with token | 3/hour |

#### Grocery List Routes (`/api/grocery-lists`)

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/` | GET | Get user's grocery lists | Yes |
| `/` | POST | Create new list | Yes |
| `/:id` | GET | Get specific list | Yes |
| `/:id` | PUT | Update list | Yes |
| `/:id` | DELETE | Delete list | Yes |
| `/date/:date` | GET | Get list by date | Yes |

#### Health Check (`/api/health`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Server health status |

### Authentication Flow

```
1. User Registration
   ├─ Client: POST /api/auth/register
   ├─ Server: Validate input
   ├─ Server: Hash password (bcrypt, 12 rounds)
   ├─ Database: Save user
   ├─ Email: Send welcome email (Resend)
   └─ Response: User object (no password)

2. User Login
   ├─ Client: POST /api/auth/login
   ├─ Server: Rate limit check
   ├─ Server: Find user by email
   ├─ Server: Compare password hash
   ├─ Response: User object + auth token
   └─ Client: Store in localStorage

3. Authenticated Request
   ├─ Client: Send request with auth header
   ├─ Server: Validate token/session
   ├─ Server: Process request
   └─ Response: Data or error
```

### Email Service Architecture

```
Email Service (Resend API)
├── Welcome Email
│   ├─ Trigger: User registration
│   ├─ Template: HTML + plain text
│   └─ Content: Welcome message, features overview
│
├── Password Reset Email
│   ├─ Trigger: Forgot password request
│   ├─ Token: SHA-256 hashed, 1-hour expiration
│   ├─ Anti-phishing: IP, timestamp, one-time use notice
│   └─ Link: HTTPS-only reset URL
│
└── Reset Confirmation Email
    ├─ Trigger: Successful password reset
    └─ Content: Security tips, account info
```

## Database Schema

### Users Collection

```javascript
{
  _id: ObjectId,
  firstName: String,
  lastName: String,
  email: String (unique, lowercase, indexed),
  password: String (bcrypt hashed),
  createdAt: Date,
  resetPasswordToken: String (optional),
  resetPasswordExpires: Date (optional)
}
```

**Indexes:**
- `email` (unique)
- `resetPasswordToken` (for password reset lookups)

### GroceryLists Collection

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'User', indexed),
  date: String (YYYY-MM-DD format, indexed),
  items: [
    {
      id: String (UUID),
      text: String,
      category: String,
      completed: Boolean,
      addedAt: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `userId` (for user list queries)
- `userId + date` (compound, for date-specific queries)

**Category Values:**
- Produce
- Dairy & Eggs
- Meat & Seafood
- Bakery
- Frozen Foods
- Pantry Staples
- Asian Pantry
- Indian Pantry
- Beverages
- Snacks
- Health & Beauty
- Household
- Other

## Security Architecture

### Defense in Depth

```
Layer 1: Network Security
├─ HTTPS/TLS encryption
├─ CORS policy (origin whitelist)
└─ Security headers (Helmet)

Layer 2: Application Security
├─ Rate limiting (Express Rate Limit)
├─ Input validation (sanitization)
└─ SQL injection prevention (Mongoose ORM)

Layer 3: Authentication Security
├─ Password hashing (bcrypt, 12 rounds)
├─ Token-based sessions
├─ Password reset tokens (SHA-256, 1-hour expiry)
└─ Brute-force protection (5 attempts/15min)

Layer 4: Data Security
├─ Encryption at rest (MongoDB Atlas)
├─ Encryption in transit (TLS)
└─ User enumeration prevention
```

### Security Headers (Helmet)

```javascript
{
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.railway.app"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}
```

### Rate Limiting Strategy

| Endpoint | Window | Max Requests | Purpose |
|----------|--------|--------------|---------|
| Global | 15 min | 100 | General throttling |
| Auth (login/register) | 15 min | 5 | Brute-force prevention |
| Password Reset | 1 hour | 3 | Abuse prevention |

## PWA Implementation

### Service Worker Architecture

```
Service Worker (Workbox)
├── Installation Phase
│   ├─ Precache static assets
│   ├─ Cache app shell (HTML, CSS, JS)
│   └─ Cache app icons
│
├── Activation Phase
│   ├─ Clean old caches
│   └─ Take control of clients
│
└── Fetch Phase
    ├─ CacheFirst (static assets)
    │   ├─ Google Fonts (1 year cache)
    │   └─ App resources
    │
    └─ NetworkFirst (API calls)
        ├─ Try network (10s timeout)
        └─ Fallback to cache (5 min TTL)
```

### Caching Strategy

| Resource Type | Strategy | TTL | Purpose |
|---------------|----------|-----|---------|
| App Shell | Precache | Until update | Fast startup |
| Static Assets | CacheFirst | Forever | Performance |
| Google Fonts | CacheFirst | 1 year | Offline fonts |
| API Calls | NetworkFirst | 5 minutes | Fresh data |
| Images/Icons | CacheFirst | Forever | Instant load |

### PWA Features

1. **Installability**
   - Web App Manifest
   - Service worker registration
   - Install prompt handling

2. **Offline Support**
   - Cached app shell
   - Cached API responses
   - Offline fallback UI

3. **Native Experience**
   - Standalone display mode
   - Custom splash screen
   - Status bar theming
   - App shortcuts

## Deployment Architecture

### Production Infrastructure

```
Internet
  │
  ├─── Netlify CDN (Frontend)
  │    ├─ Global edge network
  │    ├─ Automatic HTTPS
  │    ├─ Continuous deployment (Git push)
  │    └─ Build: pnpm build
  │
  ├─── Railway (Backend)
  │    ├─ Container runtime
  │    ├─ Automatic deployments
  │    ├─ Environment variables
  │    └─ Health checks
  │
  └─── MongoDB Atlas (Database)
       ├─ Replica set (3 nodes)
       ├─ Automatic backups
       ├─ Encryption at rest
       └─ Connection pooling
```

### Environment Configuration

**Frontend (.env)**
```env
VITE_API_BASE_URL=https://your-backend.railway.app/api
```

**Backend (.env)**
```env
MONGODB_URI=mongodb+srv://...
PORT=3001
CORS_ORIGIN=https://your-app.netlify.app
NODE_ENV=production
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=https://your-app.netlify.app
```

### Build Process

**Frontend (Netlify)**
```bash
1. Git push to main branch
2. Netlify detects change
3. npm install / pnpm install
4. pnpm build (Vite production build)
5. Deploy to CDN
6. Purge cache
7. Update DNS
```

**Backend (Railway)**
```bash
1. Git push to main branch
2. Railway detects change
3. Build Docker container
4. Run: pnpm --filter backend start
5. Health check: /api/health
6. Zero-downtime deployment
```

## Performance Optimizations

### Frontend

1. **Code Splitting**
   - Route-based splitting
   - Lazy loading components
   - Dynamic imports

2. **Asset Optimization**
   - Image compression
   - Font subsetting
   - Minification (Terser)

3. **Caching**
   - Service worker caching
   - Browser caching headers
   - CDN edge caching

### Backend

1. **Database**
   - Indexed queries
   - Connection pooling
   - Query optimization

2. **API**
   - Response compression
   - Efficient serialization
   - Minimal payload size

## Monitoring & Logging

### Frontend

- Error boundaries for React errors
- Console logging (development only)
- Network status monitoring
- Performance metrics

### Backend

- Request logging (Express)
- Error logging
- Rate limit violations
- Health check endpoint

## Future Architecture Considerations

1. **Scalability**
   - Microservices architecture
   - Message queue for async tasks
   - Read replicas for database

2. **Features**
   - Push notifications
   - Real-time collaboration
   - Background sync
   - Offline-first database

3. **DevOps**
   - CI/CD pipelines
   - Automated testing
   - Load testing
   - Monitoring dashboards

---

**Last Updated**: October 2024
**Version**: 2.0
**Maintainer**: Development Team
