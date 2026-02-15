# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 2025-11-29 23:49:15 - 308558b [PUSHED]

feat(autocomplete): add fuzzy search for historical items in input

- Integrate Fuse.js for improved item suggestions
- Update ManualInput component to use autocomplete
- Enhance user experience with historical item filtering
- Modify useGroceryList hook to provide historical items
- Update dependencies in package.json and pnpm-lock.yaml### Added
- **Account Limit**: Registration limited to 10 accounts maximum to prevent resource abuse
- **Account Deletion**: Secure account deletion with password re-authentication and complete data cleanup
- **Receipt RAG System**: Full receipt embedding and RAG chat capabilities using OpenAI API
- **Embedding Status Tracking**: Receipt embedding status (pending, synced, failed) with version tracking
- **Embedding Job**: Background job to generate embeddings for receipts (`pnpm --filter backend ingest:receipts`)
- **RAG Query Script**: Local testing script for RAG queries (`pnpm --filter backend rag:query`)
- **Account Deletion Email**: Confirmation email sent upon successful account deletion

### Changed
- Enhanced receipt OCR workspace with embedding status indicators
- Improved security with account creation limits
- Updated email service to include account deletion confirmations

### Fixed
- Receipt embedding status check and trigger endpoints
- Chat endpoint with diagnostic information for troubleshooting

## [0.1.0] - 2025-11-21

### Added
- Receipt embedding status check endpoint
- Trigger embedding endpoint for receipts
- Enhanced chatAboutReceipts with diagnostic information

### Technical Details
- Commit: b7bc702
- Date: 2025-11-21 22:49:44
- Status: Pushed to production