import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from embeddings import embed_texts
from pymongo import MongoClient
import faiss
import numpy as np
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.environ.get('MONGO_URI')
MONGO_DB = os.environ.get('MONGO_DB', 'skillswap')
FAISS_INDEX_PATH = os.environ.get('FAISS_INDEX_PATH', './data/faiss.index')
META_COLLECTION = os.environ.get('META_COLLECTION', 'user_vectors')

if not MONGO_URI:
    raise RuntimeError('MONGO_URI is required')

client = MongoClient(MONGO_URI)
db = client[MONGO_DB]
meta_col = db[META_COLLECTION]
users_col = db['users']

# Load FAISS index
if not os.path.exists(FAISS_INDEX_PATH):
    print('FAISS index not found at', FAISS_INDEX_PATH)
    INDEX = None
else:
    INDEX = faiss.read_index(FAISS_INDEX_PATH)
    print('Loaded FAISS index with ntotal=', INDEX.ntotal)

app = FastAPI(title='SkillSwap Match Service')

class MatchRequest(BaseModel):
    userId: Optional[str] = None
    skillsHave: Optional[List[str]] = None
    skillsWant: Optional[List[str]] = None
    top_k: Optional[int] = 10


@app.get('/health')
async def health():
    return {'ok': True, 'index_loaded': INDEX is not None}


@app.post('/match')
async def match(req: MatchRequest):
    # Determine query embedding
    if req.userId:
        meta = meta_col.find_one({'_id': req.userId})
        if not meta:
            raise HTTPException(status_code=404, detail='User embedding not found; run migration')
        faiss_id = meta.get('faiss_id')
        if faiss_id is None:
            raise HTTPException(status_code=404, detail='User mapping missing faiss_id')
        # perform search by getting vector from index
        if INDEX is None:
            raise HTTPException(status_code=500, detail='Index not loaded')
        D, I = INDEX.search(np.array([INDEX.reconstruct(faiss_id)]), req.top_k + 1)
        # I[0] includes the query itself; filter it
        ids = I[0].tolist()
        scores = D[0].tolist()
        results = []
        for idx, score in zip(ids, scores):
            # skip self
            if idx == faiss_id:
                continue
            meta_doc = meta_col.find_one({'faiss_id': int(idx)})
            if meta_doc:
                uid = meta_doc['_id']
                u = users_col.find_one({'_id': uid}, {'password':0})
                results.append({'userId': uid, 'score': float(score), 'user': {k:v for k,v in u.items() if k!='_id' }})
                if len(results) >= req.top_k:
                    break
        return {'matches': results}
    else:
        # Build text from provided skills
        if not req.skillsHave and not req.skillsWant:
            raise HTTPException(status_code=400, detail='Provide userId or skillsHave/skillsWant')
        offered = req.skillsHave or []
        wanted = req.skillsWant or []
        text = ' | '.join([', '.join(offered), ' WANT: ' + ', '.join(wanted)])
        vec = embed_texts([text])[0]
        if INDEX is None:
            raise HTTPException(status_code=500, detail='Index not loaded')
        D, I = INDEX.search(np.array([vec]), req.top_k)
        ids = I[0].tolist()
        scores = D[0].tolist()
        results = []
        for idx, score in zip(ids, scores):
            meta_doc = meta_col.find_one({'faiss_id': int(idx)})
            if meta_doc:
                uid = meta_doc['_id']
                u = users_col.find_one({'_id': uid}, {'password':0})
                results.append({'userId': uid, 'score': float(score), 'user': {k:v for k,v in u.items() if k!='_id'}})
        return {'matches': results}
