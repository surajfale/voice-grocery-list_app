# Voice Grocery List App

A modern voice-enabled grocery list application with cloud synchronization.

## Features

- 🎤 **Voice Recognition** - Add items by speaking
- 📱 **Responsive Design** - Works on desktop and mobile
- 🔐 **User Authentication** - Secure login and registration
- ☁️ **Cloud Sync** - Access your lists from any device
- 📅 **Date-based Lists** - Organize lists by date
- 🏷️ **Auto-categorization** - Items automatically sorted by category
- ✅ **Progress Tracking** - Check off items as you shop

## Tech Stack

### Frontend
- React 18 with Vite
- Material-UI (MUI) for components
- Voice Recognition API
- Day.js for date handling

### Backend
- Node.js with Express
- MongoDB Atlas for data storage
- bcryptjs for password hashing
- CORS and security middleware

## Quick Start

### Prerequisites
- Node.js 16+ installed
- MongoDB Atlas account (free tier available)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd voice-grocery-list_app
   ```

2. **Install all dependencies (frontend and backend)**
   ```bash
   pnpm install
   ```

3. **Set up MongoDB** (follow `MONGODB_SETUP.md`)

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   ```
   Edit both `.env` files with your MongoDB connection string and API URLs.

5. **Start the application**
   ```bash
   # Terminal 1 - Backend
   pnpm --filter backend dev

   # Terminal 2 - Frontend
   pnpm dev
   ```

## Deployment

- **Frontend**: Deploy to Netlify
- **Backend**: Deploy to Railway or Render
- See `MONGODB_SETUP.md` for detailed deployment instructions

## Development

This codebase was primarily generated using AI-assisted development (Claude Code) for rapid prototyping and implementation.
