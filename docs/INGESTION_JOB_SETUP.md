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
Add a workflow similar to:

```yaml
name: receipt-ingestion
on:
  schedule:
    - cron: '*/15 * * * *'
  workflow_dispatch:

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - run: pnpm install --filter backend...
      - run: pnpm --filter backend run ingest:receipts
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          # include other RAG env vars
```

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


