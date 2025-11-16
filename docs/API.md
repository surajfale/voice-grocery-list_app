# API Reference – Receipt Chat

## Overview
The backend exposes a Retrieval-Augmented Generation (RAG) endpoint at `POST /api/receipts/chat`. Use this endpoint to ask natural-language questions about uploaded receipts. Responses include grounded answers, citations, and optional metadata for UI display.

Base URL:
- Local: `http://localhost:3001/api`
- Production: `https://<railway-app>.up.railway.app/api`

## Authentication
All receipt routes require the authenticated user’s `userId` in the payload or query string. The frontend currently uses session-backed API requests, so no Bearer token is required yet. Add auth headers if/when the backend enforces JWT validation.

## Rate Limits
Two rate limiters protect the chat endpoint:
- Per-user: 20 requests per 15 minutes (`429 Too Many Requests` on exceed)
- Per-IP: 50 requests per 15 minutes

Responses include standard `RateLimit-*` headers (enabled globally) when applicable.

## POST `/api/receipts/chat`

### Request Body
```jsonc
{
  "userId": "64f5c4d2f5c4d2f5c4d2f5c5",        // required, valid Mongo ObjectId
  "question": "What did I spend on coffee?",   // required, 3-500 chars
  "receiptIds": ["..."],                       // optional, array of ObjectIds
  "dateRange": { "start": "2024-10-01", "end": "2024-10-31" }, // optional ISO dates
  "topK": 5                                    // optional, 1-25
}
```

### Response
```json
{
  "success": true,
  "answer": "You spent $42.13 at Farmer Market on Oct 1.",
  "sources": [
    {
      "receiptId": "64f5c4d2f5c4d2f5c4d2f5c7",
      "merchant": "Farmer Market",
      "purchaseDate": "2024-10-01",
      "total": 42.13,
      "score": 0.91
    }
  ],
  "contextChunks": [
    {
      "receiptId": "64f5c4d2f5c4d2f5c4d2f5c7",
      "chunkIndex": 0,
      "text": "Receipt summary — ...",
      "merchant": "Farmer Market",
      "purchaseDate": "2024-10-01",
      "total": 42.13,
      "score": 0.91
    }
  ],
  "usage": {
    "promptTokens": 512,
    "completionTokens": 128,
    "totalTokens": 640,
    "estimatedCostUsd": 0.0045
  },
  "question": "what did i spend on coffee?"
}
```

### Error Responses
| Status | Body Example | Reason |
|--------|--------------|--------|
|400|`{"success":false,"error":"Question must be at least 3 characters."}`|Validation failure (question/userId/filters)|
|400|`{"success":false,"error":"receiptIds contains an invalid id."}`|Invalid ObjectId|
|429|`{"success":false,"error":"You have reached the chat rate limit. Please wait a few minutes before trying again."}`|Rate limit exceeded|
|500|`{"success":false,"error":"Failed to process chat request. Please try again later."}`|Server failure (OpenAI, Mongo, etc.)|

### Notes
- `receiptIds` take precedence over merchant/date filters.
- `dateRange` format must be ISO (`YYYY-MM-DD`). The backend normalizes to inclusive comparisons.
- `topK` controls how many vector matches are returned; the answer typically references the top few sources.

## Other Receipt Routes
The following endpoints pre-existed but are relevant for end-to-end usage:

| Method | Endpoint | Description |
|--------|----------|-------------|
|POST|`/api/receipts`|Upload receipt image (`FormData` with `userId`, `receipt`).|
|GET|`/api/receipts/user/:userId`|List receipts for a user (newest first).|
|GET|`/api/receipts/:receiptId?userId=`|Fetch a single receipt.|
|GET|`/api/receipts/:receiptId/image?userId=`|Stream the raw upload.|
|DELETE|`/api/receipts/:receiptId?userId=`|Delete a receipt and its file.|

Each route validates `userId`/`receiptId` and responds with `{ success, data?, error? }`.

## Logging & Monitoring
Key structured log events:
- `rag.embedding.generated`: question embedding duration, tokens, estimated cost.
- `rag.retrieval.completed`: chunk counts and filters.
- `rag.llm.completed`: LLM latency, token usage, cost.
- `ingest.*`: ingestion job (batch + per-receipt) stats.

Use these to wire dashboards or alerts (e.g., Railway log drain, Datadog).


