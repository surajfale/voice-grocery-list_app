# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (React + Vite)
- `pnpm dev` - Start development server (runs on localhost:5173 with --host flag)
- `pnpm build` - Build production bundle with linting (max 10 warnings)
- `pnpm build:ci` - Build without linting (for CI/CD)
- `pnpm build:prod` - Build with production NODE_ENV and linting
- `pnpm build:analyze` - Build with analyze mode
- `pnpm preview` - Preview production build locally
- `pnpm serve` - Serve build on host with port 4173
- `pnpm deploy:netlify` - Build and deploy to Netlify
- `pnpm clean` - Remove dist directory
- `pnpm lint` - Run ESLint on src/ (max 10 warnings)
- `pnpm lint:fix` - Auto-fix ESLint issues in src/
- `pnpm lint:backend` - Run ESLint on backend code
- `pnpm lint:backend:fix` - Auto-fix backend ESLint issues

### Backend (Node.js + Express)
- `pnpm --filter backend dev` - Start backend in development mode with nodemon (port 3001)
- `pnpm --filter backend start` - Start backend in production mode
- `pnpm --filter backend lint` - Run ESLint on backend (max 5 warnings)
- `pnpm --filter backend lint:fix` - Auto-fix backend ESLint issues
- `pnpm --filter backend test` - Run backend tests (vitest)
- `pnpm --filter backend ingest:receipts` - Run the receipt embedding/ingestion job (chunk + embed pending receipts)
- `pnpm --filter backend ingest:receipts -- --force` - Reprocess receipts that previously failed embedding
- `pnpm --filter backend test:receipt-local` - Run the local receipt OCR/RAG pipeline against a sample image
- `pnpm --filter backend rag:query` - Query the receipt RAG pipeline from the CLI
- `pnpm install` - Install all dependencies (frontend and backend)

### Full Development Setup
```bash
# Terminal 1 - Backend
pnpm --filter backend dev

# Terminal 2 - Frontend
pnpm dev
```

### Workspace Commands
- `pnpm install` - Install dependencies for all workspaces
- `pnpm --filter backend <command>` - Run command in backend workspace only
- `pnpm -r <command>` - Run command in all workspaces recursively

## Architecture

### Tech Stack
- **Frontend**: React 18 with Vite, Material-UI (MUI), Voice Recognition API, Day.js, PWA support
- **Backend**: Node.js with Express, MongoDB Atlas, bcryptjs, jsonwebtoken, CORS, Helmet, Rate limiting, Multer (file uploads)
- **Database**: MongoDB Atlas with Mongoose ODM, plus GridFS (receipt images) and Atlas Vector Search (receipt embeddings)
- **AI / RAG**: OpenAI API (`openai` SDK) for receipt OCR text structuring, embeddings, and retrieval-augmented chat completions; a separate EasyOCR/Vision microservice performs raw text extraction
- **PWA**: Vite PWA plugin with Workbox service worker for offline support and app-like experience

### Project Structure
- `/src/` - React frontend source code
- `/backend/` - Node.js backend API
- `/backend/models/` - Mongoose schema definitions (User.js, GroceryList.js, Receipt.js, ReceiptChunk.js)
- `/backend/routes/` - Express route handlers (auth.js, groceryLists.js, receipts.js)
- `/backend/controllers/` - Route business logic (receiptController.js)
- `/backend/services/` - Backend services (emailService.js, receiptOcr.js, ReceiptRagService.js, receiptChunker.js)
- `/backend/utils/` - Shared backend utilities (embeddingClient.js, gridFs.js, costEstimator.js)
- `/backend/jobs/` - Scheduled jobs (receiptEmbeddingJob.js for chunking/embedding pending receipts)

### Key Components
- **App.jsx** - Main application component with voice recognition, categorization logic, and smart corrections dialog
- **AuthContext.jsx** - Authentication state management with user validation
- **LoginPage.jsx/RegisterPage.jsx** - Modern authentication UI with Material Design
- **HelpPage.jsx** - User help and documentation component
- **ThemeSettings.jsx** - Dynamic theme customization component
- **ThemeContext.jsx** - Theme state management (light/dark mode, color schemes)

### Component Architecture (src/components/)
- **VoiceRecognition.jsx** - Enhanced voice input with intelligent item parsing, filler word filtering, and instant processing
- **GroceryListDisplay.jsx** - Main grocery list UI with categorization and item management
- **ManualInput.jsx** - Text-based item input with autocomplete and smart suggestions
- **CorrectionDialog.jsx** - User confirmation dialog for spell correction and item validation
- **StatusAlerts.jsx** - System status notifications and user feedback
- **EmptyState.jsx** - Empty list state with onboarding guidance
- **ErrorBoundary.jsx** / **ApiErrorBoundary.jsx** - Error handling and recovery components
- **receipts/ReceiptChatPanel.jsx** - Chat UI for asking natural-language questions about uploaded receipts (RAG-backed)
- **receipts/SpendingInsights.jsx** - Spending summaries/insights derived from parsed receipt data

### Service Architecture (src/services/)
- **ServiceManager.js** - Centralized service orchestration and dependency management
- **BaseService.js** - Base class with common service functionality
- **AuthService.js** - Authentication and user management
- **GroceryListService.js** - Grocery list CRUD operations and business logic
- **ApiService.js** - Low-level API communication layer
- **apiStorage.js** / **LegacyApiStorage.js** - API client services (legacy and current)
- **groceryIntelligence.js** - Enhanced grocery intelligence with smart item parsing, categorization, spell correction, and space-separated item detection
- **ReceiptService.js** - Receipt upload, listing, retrieval, and deletion; registered in ServiceManager as `receipt`
- **ReceiptRagClient.js** - Client for the `/api/receipts/chat` RAG endpoint (question, filters, sources, usage); used directly by `useReceiptChat`, not registered in ServiceManager

### Share / Export Utilities (src/utils/downloadList.js)
- **shareList** - Uses the Web Share API when available to share a rendered list (image/pdf) from the client on supported devices/browsers
- **downloadListAsImage** - Renders the printable list area and downloads it as a PNG/JPEG image using html2canvas
- **downloadListAsPDF** - Renders the printable list area and downloads it as a PDF file using jsPDF
- **PrintableList.jsx** - A component wired to a `printableListRef` that provides the formatted list layout used by the export utilities

### Custom Hooks (src/hooks/)
- **useGroceryList.js** - Grocery list state management and operations
- **useErrorHandler.js** - Centralized error handling and user notifications
- **useNetworkStatus.js** - Network connectivity monitoring and offline handling
- **useReceipts.js** - Receipt list/upload/selection state, backed by ReceiptService
- **useReceiptChat.js** - RAG chat state (question history, date-range filters, streaming stages), backed by ReceiptRagClient

### Utilities (src/utils/)
- **logger.js** - Centralized logging system with different log levels

### Database Schema
- **Users**: firstName, lastName, email, password (hashed with bcryptjs)
- **GroceryLists**: userId, date (YYYY-MM-DD), items array with id, text, category, completed fields
- **Receipts**: userId, fileId (GridFS), contentHash, mimeType/size, sourceImages, OCR-parsed merchant/date/items/totals, embeddingStatus
- **ReceiptChunks**: receiptId, userId, chunkIndex, text, embedding (vector), merchant, purchaseDate, total, items, metadata — indexed by the `receiptVectorIndex` Atlas Vector Search index (see `docs/atlas_vector_index.md`)

### Authentication Flow
- JWT session (`jsonwebtoken`, signed with `JWT_SECRET`) issued on login/register, stored in localStorage
- User validation on each API request
- Protected routes require authentication

### Receipts & RAG (Retrieval-Augmented Generation)
- **Upload**: `POST /api/receipts` accepts image uploads (Multer, in-memory, 10MB/file, up to 10 files); images are stitched and stored in MongoDB GridFS (`backend/utils/gridFs.js`)
- **OCR + parsing** (`backend/services/receiptOcr.js`): raw text comes from an external EasyOCR/Vision microservice (`OCR_SERVICE_URL`), then an OpenAI LLM call structures it into merchant/date/items/totals JSON
- **Chunking & embedding** (`backend/services/receiptChunker.js`, `backend/jobs/receiptEmbeddingJob.js`): parsed receipts are chunked and embedded via `backend/utils/embeddingClient.js` (OpenAI embeddings, model set by `RAG_EMBEDDINGS_MODEL`), producing `ReceiptChunk` documents; the job can run on a schedule (see `docs/INGESTION_JOB_SETUP.md`) or via `pnpm --filter backend ingest:receipts`
- **Chat** (`backend/services/ReceiptRagService.js`, `POST /api/receipts/chat`): embeds the user's question, runs a `$vectorSearch` query (optionally filtered by `receiptIds`/`dateRange`) against `receiptChunks`, then asks an OpenAI completion model (`RAG_COMPLETIONS_MODEL`) to answer grounded in the retrieved chunks — see `docs/API.md` for the full request/response contract
- Rate-limited per-user and per-IP (`backend/middleware/rateLimiter.js`); costs are estimated in `backend/utils/costEstimator.js` and logged via structured `rag.*`/`ingest.*` log events

### Voice Recognition & Intelligence
- Uses Web Speech API (webkitSpeechRecognition/SpeechRecognition)
- **Enhanced Item Parsing**: Intelligently separates multiple items from natural speech ("onion spinach milk" → 3 separate items)
- **Smart Filler Word Filtering**: Removes utterances, pronouns, and filler words ("uhh", "umm", "ahh", "you know", etc.)
- **Instant Processing**: Items are processed immediately when user stops recording (no waiting for timeouts)
- Auto-categorizes items into predefined grocery categories (Produce, Dairy, Meat & Seafood, Asian Pantry, Indian Pantry, etc.)
- Smart spell correction with user confirmation dialog using grocery intelligence database
- Duplicate detection to prevent adding same items
- Enhanced voice feedback with visual indicators and pulsing animations
- Improved error handling that suppresses expected "aborted" errors from manual stops

### API Structure
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/auth/forgot-password` / `/api/auth/reset-password/:token` - Password reset flow
- `/api/grocery-lists/` - CRUD operations for grocery lists
- `/api/receipts` - Upload a receipt (POST, multipart)
- `/api/receipts/user/:userId` - List a user's receipts
- `/api/receipts/:receiptId` / `/api/receipts/:receiptId/image` - Fetch a receipt / stream its image
- `/api/receipts/chat` - RAG chat over a user's receipts (see `docs/API.md`)
- `/api/health` - Health check endpoint

### Environment Configuration
Backend requires `.env` file with:
- `MONGODB_URI` - MongoDB Atlas connection string
- `PORT` - Server port (default 3001)
- `CORS_ORIGIN` - Frontend URL (default http://localhost:5173)
- `JWT_SECRET` - Secret used to sign/verify session JWTs
- `RESEND_API_KEY` - Resend API key for sending emails
- `EMAIL_FROM` - Verified sender email address (e.g., noreply@yourdomain.com)
- `OPENAI_API_KEY` - OpenAI API key powering receipt OCR parsing, embeddings, and RAG chat completions
- `RAG_EMBEDDINGS_MODEL` / `RAG_COMPLETIONS_MODEL` - OpenAI models for embeddings and chat completions (defaults: `text-embedding-3-large`, `gpt-4o`)
- `RAG_TOP_K` / `RAG_CHUNK_SIZE` / `RAG_VECTOR_INDEX` / `EMBEDDINGS_VERSION` - RAG retrieval and chunking tuning knobs
- `OCR_SERVICE_URL` - Base URL of the external EasyOCR/Vision microservice used for raw receipt text extraction (default `http://localhost:8000`)

Frontend uses `.env` with:
- `VITE_API_BASE_URL` - Backend API URL (default http://localhost:3001/api)

### Migration Notes
This app was migrated from JSONBin to MongoDB backend. See `MIGRATION_NOTES.md` for details about user data migration implications.

### Development Notes
- This is a pnpm workspace with frontend (root) and backend packages
- ESLint configured: frontend (max 10 warnings), backend (max 5 warnings)
- No testing setup currently configured
- Uses Emotion for CSS-in-JS with Material-UI
- Voice recognition requires HTTPS in production (uses Web Speech API)
- Frontend runs on port 5173, backend on port 3001
- Dependencies are optimized (removed unused prop-types)
- Includes netlify.toml for optimized Netlify deployment
- Comprehensive deployment documentation available (docs/DEPLOYMENT.md)
- Both frontend and backend use ESM (type: "module" in package.json)
- **PWA enabled**: Installable on Android/iOS with offline support (see docs/PWA_SETUP.md)

### Documentation Structure
All documentation is organized in the `/docs` folder:
- **Architecture.md** - Complete system architecture and technical design
- **Usage.md** - Comprehensive user guide for all features
- **DEPLOYMENT.md** - Production deployment guide (Netlify + Railway)
- **PWA_SETUP.md** - Progressive Web App installation and features
- **MONGODB_SETUP.md** - Database configuration and setup
- **API.md** - Receipt RAG chat API reference (`/api/receipts/chat` request/response contract)
- **atlas_vector_index.md** - MongoDB Atlas Vector Search index configuration for receipt embeddings
- **INGESTION_JOB_SETUP.md** - Scheduling the receipt embedding/ingestion job in production
- **RAG_IMPLEMENTATION_TASKS.md** / **RAG_TESTING_CHECKLIST.md** - RAG feature implementation notes and QA checklist



### Deployment
- **Frontend**: Deployed on Netlify with automatic builds
- **Backend**: Deployed on Railway with MongoDB Atlas
- **Configuration**: Uses netlify.toml for build optimization and security headers
- **Environment**: Production-ready with CORS configuration and rate limiting

## Commit Message Guidelines

When making changes to this codebase, always generate conventional commit messages that:

1. **Follow conventional commit format**: `type(scope): description`
2. **Keep messages concise**: Maximum 2 lines, short and to the point
3. **Understand project context**: This is a React + Material-UI voice-powered grocery list app with MongoDB backend
4. **Use appropriate types**:
   - `feat`: New features (components, API endpoints, UI enhancements)
   - `fix`: Bug fixes (UI issues, API errors, voice recognition problems)
   - `style`: UI/styling changes (Material-UI components, responsive design)
   - `refactor`: Code restructuring without functionality changes
   - `docs`: Documentation updates (README, CLAUDE.md, comments)
   - `chore`: Build tools, dependencies, configuration changes

**Examples**:
- `feat(ui): add footer with copyright and GitHub link`
- `fix(layout): improve responsive design for mobile devices`
- `style(footer): position footer at bottom of screen`
- `refactor(components): extract Footer component from App.jsx`

Always consider the app's core features (voice recognition, grocery categorization, user authentication, theme customization) when crafting commit messages.

## Important Behavioral Guidelines

When working in this codebase:
1. **Always prefer editing existing files** over creating new ones
2. **Never proactively create documentation files** (*.md) unless explicitly requested
3. **Use ESLint before committing**: Run `pnpm lint` (frontend) or `pnpm --filter backend lint` (backend)
4. **Follow the existing service architecture**: Use ServiceManager for orchestration, extend BaseService for new services
5. **Test voice features in HTTPS**: Voice recognition only works in secure contexts (localhost or HTTPS)
6. **Maintain the grocery intelligence database**: When adding items, ensure proper categorization in groceryIntelligence.js
7. **RAG features degrade gracefully without a key**: if `OPENAI_API_KEY` is unset, embedding/chat calls are disabled (logged as warnings) rather than crashing — don't assume it's always configured in dev
8. **Mind RAG cost/rate limits**: chat and embedding calls hit OpenAI and are metered (`backend/utils/costEstimator.js`) and rate-limited per-user/IP; avoid looping calls in tests or scripts against a real key

