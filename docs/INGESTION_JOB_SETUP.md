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

#### Setting up GitHub Secrets (Required for Public Repositories)

Since this is a public repository, you **must** use GitHub Secrets to store sensitive credentials. Secrets are encrypted and never exposed in logs or code.

**Step-by-step setup:**

1. **Navigate to Repository Settings:**
   - Go to your repository on GitHub
   - Click **Settings** (top menu)
   - In the left sidebar, click **Secrets and variables** → **Actions**

2. **Add Required Secrets:**
   Click **New repository secret** for each of the following:

   **Required Secrets:**
   - **Name:** `MONGODB_URI`
     - **Value:** Your MongoDB Atlas connection string
     - Example: `mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
     - ⚠️ **Important:** Replace `username` and `password` with your actual credentials
  
   - **Name:** `OPENAI_API_KEY`
     - **Value:** Your OpenAI API key (starts with `sk-`)
     - Get it from: https://platform.openai.com/api-keys

   **Optional Secrets (have defaults in workflow):**
   - `RAG_EMBEDDINGS_MODEL` (default: `text-embedding-3-small`)
   - `RAG_COMPLETIONS_MODEL` (default: `gpt-4o-mini`)
   - `RAG_TOP_K` (default: `5`)
   - `RAG_CHUNK_SIZE` (default: `512`)
   - `RAG_VECTOR_INDEX` (default: `receiptVectorIndex`)
   - `EMBEDDINGS_VERSION` (default: `1`)

3. **Security Best Practices:**
   - ✅ Secrets are encrypted at rest and in transit
   - ✅ Secrets are automatically masked in workflow logs (even if accidentally printed)
   - ✅ Only workflows can access secrets (not visible to collaborators or in code)
   - ✅ Use the same values you configured in Railway/production
   - ⚠️ **Never** commit secrets to the repository (even in `.env` files)
   - ⚠️ If you suspect a secret was exposed, rotate it immediately

4. **Testing Secrets:**
   - After adding secrets, manually trigger the workflow:
     - Go to **Actions** → **receipt-ingestion** → **Run workflow**
   - If secrets are missing, the workflow will fail with a clear error
   - Check workflow logs to verify the job runs successfully

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


