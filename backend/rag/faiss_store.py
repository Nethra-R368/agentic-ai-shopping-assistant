import faiss
import numpy as np
import os
import json

INDEX_PATH = "rag/faiss_index.bin"
METADATA_PATH = "rag/faiss_metadata.json"
EMBEDDING_DIM = 384 # Dimension for 'all-MiniLM-L6-v2'

class FAISSStore:
    def __init__(self):
        self.index = None
        self.metadata = []
        self._load_index()

    def _load_index(self):
        """Loads FAISS index from disk if it exists, else creates a new one."""
        if os.path.exists(INDEX_PATH) and os.path.exists(METADATA_PATH):
            print("Loading existing FAISS index...")
            self.index = faiss.read_index(INDEX_PATH)
            with open(METADATA_PATH, 'r') as f:
                self.metadata = json.load(f)
        else:
            print("Creating new FAISS index...")
            # L2 distance index (IndexFlatL2) is simple and accurate for small datasets
            self.index = faiss.IndexFlatL2(EMBEDDING_DIM)
            self.metadata = []

    def add_vectors(self, vectors: np.ndarray, meta_list: list):
        """Add vectors and their associated metadata to the index."""
        self.index.add(vectors)
        self.metadata.extend(meta_list)
        self.save_index()

    def save_index(self):
        """Saves FAISS index to disk."""
        faiss.write_index(self.index, INDEX_PATH)
        with open(METADATA_PATH, 'w') as f:
            json.dump(self.metadata, f)
        print(f"FAISS index saved to {INDEX_PATH}")

    def search(self, query_vector: np.ndarray, k: int = 3):
        """Search for top k similar vectors."""
        if self.index.ntotal == 0:
            return []
        
        # Ensure query is 2D
        if len(query_vector.shape) == 1:
            query_vector = np.expand_dims(query_vector, axis=0)
            
        distances, indices = self.index.search(query_vector, k)
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx != -1: # -1 means no result found
                result = self.metadata[idx].copy()
                result["distance"] = float(dist)
                results.append(result)
        return results

faiss_store = FAISSStore()
