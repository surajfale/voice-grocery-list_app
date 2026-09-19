# Documentation

Welcome to the Voice Grocery List App documentation! This folder contains comprehensive guides for both users and developers.

## 📚 Documentation Index

### For Users

| Document | Description | Best For |
|----------|-------------|----------|
| **[Usage Guide](./Usage.md)** | Complete user manual covering all features | Learning how to use the app |
| **[PWA Setup](./PWA_SETUP.md)** | Install the app on your device | Getting native app experience |

### For Developers

| Document | Description | Best For |
|----------|-------------|----------|
| **[Architecture](./Architecture.md)** | Technical architecture and system design | Understanding the codebase |
| **[Deployment Guide](./DEPLOYMENT.md)** | Production deployment instructions | Deploying to production |
| **[MongoDB Setup](./MONGODB_SETUP.md)** | Database configuration guide | Setting up the database |
| **[API Reference: Receipt Chat](./API.md)** | `/api/receipts/chat` RAG endpoint contract | Integrating with the receipts RAG API |
| **[Atlas Vector Search Setup](./atlas_vector_index.md)** | Vector index config for receipt embeddings | Setting up receipt search |
| **[Ingestion Job Setup](./INGESTION_JOB_SETUP.md)** | Scheduling the receipt embedding job | Running receipts RAG in production |
| **[RAG Implementation Tasks](./RAG_IMPLEMENTATION_TASKS.md)** | Receipts RAG feature build notes | Understanding how RAG was implemented |
| **[RAG Testing Checklist](./RAG_TESTING_CHECKLIST.md)** | QA checklist for the receipts RAG feature | Testing receipts/RAG changes |

### AI Development

| Document | Description | Location |
|----------|-------------|----------|
| **CLAUDE.md** | AI assistant guidance for development | [Root directory](../CLAUDE.md) |

## 🚀 Quick Start

### New Users
1. Start with the [Usage Guide](./Usage.md) to learn the basics
2. Follow [PWA Setup](./PWA_SETUP.md) to install the app on your device

### Developers
1. Read [Architecture](./Architecture.md) to understand the system
2. Follow [Deployment Guide](./DEPLOYMENT.md) to deploy your own instance
3. Configure database using [MongoDB Setup](./MONGODB_SETUP.md)
4. Setting up receipts/RAG? See [Atlas Vector Search Setup](./atlas_vector_index.md), [API Reference](./API.md), and [Ingestion Job Setup](./INGESTION_JOB_SETUP.md)

## 📖 Document Summaries

### Usage Guide
Complete user manual covering:
- Getting started (account creation, login)
- Voice recognition (natural speech, multiple items)
- Manual input (text entry, autocomplete)
- List management (dates, categories, items)
- Sharing & export (image, PDF, print)
- Theme customization (dark mode, colors)
- Account management (profile, password, security)
- PWA installation (Android, iOS, desktop)
- Keyboard shortcuts
- Tips & troubleshooting

**Length**: ~45 sections | **Audience**: End users

### PWA Setup
Progressive Web App guide covering:
- What's new with PWA features
- Installation instructions (Android, iOS, desktop)
- Technical implementation details
- Customization options
- Testing and troubleshooting
- Best practices

**Length**: ~15 sections | **Audience**: Users & developers

### Architecture
Technical architecture documentation covering:
- System overview and principles
- Complete tech stack (including the OpenAI-powered RAG stack)
- Architecture diagrams
- Frontend architecture (components, services, state)
- Backend architecture (API, middleware, auth)
- Receipt OCR & RAG pipeline (upload → OCR → chunk/embed → chat)
- Database schema (including Receipts/ReceiptChunks + Atlas Vector Search)
- Security architecture
- PWA implementation
- Deployment architecture
- Performance optimizations

**Length**: ~25 sections | **Audience**: Developers

### Deployment Guide
Step-by-step deployment instructions covering:
- Prerequisites and requirements
- Frontend deployment (Netlify)
- Backend deployment (Railway)
- Database setup (MongoDB Atlas)
- Environment configuration
- Domain setup and SSL
- Monitoring and maintenance
- Troubleshooting common issues

**Length**: ~20 sections | **Audience**: DevOps/Developers

### MongoDB Setup
Database configuration guide covering:
- MongoDB Atlas account setup
- Cluster creation and configuration
- User and security settings
- Connection string configuration
- Schema and indexes
- Backup and monitoring
- Migration notes

**Length**: ~10 sections | **Audience**: Developers/DBAs

## 🔍 Finding What You Need

### I want to...

#### Learn how to use the app
→ [Usage Guide](./Usage.md)

#### Install the app on my phone
→ [PWA Setup](./PWA_SETUP.md) → Installation section

#### Understand voice recognition
→ [Usage Guide](./Usage.md) → Voice Recognition section

#### Deploy my own instance
→ [Deployment Guide](./DEPLOYMENT.md)

#### Understand the architecture
→ [Architecture](./Architecture.md)

#### Set up the database
→ [MongoDB Setup](./MONGODB_SETUP.md)

#### Set up receipts + AI chat over receipts
→ [Atlas Vector Search Setup](./atlas_vector_index.md) → [API Reference](./API.md) → [Ingestion Job Setup](./INGESTION_JOB_SETUP.md)

#### Customize the PWA
→ [PWA Setup](./PWA_SETUP.md) → Customization section

#### Fix an issue
→ [Usage Guide](./Usage.md) → Troubleshooting section
→ [Deployment Guide](./DEPLOYMENT.md) → Troubleshooting section

## 🤝 Contributing to Documentation

Found an error or want to improve the docs?

1. **Report Issues**: Open an issue on GitHub
2. **Suggest Improvements**: Submit a pull request
3. **Ask Questions**: Use GitHub Discussions

### Documentation Standards

- Use clear, concise language
- Include examples and code snippets
- Add screenshots for UI features
- Keep table of contents updated
- Link between related sections
- Test all instructions before publishing

## 📝 Documentation Changelog

### Version 2.1 (September 2026)
- Documented the Receipts OCR & RAG feature (upload, OCR, chunking/embedding, chat) across CLAUDE.md, AGENTS.md, and Architecture.md
- Linked the existing API.md, atlas_vector_index.md, INGESTION_JOB_SETUP.md, RAG_IMPLEMENTATION_TASKS.md, and RAG_TESTING_CHECKLIST.md into this index

### Version 2.0 (October 2024)
- Created structured `/docs` folder
- Added comprehensive Architecture.md
- Added detailed Usage.md
- Moved and updated PWA_SETUP.md
- Moved DEPLOYMENT.md and MONGODB_SETUP.md
- Added this README

### Version 1.0 (September 2024)
- Initial documentation (DEPLOYMENT.md, MONGODB_SETUP.md)
- Basic README.md

## 🔗 Additional Resources

- **Main README**: [../README.md](../README.md)
- **Source Code**: [GitHub Repository](https://github.com/surajfale/voice-grocery-list_app)
- **Live Demo**: [Your deployment URL]
- **Issue Tracker**: [GitHub Issues](https://github.com/surajfale/voice-grocery-list_app/issues)

## 📞 Support

Need help? Here's where to go:

- **Usage Questions**: Check [Usage Guide](./Usage.md) → Troubleshooting
- **Deployment Issues**: Check [Deployment Guide](./DEPLOYMENT.md) → Troubleshooting
- **Technical Questions**: Check [Architecture](./Architecture.md)
- **Bug Reports**: [Open an issue](https://github.com/surajfale/voice-grocery-list_app/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/surajfale/voice-grocery-list_app/discussions)

---

**Documentation Version**: 2.1
**Last Updated**: September 2026
**Maintained By**: Development Team
