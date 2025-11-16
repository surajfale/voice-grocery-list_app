# Receipt Ingestion Job Scheduling

Use this guide to keep the `receiptEmbeddingJob` running automatically in production.

## 1. Railway Cron (Recommended)
1. Open your Railway project → **Cron Jobs** → **New Cron**.
2. Set the schedule (every 10 minutes is a good starting point):
   ```
   */10 * * * *
   ```
3. Command:
   ```
   pnpm --filter backend run ingest:receipts
   ```
4. Environment:
   - Select the backend service so it inherits the same env vars (MongoDB URI, OpenAI key, etc.).
5. Notifications (optional but encouraged):
   - Enable email or Slack webhooks for failures.

## 2. GitHub Actions Alternative
If Railway Cron isn’t available on your plan, you can run the same job on GitHub’s infrastructure. Add a workflow such as `.github/workflows/receipt-ingestion.yml`:

```yaml
name: receipt-ingestion

on:
  schedule:
    - cron: '*/15 * * * *'   # every 15 minutes (UTC)
  workflow_dispatch:         # allow manual runs from UI

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Install backend deps only
        run: |
          cd backend
          pnpm install --frozen-lockfile

      - name: Run ingestion job
        run: pnpm --filter backend run ingest:receipts
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          RAG_EMBEDDINGS_MODEL: ${{ secrets.RAG_EMBEDDINGS_MODEL || 'text-embedding-3-small' }}
          RAG_COMPLETIONS_MODEL: ${{ secrets.RAG_COMPLETIONS_MODEL || 'gpt-4o-mini' }}
          RAG_TOP_K: ${{ secrets.RAG_TOP_K || 5 }}
          RAG_CHUNK_SIZE: ${{ secrets.RAG_CHUNK_SIZE || 512 }}
          RAG_VECTOR_INDEX: ${{ secrets.RAG_VECTOR_INDEX || 'receiptVectorIndex' }}
          EMBEDDINGS_VERSION: ${{ secrets.EMBEDDINGS_VERSION || 1 }}
```

### Secret management
1. In GitHub → **Settings → Secrets and variables → Actions**, add the variables listed above.  
2. Use the same values you configured in Railway/production.  
3. For optional values (like `RAG_TOP_K`), you can hardcode defaults in the workflow instead of storing as secrets.

### Monitoring
- Every run shows up in **Actions → receipt-ingestion**.  
- Enable email/slack notifications for failed workflows.  
- Logs contain the structured `ingest.*` events emitted by the job.

### Throttling
- Update the `cron` expression to match your ingestion volume (e.g., `*/30 * * * *` for every 30 minutes).  
- Remember GitHub Actions uses UTC; adjust windows accordingly.

## 3. Monitoring & Logging
- The job now emits structured JSON logs (`ingest.*`) including durations, token estimates, and failure reasons.
- In Railway, go to **Deployments → Runtime Logs** and filter on `ingest.` to review.
- Consider forwarding logs to your preferred log sink (Datadog, Logtail, etc.).

## 4. Failure Handling
- The job continues processing remaining receipts even when individual ones fail, marking them `embeddingStatus=failed`.
- Investigate `backend/logs` or Railway logs for events like `ingest.receipt.failed`.
- To reprocess failed receipts, run:
  ```
  pnpm --filter backend run ingest:receipts -- --force
  ```

## 5. Capacity Planning
- Each run processes up to `--batch-size` (default 50). Adjust via cron command if your daily upload volume increases.
- Monitor OpenAI usage (tokens/cost) from the job logs and in your OpenAI dashboard. Increase the frequency or batch size only when token quotas allow.


