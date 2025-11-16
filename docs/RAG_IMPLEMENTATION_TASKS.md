# RAG Implementation Task Breakdown

This document breaks down the RAG implementation from `RAG_IMPLEMENTATION.md` into detailed, actionable tasks that can be executed sequentially.

## Phase 1: Infrastructure & Configuration Setup

### Task 1.1: Install Required Dependencies
**File**: `backend/package.json`
**Description**: Add OpenAI SDK and any other required dependencies for embeddings and LLM calls.
**Details**:
- Install `openai` package (or Azure OpenAI SDK if using Azure)
- Verify all existing dependencies are up to date
- Update package.json with new dependencies
**Acceptance Criteria**:
- [ ] `openai` package installed
- [ ] Dependencies can be installed with `pnpm install`
- [ ] No version conflicts

### Task 1.2: Configure Environment Variables
**File**: `backend/.env.example` (create if doesn't exist), `backend/.env`
**Description**: Add all RAG-related environment variables to configuration.
**Details**:
- Add `OPENAI_API_KEY` for embeddings and LLM
- Add `RAG_EMBEDDINGS_MODEL` (default: `text-embedding-3-small`)
- Add `RAG_COMPLETIONS_MODEL` (default: `gpt-4o-mini`)
- Add `RAG_TOP_K` (default: `5`)
- Add `RAG_CHUNK_SIZE` (default: `512`)
- Add `RAG_VECTOR_INDEX` (default: `receiptVectorIndex`)
- Add `EMBEDDINGS_VERSION` (default: `1`) for versioning embeddings
- Update `.env.example` with placeholder values
**Acceptance Criteria**:
- [ ] All environment variables documented in `.env.example`
- [ ] `ragConfig.js` reads from environment variables correctly
- [ ] Default values work when env vars are not set

### Task 1.3: Update Receipt Model Schema
**File**: `backend/models/Receipt.js`
**Description**: Add fields to track embedding status and versioning.
**Details**:
- Add `embeddingStatus` field: `enum: ['pending', 'synced', 'failed']`, default: `'pending'`
- Add `embeddingsVersion` field: `Number`, default: `0`
- Add indexes for efficient querying: `{ embeddingStatus: 1, embeddingsVersion: 1 }`
**Acceptance Criteria**:
- [ ] Schema updated with new fields
- [ ] Indexes created for performance
- [ ] Migration path considered for existing receipts

## Phase 2: Embedding Client Implementation

### Task 2.1: Implement OpenAI Embedding Client
**File**: `backend/utils/embeddingClient.js`
**Description**: Replace placeholder with actual OpenAI SDK integration.
**Details**:
- Initialize OpenAI client with API key from environment
- Implement `embedText(text)` method that calls OpenAI embeddings API
- Implement `embedBatch(texts)` method for batch embeddings (more efficient)
- Handle errors gracefully (rate limits, API errors)
- Add retry logic for transient failures
- Use model from `ragConfig.embeddingsModel`
**Acceptance Criteria**:
- [ ] `embedText()` returns embedding vector array
- [ ] `embedBatch()` handles multiple texts efficiently
- [ ] Error handling for API failures
- [ ] Retry logic for transient errors
- [ ] Logging for debugging

### Task 2.2: Implement LLM Completion Client
**File**: `backend/utils/embeddingClient.js` (extend existing file)
**Description**: Add LLM completion functionality to the embedding client.
**Details**:
- Implement `complete(messages, options)` method
- Support system/user/assistant message format
- Use model from `ragConfig.completionsModel`
- Configure temperature (default: 0.2 for deterministic answers)
- Handle streaming responses (optional for Phase 1)
- Add error handling and retry logic
**Acceptance Criteria**:
- [ ] `complete()` method returns LLM response
- [ ] Supports system/user message format
- [ ] Error handling implemented
- [ ] Configurable temperature and model

## Phase 3: Vector Store Implementation

### Task 3.1: Create Receipt Chunks Collection Schema
**File**: `backend/models/ReceiptChunk.js` (new file)
**Description**: Create Mongoose schema for storing receipt chunks with embeddings.
**Details**:
- Define schema with fields:
  - `_id`: Composite key `{ receiptId, chunkIndex }` or auto-generated
  - `receiptId`: Reference to Receipt
  - `userId`: Reference to User (for filtering)
  - `chunkIndex`: Number (order within receipt)
  - `text`: String (chunk text content)
  - `embedding`: Array of Numbers (vector embedding)
  - `merchant`: String (from receipt)
  - `purchaseDate`: String (from receipt)
  - `total`: Number (from receipt)
  - `items`: Array of Strings (item names from receipt)
  - `metadata`: Object (additional metadata)
- Add indexes: `{ userId: 1 }`, `{ receiptId: 1 }`, `{ purchaseDate: 1 }`
- Create model export
**Acceptance Criteria**:
- [ ] Schema defined with all required fields
- [ ] Indexes created for efficient queries
- [ ] Model exported correctly

### Task 3.2: Set Up MongoDB Atlas Vector Search Index
**File**: Documentation/instructions (or migration script)
**Description**: Create vector search index in MongoDB Atlas.
**Details**:
- Document steps to create Atlas Search index
- Index name: `receiptVectorIndex` (or from config)
- Vector field: `embedding`
- Dimensions: 1536 (for text-embedding-3-small) or configurable
- Include metadata fields in index for filtering
- Provide MongoDB Atlas UI instructions or aggregation pipeline
**Acceptance Criteria**:
- [ ] Documentation for creating index
- [ ] Index configuration documented
- [ ] Test query to verify index works

### Task 3.3: Implement Vector Store Utilities
**File**: `backend/utils/vectorStore.js`
**Description**: Replace placeholder with actual MongoDB Atlas Vector Search implementation.
**Details**:
- Implement `upsertChunks(chunks)` method:
  - Accept array of chunk objects with embeddings
  - Upsert into `receiptChunks` collection
  - Handle duplicate keys (receiptId + chunkIndex)
  - Return success/failure counts
- Implement `searchChunks(queryVector, filters, topK)` method:
  - Build MongoDB aggregation pipeline with `$search` stage
  - Use `knnBeta` operator for vector search
  - Apply filters (userId, receiptId, dateRange)
  - Return chunks with scores
  - Limit to `topK` results
- Add error handling for search failures
- Add logging for debugging
**Acceptance Criteria**:
- [ ] `upsertChunks()` successfully stores chunks with embeddings
- [ ] `searchChunks()` returns relevant chunks with scores
- [ ] Filters work correctly (userId, receiptId, dateRange)
- [ ] Error handling implemented
- [ ] Logging added

## Phase 4: Chunking & Ingestion Pipeline

### Task 4.1: Implement Receipt Chunking Logic
**File**: `backend/services/receiptChunker.js` (new file)
**Description**: Create service to chunk receipts into embeddable pieces.
**Details**:
- Implement `chunkReceipt(receipt)` method:
  - Extract merchant, date, total from receipt
  - Process `rawText` and `items` array
  - Create chunks of ~50-150 words (configurable via `RAG_CHUNK_SIZE`)
  - Include preamble with merchant/date/total in each chunk
  - Clean OCR artifacts (double spaces, separators)
  - Normalize currency and prices
  - Return array of chunk objects with metadata
- Handle edge cases:
  - Empty receipts
  - Very short receipts (single chunk)
  - Very long receipts (multiple chunks)
- Add unit tests for chunking logic
**Acceptance Criteria**:
- [ ] Chunks created with proper size (50-150 words)
- [ ] Each chunk includes merchant/date context
- [ ] OCR artifacts cleaned
- [ ] Metadata preserved correctly
- [ ] Edge cases handled

### Task 4.2: Implement Ingestion Job
**File**: `backend/jobs/receiptEmbeddingJob.js`
**Description**: Replace placeholder with full ingestion pipeline.
**Details**:
- Implement main `run()` function:
  1. Query receipts where `status === 'ready'` AND (`embeddingStatus !== 'synced'` OR `embeddingsVersion < CURRENT_VERSION`)
  2. Process in batches (e.g., 50 receipts at a time)
  3. For each receipt:
     - Generate chunks using `receiptChunker`
     - Generate embeddings for all chunks (batch API call)
     - Upsert chunks to vector store
     - Update receipt: `embeddingStatus = 'synced'`, `embeddingsVersion = CURRENT_VERSION`
  4. Handle errors per receipt (don't fail entire batch)
  5. Log progress and statistics
- Add command-line arguments:
  - `--batch-size`: Override default batch size
  - `--receipt-id`: Process single receipt
  - `--force`: Re-process all receipts
- Add logging to `ingestionLogs` collection (optional)
- Add retry logic for transient failures
**Acceptance Criteria**:
- [ ] Job processes receipts in batches
- [ ] Chunks generated and embedded correctly
- [ ] Vector store updated with chunks
- [ ] Receipt status updated after processing
- [ ] Error handling prevents batch failures
- [ ] Logging provides useful feedback
- [ ] Command-line arguments work

### Task 4.3: Add Ingestion Logging (Optional)
**File**: `backend/models/IngestionLog.js` (new file)
**Description**: Create model to track ingestion runs for monitoring.
**Details**:
- Schema fields:
  - `runId`: Unique identifier for each run
  - `startedAt`: Timestamp
  - `completedAt`: Timestamp
  - `totalReceipts`: Number processed
  - `successCount`: Number succeeded
  - `failureCount`: Number failed
  - `errors`: Array of error messages
- Create log entry at start and end of each run
- Query logs for monitoring dashboard (future enhancement)
**Acceptance Criteria**:
- [ ] Log entries created for each run
- [ ] Statistics tracked correctly
- [ ] Errors logged for debugging

## Phase 5: RAG Service Implementation

### Task 5.1: Implement Context Retrieval
**File**: `backend/services/ReceiptRagService.js`
**Description**: Implement `retrieveContext()` method for vector search.
**Details**:
- Implement `retrieveContext({ userId, question, receiptIds, dateRange })`:
  1. Generate embedding for user question using `embeddingClient`
  2. Build filter object:
     - Always include `userId`
     - Add `receiptId` filter if `receiptIds` provided
     - Add `purchaseDate` range filter if `dateRange` provided
  3. Call `vectorStore.searchChunks()` with query vector and filters
  4. Return top-k chunks with scores and metadata
- Handle edge cases:
  - No results found
  - Invalid filters
  - Embedding generation failures
- Add logging for retrieval performance
**Acceptance Criteria**:
- [ ] Question embedded correctly
- [ ] Filters applied correctly
- [ ] Top-k chunks returned with scores
- [ ] Error handling for edge cases
- [ ] Logging added

### Task 5.2: Implement Answer Generation
**File**: `backend/services/ReceiptRagService.js`
**Description**: Implement `generateAnswer()` method for LLM calls.
**Details**:
- Implement `generateAnswer(question, contextChunks)`:
  1. Build system prompt: "You are a helpful grocery finance assistant..."
  2. Format context chunks:
     - Include merchant, date, total for each chunk
     - Include relevant text snippets
     - Add chunk metadata
  3. Build user prompt with question and context
  4. Call LLM with system + user messages
  5. Extract answer from response
  6. Post-process:
     - Extract cited receipt IDs from context
     - Enforce max length if needed
     - Format markdown if supported
- Handle edge cases:
  - Empty context
  - LLM API failures
  - Malformed responses
- Add prompt templates (make configurable)
**Acceptance Criteria**:
- [ ] System prompt defined
- [ ] Context formatted correctly
- [ ] LLM called with proper messages
- [ ] Answer extracted and formatted
- [ ] Citations included in response
- [ ] Error handling implemented

### Task 5.3: Implement High-Level Chat Method
**File**: `backend/services/ReceiptRagService.js`
**Description**: Implement `chat()` method that combines retrieval + generation.
**Details**:
- Implement `chat({ userId, question, receiptIds, dateRange })`:
  1. Validate inputs (question length, userId format)
  2. Call `retrieveContext()` to get relevant chunks
  3. If no chunks found, return helpful error message
  4. Call `generateAnswer()` with question and chunks
  5. Return structured response:
     ```json
     {
       "answer": "...",
       "sources": [
         { "receiptId": "...", "merchant": "...", "purchaseDate": "...", "score": 0.95 }
       ],
       "contextChunks": [...]
     }
     ```
- Add input validation and sanitization
- Add rate limiting considerations (handled at route level)
- Add caching logic (optional, for repeated questions)
**Acceptance Criteria**:
- [ ] End-to-end flow works
- [ ] Input validation implemented
- [ ] Structured response returned
- [ ] Error messages are user-friendly
- [ ] Performance acceptable (< 5 seconds)

## Phase 6: API Integration

### Task 6.1: Update Chat Controller
**File**: `backend/controllers/receiptController.js`
**Description**: Replace placeholder `chatAboutReceipts()` with RAG implementation.
**Details**:
- Update `chatAboutReceipts()` function:
  1. Validate `userId`, `question` (min length, max length)
  2. Extract optional `receiptIds` and `dateRange` from request
  3. Call `receiptRagService.chat()` with parameters
  4. Return response with `answer` and `sources`
  5. Handle errors gracefully
- Remove placeholder logic
- Add input sanitization
- Add request logging
- Maintain backward compatibility with response format
**Acceptance Criteria**:
- [ ] Controller calls RAG service correctly
- [ ] Input validation works
- [ ] Response format matches frontend expectations
- [ ] Error handling provides useful messages
- [ ] Logging added

### Task 6.2: Add Rate Limiting to Chat Endpoint
**File**: `backend/routes/receipts.js` or `backend/server.js`
**Description**: Add rate limiting to prevent abuse and control costs.
**Details**:
- Use `express-rate-limit` (already installed)
- Configure rate limit:
  - Per user: e.g., 20 requests per 15 minutes
  - Per IP: e.g., 50 requests per 15 minutes
- Add rate limit to `/api/receipts/chat` route
- Return appropriate error message when limit exceeded
- Consider different limits for authenticated vs unauthenticated users
**Acceptance Criteria**:
- [ ] Rate limiting applied to chat endpoint
- [ ] Limits are reasonable (prevent abuse, allow normal use)
- [ ] Error messages are clear
- [ ] Headers indicate remaining requests

### Task 6.3: Add Request Validation Middleware
**File**: `backend/middleware/validateChatRequest.js` (new file, optional)
**Description**: Create middleware to validate chat requests.
**Details**:
- Validate `question`:
  - Minimum length: 3 characters
  - Maximum length: 500 characters (prevent prompt abuse)
  - Sanitize input (remove dangerous characters)
- Validate `userId`: Must be valid ObjectId
- Validate `receiptIds`: Must be array of valid ObjectIds
- Validate `dateRange`: Must have valid start/end dates
- Return 400 with clear error messages for invalid inputs
**Acceptance Criteria**:
- [ ] All inputs validated
- [ ] Clear error messages
- [ ] Prevents prompt injection attempts
- [ ] Reusable middleware

## Phase 7: Frontend Updates

### Task 7.1: Update Chat UI to Show Loading States
**File**: `src/pages/ReceiptsPage.jsx` (or wherever chat UI exists)
**Description**: Add loading indicators and status messages.
**Details**:
- Show typing indicator while waiting for LLM response
- Display "Searching receipts..." message during retrieval
- Show "Generating answer..." message during LLM call
- Handle timeout scenarios (show error after 30 seconds)
- Add retry button on errors
- Disable input while processing
**Acceptance Criteria**:
- [ ] Loading states visible to user
- [ ] Clear feedback during processing
- [ ] Timeout handling works
- [ ] Retry functionality works

### Task 7.2: Display Citations and Sources
**File**: `src/pages/ReceiptsPage.jsx` (or chat component)
**Description**: Show cited receipts with links to detail view.
**Details**:
- Parse `sources` array from API response
- Display source chips/cards:
  - Show merchant name, date, total
  - Show relevance score (optional)
  - Make clickable to open receipt detail
- Add "Sources" section below answer
- Style citations consistently with Material-UI
- Handle empty sources gracefully
**Acceptance Criteria**:
- [ ] Sources displayed correctly
- [ ] Clickable links to receipt details
- [ ] Styled with Material-UI components
- [ ] Empty state handled

### Task 7.3: Add Filter Controls
**File**: `src/pages/ReceiptsPage.jsx` (or chat component)
**Description**: Add UI controls for filtering chat context.
**Details**:
- Add date range picker (Material-UI DatePicker)
- Add merchant selector (autocomplete from user's receipts)
- Add receipt selector (multi-select chips)
- Add "Clear filters" button
- Pass filters to API in request body
- Show active filters as chips
- Persist filter preferences (localStorage, optional)
**Acceptance Criteria**:
- [ ] Date range picker works
- [ ] Merchant selector populated from receipts
- [ ] Receipt selector allows multi-select
- [ ] Filters passed to API correctly
- [ ] Active filters displayed
- [ ] Clear filters works

### Task 7.4: Improve Answer Display Formatting
**File**: `src/pages/ReceiptsPage.jsx` (or chat component)
**Description**: Format LLM answers with markdown and better styling.
**Details**:
- Parse markdown in answers (if LLM returns markdown)
- Use Material-UI Typography for answer display
- Add syntax highlighting for code blocks (if applicable)
- Style lists, bold, italic text properly
- Add copy-to-clipboard button
- Add "Regenerate" button
- Show answer in card/paper component
**Acceptance Criteria**:
- [ ] Markdown rendered correctly
- [ ] Typography styled properly
- [ ] Copy button works
- [ ] Regenerate button works
- [ ] Answer displayed in card

### Task 7.5: Add Error Handling and Empty States
**File**: `src/pages/ReceiptsPage.jsx` (or chat component)
**Description**: Handle error cases gracefully with helpful messages.
**Details**:
- Handle "No receipts found" case:
  - Show friendly message: "No receipts mention 'X' yet"
  - Suggest uploading more receipts
  - Provide quick action buttons
- Handle API errors:
  - Show user-friendly error messages
  - Provide retry button
  - Log errors for debugging
- Handle network errors:
  - Show offline message
  - Suggest checking connection
- Handle rate limit errors:
  - Show "Too many requests" message
  - Indicate when user can try again
**Acceptance Criteria**:
- [ ] All error cases handled
- [ ] Messages are user-friendly
- [ ] Retry functionality works
- [ ] Empty states provide guidance

## Phase 8: Testing & Validation

### Task 8.1: Write Unit Tests for Chunking Logic
**File**: `backend/services/__tests__/receiptChunker.test.js` (new file)
**Description**: Test receipt chunking with various inputs.
**Details**:
- Test normal receipt chunking
- Test very short receipts (single chunk)
- Test very long receipts (multiple chunks)
- Test edge cases (empty text, missing fields)
- Test OCR artifact cleaning
- Test metadata preservation
- Use Jest or similar testing framework
**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] Edge cases covered
- [ ] Tests are maintainable

### Task 8.2: Write Integration Tests for RAG Service
**File**: `backend/services/__tests__/ReceiptRagService.test.js` (new file)
**Description**: Test RAG service with mocked dependencies.
**Details**:
- Mock embedding client
- Mock vector store
- Mock LLM client
- Test `retrieveContext()` with various filters
- Test `generateAnswer()` with sample context
- Test `chat()` end-to-end flow
- Test error handling
**Acceptance Criteria**:
- [ ] All methods tested
- [ ] Mocks work correctly
- [ ] Error cases tested
- [ ] Tests are maintainable

### Task 8.3: Write API Integration Tests
**File**: `backend/routes/__tests__/receipts.test.js` (new file)
**Description**: Test chat endpoint with real or mocked services.
**Details**:
- Test successful chat request
- Test validation errors
- Test rate limiting
- Test error handling
- Use Supertest or similar
- Mock RAG service if needed
**Acceptance Criteria**:
- [ ] Endpoint tests pass
- [ ] Validation tested
- [ ] Error handling tested

### Task 8.4: Manual Testing Checklist
**File**: `docs/RAG_TESTING_CHECKLIST.md` (new file)
**Description**: Create manual testing checklist for QA.
**Details**:
- Test chat with various questions
- Test filters (date range, merchant, receipt IDs)
- Test error scenarios
- Test loading states
- Test citations and links
- Test on different browsers
- Test mobile responsiveness
- Document expected behavior
**Acceptance Criteria**:
- [ ] Checklist covers all features
- [ ] Clear pass/fail criteria
- [ ] Easy to follow

## Phase 9: Deployment & Operations

### Task 9.1: Set Up MongoDB Atlas Vector Search Index
**File**: Documentation or migration script
**Description**: Create vector search index in production MongoDB Atlas.
**Details**:
- Follow MongoDB Atlas UI instructions
- Create index on `receiptChunks` collection
- Configure vector field: `embedding`
- Set dimensions: 1536 (for text-embedding-3-small)
- Include metadata fields for filtering
- Test index with sample query
- Document index configuration
**Acceptance Criteria**:
- [ ] Index created successfully
- [ ] Index works with test queries
- [ ] Configuration documented

### Task 9.2: Configure Environment Variables in Production
**File**: Railway/Netlify dashboard or deployment config
**Description**: Add RAG environment variables to production.
**Details**:
- Add `OPENAI_API_KEY` to production environment
- Add `RAG_EMBEDDINGS_MODEL` (or use default)
- Add `RAG_COMPLETIONS_MODEL` (or use default)
- Add `RAG_TOP_K` (or use default)
- Add `RAG_CHUNK_SIZE` (or use default)
- Add `RAG_VECTOR_INDEX` (or use default)
- Add `EMBEDDINGS_VERSION` (or use default)
- Verify variables are accessible to backend
**Acceptance Criteria**:
- [ ] All variables set in production
- [ ] Variables accessible to application
- [ ] Secrets are secure (not logged)

### Task 9.3: Set Up Ingestion Job Scheduling
**File**: Railway cron job, GitHub Actions, or similar
**Description**: Schedule ingestion job to run periodically.
**Details**:
- Set up cron job to run every 5-15 minutes
- Command: `pnpm --filter backend run ingest:receipts`
- Configure to run on backend server or separate worker
- Add error notifications (email, Slack, etc.)
- Monitor job execution logs
- Consider using Railway cron, GitHub Actions, or similar
**Acceptance Criteria**:
- [ ] Job runs on schedule
- [ ] Errors are logged and notified
- [ ] Job completes successfully
- [ ] Monitoring in place

### Task 9.4: Add Observability and Logging
**File**: Various backend files
**Description**: Add structured logging for RAG operations.
**Details**:
- Log embedding generation (latency, success/failure)
- Log retrieval operations (time, chunks found, filters)
- Log LLM calls (tokens used, latency, cost estimation)
- Log ingestion job runs (receipts processed, errors)
- Use structured logging (JSON format)
- Add log levels (info, warn, error)
- Consider adding metrics (Prometheus, DataDog, etc.)
**Acceptance Criteria**:
- [ ] Key operations logged
- [ ] Logs are structured and searchable
- [ ] Error logs include context
- [ ] Performance metrics tracked

### Task 9.5: Monitor Token Usage and Costs
**File**: `backend/services/ReceiptRagService.js` or separate service
**Description**: Track OpenAI API usage for cost monitoring.
**Details**:
- Log token counts for each LLM call
- Log embedding API calls (count, tokens)
- Calculate estimated costs per request
- Store usage metrics in database (optional)
- Add alerts for high usage
- Create dashboard or report (optional)
**Acceptance Criteria**:
- [ ] Token usage tracked
- [ ] Cost estimates calculated
- [ ] Alerts configured
- [ ] Usage visible in logs

## Phase 10: Documentation & Cleanup

### Task 10.1: Update API Documentation
**File**: `docs/API.md` or similar
**Description**: Document the chat endpoint and RAG features.
**Details**:
- Document `/api/receipts/chat` endpoint:
  - Request format
  - Response format
  - Query parameters
  - Filters
  - Error codes
- Add examples of requests/responses
- Document rate limits
- Document authentication requirements
**Acceptance Criteria**:
- [ ] Endpoint fully documented
- [ ] Examples provided
- [ ] Error cases documented

### Task 10.2: Create User Guide for RAG Features
**File**: `docs/USAGE.md` or similar
**Description**: Document how to use the chat feature.
**Details**:
- Explain what the chat feature does
- Show example questions
- Explain filters (date range, merchant, receipts)
- Explain citations and sources
- Troubleshooting tips
- Best practices for asking questions
**Acceptance Criteria**:
- [ ] User guide is clear
- [ ] Examples provided
- [ ] Troubleshooting included

### Task 10.3: Code Cleanup and Refactoring
**File**: Various backend files
**Description**: Clean up code, remove placeholders, add comments.
**Details**:
- Remove all placeholder code
- Add JSDoc comments to public methods
- Remove unused imports
- Fix ESLint warnings
- Improve error messages
- Add type hints (JSDoc types)
**Acceptance Criteria**:
- [ ] No placeholder code remaining
- [ ] Code is well-documented
- [ ] ESLint passes
- [ ] Code is maintainable

## Execution Order Summary

**Recommended execution order:**
1. Phase 1: Infrastructure & Configuration (Tasks 1.1-1.3)
2. Phase 2: Embedding Client (Tasks 2.1-2.2)
3. Phase 3: Vector Store (Tasks 3.1-3.3)
4. Phase 4: Chunking & Ingestion (Tasks 4.1-4.3)
5. Phase 5: RAG Service (Tasks 5.1-5.3)
6. Phase 6: API Integration (Tasks 6.1-6.3)
7. Phase 7: Frontend Updates (Tasks 7.1-7.5)
8. Phase 8: Testing (Tasks 8.1-8.4)
9. Phase 9: Deployment (Tasks 9.1-9.5)
10. Phase 10: Documentation (Tasks 10.1-10.3)

**Note**: Some tasks can be done in parallel (e.g., frontend tasks while backend is being tested). Adjust order based on dependencies and priorities.

## Dependencies Between Tasks

- **Task 2.1** depends on **Task 1.2** (env vars)
- **Task 3.1** can be done independently
- **Task 3.2** depends on **Task 3.1** (collection exists)
- **Task 3.3** depends on **Task 3.2** (index exists) and **Task 2.1** (embedding client)
- **Task 4.1** can be done independently
- **Task 4.2** depends on **Task 4.1**, **Task 2.1**, **Task 3.3**, and **Task 1.3**
- **Task 5.1** depends on **Task 2.1** and **Task 3.3**
- **Task 5.2** depends on **Task 2.2**
- **Task 5.3** depends on **Task 5.1** and **Task 5.2**
- **Task 6.1** depends on **Task 5.3**
- **Task 7.x** depends on **Task 6.1** (API ready)

## Estimated Effort

- **Phase 1**: 2-4 hours
- **Phase 2**: 4-6 hours
- **Phase 3**: 6-8 hours
- **Phase 4**: 6-8 hours
- **Phase 5**: 8-10 hours
- **Phase 6**: 4-6 hours
- **Phase 7**: 8-12 hours
- **Phase 8**: 6-8 hours
- **Phase 9**: 4-6 hours
- **Phase 10**: 2-4 hours

**Total Estimated Effort**: 50-72 hours

## Notes

- Start with Phase 1-3 to get infrastructure in place
- Test each phase before moving to the next
- Consider implementing a minimal version first (MVP) and iterating
- Monitor costs closely during development and testing
- Keep backups of working states before major changes

