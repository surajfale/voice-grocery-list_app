# MongoDB Atlas Vector Search Setup

This guide documents the configuration used for receipt chunk embeddings so the Atlas Search index stays consistent across environments.

## 1. Prerequisites
- MongoDB Atlas cluster running version 7.0+ with Search enabled
- Access to the Atlas UI (Project Data Services → Browse Collections)
- The `receiptChunks` collection created once `ReceiptChunk` documents are inserted

## 2. Index Configuration
Create a **Search** index on the `receiptChunks` collection with the following JSON definition (Atlas UI → Search → Create Search Index → JSON Editor or `atlas clusters search indexes create` CLI command):

```jsonc
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1536,
        "similarity": "cosine"
      },
      "userId": { "type": "objectId" },
      "receiptId": { "type": "objectId" },
      "purchaseDate": { "type": "string" },
      "merchant": { "type": "string" },
      "items": { "type": "string" },
      "total": { "type": "number" }
    }
  }
}
```

Key details:
- Index name: `receiptVectorIndex` (matches `ragConfig.vectorIndex`)
- Embedding dimension: `1536` (defaults to `text-embedding-3-small`)
- Similarity metric: `cosine`

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
    $search: {
      index: 'receiptVectorIndex',
      knnBeta: {
        vector: <sampleVector>,
        path: 'embedding',
        k: 5
      },
      filter: {
        equals: {
          path: 'userId',
          value: ObjectId('64f5c4...')
        }
      }
    }
  },
  { $limit: 5 },
  { $project: { receiptId: 1, merchant: 1, purchaseDate: 1, score: { $meta: 'searchScore' } } }
]);
```
- When embeddings are re-generated (new `EMBEDDINGS_VERSION`), re-run the ingestion job to upsert updated vectors.
- Monitor Atlas Search metrics to keep an eye on query latency and index size.
- Backup the JSON definition in source control (`docs/atlas_vector_index.md`) for easy recreation.

```jsonc
[
  {
    "$search": {
      "index": "receiptVectorIndex",
      "knnBeta": {
        "vector": [/* sample 1536-d vector */],
        "path": "embedding",
        "k": 5
      },
      "filter": {
        "equals": {
          "path": "userId",
          "value": { "$oid": "64f5c4..." }
        }
      }
    }
  },
  { "$limit": 5 },
  {
    "$project": {
      "receiptId": 1,
      "merchant": 1,
      "purchaseDate": 1,
      "score": { "$meta": "searchScore" }
    }
  }
]
```

Expect the aggregation to return matching chunks with `score` populated. If the stage fails, confirm the index is built and the field mapping matches the schema.

## 4. Maintenance Notes
- When embeddings are re-generated (new `EMBEDDINGS_VERSION`), re-run the ingestion job to upsert updated vectors.
- Monitor Atlas Search metrics to keep an eye on query latency and index size.

