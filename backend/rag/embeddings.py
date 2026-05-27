from sentence_transformers import SentenceTransformer
import numpy as np

# Load a small, fast local model for embeddings
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text: str) -> np.ndarray:
    """Generate a single embedding vector for a piece of text."""
    embedding = model.encode(text)
    return np.array(embedding).astype('float32')

def get_embeddings(texts: list) -> np.ndarray:
    """Generate embedding vectors for a list of texts."""
    embeddings = model.encode(texts)
    return np.array(embeddings).astype('float32')
