# SkillSwap ML Match Service

This service provides an optimized, production-ready skill matching API for SkillSwap.
It computes semantic embeddings for users' skills and returns nearest neighbors using a vector index (FAISS).

Features
- Compute embeddings using `sentence-transformers` (default: `all-MiniLM-L6-v2`).
- Local FAISS index for fast nearest-neighbor search.
- MongoDB for user metadata and persistent mapping between FAISS ids and user ids.
- FastAPI server with endpoints:
  - GET /health
  - POST /match  -> returns top-K matching users for given userId or skills lists
- Migration script to build embeddings & FAISS index from existing MongoDB users.
- Dockerfile for containerized deployment.

Why this design
- Local sentence-transformers gives low-latency, cost predictable embeddings. Option to switch to OpenAI embeddings by changing the `embeddings` module.
- FAISS provides production-grade nearest neighbor search for vector similarity.
- Decoupling as a Python microservice keeps ML code isolated and easy to scale separately from Node.js backend.

Getting started (local)

1. Configure environment variables (create `.env`):

```env
MONGO_URI=mongodb://user:pass@host:port/skillswap
MONGO_DB=skillswap
FAISS_INDEX_PATH=./data/faiss.index
EMBEDDING_MODEL=all-MiniLM-L6-v2
PORT=8001
```

2. Install dependencies (recommended inside a venv):

```bash
pip install -r requirements.txt
```

3. Create embeddings and build index from existing users:

```bash
python migrate_embeddings.py --mongo-uri "$MONGO_URI" --mongo-db "$MONGO_DB" --index-path ./data/faiss.index
```

4. Run service:

```bash
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}
```

API (example)

POST /match

Request body options:
- { "userId": "...", "top_k": 10 }  # match for existing user
- { "skillsHave": ["javascript", "react"], "skillsWant": ["node"] , "top_k": 10 }

Response:
- { matches: [ { userId, score, name?, email? }, ... ] }

Node.js integration example (Axios):

```js
const axios = require('axios');
const resp = await axios.post('http://localhost:8001/match', { userId: '...' }, { headers: { Authorization: 'Bearer <token-if-needed>' } });
console.log(resp.data);
```

Scaling notes
- For larger scale, replace FAISS storage with a managed vector DB (Pinecone, Milvus, Weaviate) and keep embeddings in persistent store.
- Use background workers (Celery/RQ) to compute embeddings asynchronously when users update skills.
- Add rate limiting and API authentication when exposing the service publicly.

Security
- Do NOT expose the migration endpoint publicly.
- Protect the API with the same auth model as your Node backend (JWT verification middleware) or network-level policies.

License
MIT
