import os
from sentence_transformers import SentenceTransformer
import numpy as np

MODEL_NAME = os.environ.get('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')

_model = None


def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def embed_texts(texts):
    """Return numpy array of embeddings (float32) for list of texts."""
    model = get_model()
    embs = model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    # normalize to unit length for cosine similarity via dot product
    norms = np.linalg.norm(embs, axis=1, keepdims=True)
    norms[norms == 0] = 1
    embs = embs / norms
    return embs.astype('float32')
