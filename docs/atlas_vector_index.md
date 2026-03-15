# MongoDB Atlas Vector Search Setup

This guide documents the configuration used for receipt chunk embeddings so the Atlas Search index stays consistent across environments.

## 1. Prerequisites
- MongoDB Atlas cluster running version 7.0+ with Search enabled
- Access to the Atlas UI (Project Data Services → Browse Collections)
- The `receiptChunks` collection created once `ReceiptChunk` documents are inserted

## 2. Index Configuration

Create a **Vector Search** index (not a regular Search index) on the `receiptChunks` collection.

**Atlas UI path:** Database → Search → Create Search Index → **Vector Search** tab → JSON Editor

**Index name:** `receiptVectorIndex` (matches `ragConfig.vectorIndex`)

```jsonc
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "userId"
    },
    {
      "type": "filter",
      "path": "receiptId"
    },
    {
      "type": "filter",
      "path": "purchaseDate"
    },
    {
      "type": "filter",
      "path": "merchant"
    }
  ]
}
```

Key details:
- **Index type**: Vector Search (NOT regular Atlas Search)
- **Embedding dimension**: `1536` (for `text-embedding-3-small`)
- **Similarity metric**: `cosine`
- **Filter fields**: `userId`, `receiptId`, `purchaseDate`, `merchant` — these enable native pre-filtering in the `$vectorSearch` aggregation stage

If you change the embeddings model or index name, update `RAG_VECTOR_INDEX` and `RAG_EMBEDDINGS_MODEL` env vars accordingly.

### Atlas CLI (Optional)
```bash
atlas clusters search indexes create receiptVectorIndex \
  --clusterName <CLUSTER_NAME> \
  --db <DATABASE_NAME> \
  --collection receiptChunks \
  --type vectorSearch \
  --definition @atlas_vector_index.json
```

## 3. Testing the Index
Run an aggregation in Atlas (Collections → receiptChunks → Aggregations) or via `mongosh` to verify results:

In `mongosh`:
```javascript
use <DATABASE_NAME>;
db.receiptChunks.aggregate([
  {
    $vectorSearch: {
      index: 'receiptVectorIndex',
      queryVector: <sampleVector>,
      path: 'embedding',
      numCandidates: 150,
      limit: 5,
      filter: {
        equals: {
          path: 'userId',
          value: ObjectId('64f5c4...')
        }
      }
    }
  },
  {
    $addFields: {
      score: { $meta: 'vectorSearchScore' }
    }
  },
  {
    $project: {
      receiptId: 1,
      merchant: 1,
      purchaseDate: 1,
      score: 1
    }
  }
]);
```

Expect the aggregation to return matching chunks with `score` populated. If the stage fails, confirm:
1. The index is **Active** (not building)
2. The index type is **Vector Search** (not regular Search)
3. The field mappings match the schema

### Sample JSON Pipeline
```jsonc
[
  {
    "$vectorSearch": {
      "index": "receiptVectorIndex",
      "queryVector": [/* sample 1536-d vector */],
      "path": "embedding",
      "numCandidates": 150,
      "limit": 5,
      "filter": {
        "equals": {
          "path": "userId",
          "value": { "$oid": "64f5c4..." }
        }
      }
    }
  },
  {
    "$addFields": {
      "score": { "$meta": "vectorSearchScore" }
    }
  },
  {
    "$project": {
      "receiptId": 1,
      "merchant": 1,
      "purchaseDate": 1,
      "score": 1
    }
  }
]
```

## 4. Migration from Old `knnBeta` Index

If you previously had a Search index using the old `knnVector` / `knnBeta` format:

1. **Delete the old index** in Atlas UI (Database → Search → find `receiptVectorIndex` → Delete)
2. **Create a new index** using the Vector Search type with the JSON definition above
3. **Wait for the index to become Active** (may take a few minutes depending on data size)
4. No re-embedding needed — the vectors in your documents are unchanged

> **Note:** You cannot convert an old Search index to a Vector Search index in-place. You must delete and recreate.

## 5. Tuning `numCandidates`

The `numCandidates` parameter controls how many candidates the ANN (Approximate Nearest Neighbor) algorithm considers before returning the top results:

| `numCandidates` | Behavior | Use case |
|---|---|---|
| `= limit` | Fastest, lowest accuracy | Quick prototyping |
| `limit × 10` | Good balance (**recommended**) | Production default |
| `limit × 20+` | Highest accuracy, slower | When accuracy is critical |

Set via `RAG_NUM_CANDIDATES` env var (default: `150`).

## 6. Maintenance Notes
- When embeddings are re-generated (new `EMBEDDINGS_VERSION`), re-run the ingestion job to upsert updated vectors.
- Monitor Atlas Search metrics to keep an eye on query latency and index size.
- Backup the JSON definition in source control (`docs/atlas_vector_index.md`) for easy recreation.
