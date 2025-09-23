# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (React + Vite)
- `pnpm dev` - Start development server (runs on localhost:5173 with --host flag)
- `pnpm build` - Build production bundle
- `pnpm preview` - Preview production build locally

### Backend (Node.js + Express)
- `pnpm --filter backend dev` - Start backend in development mode with nodemon (port 3001)
- `pnpm --filter backend start` - Start backend in production mode
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
- **Frontend**: React 18 with Vite, Material-UI (MUI), Voice Recognition API, Day.js
- **Backend**: Node.js with Express, MongoDB Atlas, bcryptjs, CORS, Helmet, Rate limiting
- **Database**: MongoDB Atlas with Mongoose ODM

### Project Structure
- `/src/` - React frontend source code
- `/backend/` - Node.js backend API
- `/backend/models/` - Mongoose schema definitions (User.js, GroceryList.js)
- `/backend/routes/` - Express route handlers (auth.js, groceryLists.js)

### Key Components
- **App.jsx** - Main application component with voice recognition, categorization logic
- **AuthContext.jsx** - Authentication state management
- **LoginPage.jsx/RegisterPage.jsx** - Authentication UI
- **apiStorage.js** - API client service for backend communication
- **theme.js** - Material-UI theme configuration

### Database Schema
- **Users**: firstName, lastName, email, password (hashed with bcryptjs)
- **GroceryLists**: userId, date (YYYY-MM-DD), items array with id, text, category, completed fields

### Authentication Flow
- JWT-like session management via localStorage
- User validation on each API request
- Protected routes require authentication

### Voice Recognition
- Uses Web Speech API (webkitSpeechRecognition/SpeechRecognition)
- Parses speech into individual grocery items using separators
- Auto-categorizes items into predefined grocery categories (Produce, Dairy, Meat & Seafood, etc.)

### API Structure
- `/api/auth/register` - User registration
- `/api/auth/login` - User login
- `/api/grocery-lists/` - CRUD operations for grocery lists
- `/api/health` - Health check endpoint

### Environment Configuration
Backend requires `.env` file with:
- `MONGODB_URI` - MongoDB Atlas connection string
- `PORT` - Server port (default 3001)
- `CORS_ORIGIN` - Frontend URL (default http://localhost:5173)

Frontend uses `.env` with:
- `VITE_API_BASE_URL` - Backend API URL (default http://localhost:3001/api)

### Migration Notes
This app was migrated from JSONBin to MongoDB backend. See `MIGRATION_NOTES.md` for details about user data migration implications.