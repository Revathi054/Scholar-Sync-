"""
Migration script to compute embeddings for users in MongoDB and build a FAISS index.
Usage:
  python migrate_embeddings.py --mongo-uri <uri> --mongo-db <db> --index-path ./data/faiss.index
"""
import os
import argparse
from pymongo import MongoClient
import numpy as np
import faiss
from embeddings import embed_texts


def build_index(vectors, dim):
    index = faiss.IndexFlatIP(dim)  # inner product on normalized vectors -> cosine
    index.add(np.array(vectors).astype('float32'))
    return index


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--mongo-uri', required=True)
    parser.add_argument('--mongo-db', default='skillswap')
    parser.add_argument('--index-path', default='./data/faiss.index')
    parser.add_argument('--meta-collection', default='user_vectors')
    args = parser.parse_args()

    client = MongoClient(args.mongo_uri)
    db = client[args.mongo_db]
    users = list(db.users.find({}, { 
        'skillsOffered':1, 
        'skillsRequired':1,
        'fieldOfStudy':1,
        'researchInterests':1,
        'learningPreferences':1,
        'subjectStrengths':1,
        'academicGoals':1,
        'studyHabits':1,
        'institution':1,
        'degree':1
    }))

    texts = []
    ids = []
    for u in users:
        offered = u.get('skillsOffered', []) or []
        required = u.get('skillsRequired', []) or []
        field = u.get('fieldOfStudy', '') or ''
        research = u.get('researchInterests', []) or []
        learning = u.get('learningPreferences', []) or []
        strengths = u.get('subjectStrengths', []) or []
        goals = u.get('academicGoals', []) or []
        habits = u.get('studyHabits', []) or []
        institution = u.get('institution', '') or ''
        degree = u.get('degree', '') or ''
        
        # Create comprehensive text representation for embeddings
        text_parts = [
            f"Skills Offered: {', '.join(offered)}",
            f"Skills Required: {', '.join(required)}",
            f"Field of Study: {field}",
            f"Research Interests: {', '.join(research)}",
            f"Learning Preferences: {', '.join(learning)}",
            f"Subject Strengths: {', '.join(strengths)}",
            f"Academic Goals: {', '.join(goals)}",
            f"Study Habits: {', '.join(habits)}",
            f"Institution: {institution}",
            f"Degree: {degree}"
        ]
        text = ' | '.join(text_parts)
        texts.append(text)
        ids.append(str(u['_id']))

    print(f'Computing embeddings for {len(texts)} users...')
    if not texts:
        print('No users found. Skipping embedding computation.')
        return
    
    vectors = embed_texts(texts)

    dim = vectors.shape[1]
    os.makedirs(os.path.dirname(args.index_path) or '.', exist_ok=True)
    index = build_index(vectors, dim)
    faiss.write_index(index, args.index_path)
    print('FAISS index written to', args.index_path)

    # store metadata mapping in a collection
    meta_col = db[args.meta_collection]
    meta_col.delete_many({})
    docs = []
    for i, uid in enumerate(ids):
        docs.append({'_id': uid, 'faiss_id': i})
    if docs:
        meta_col.insert_many(docs)
    print('Metadata mapping saved to collection', args.meta_collection)


if __name__ == '__main__':
    main()
