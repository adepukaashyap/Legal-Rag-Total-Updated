import os
import numpy as np
import faiss
import pandas as pd

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document


# ============================================================
# Base Directory
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)


# ============================================================
# File Paths
# ============================================================

CSV_PATH = os.path.join(
    BASE_DIR,
    "constitution.csv"
)

INDEX_PATH = os.path.join(
    BASE_DIR,
    "constitution.index"
)

DOCUMENTS_PATH = os.path.join(
    BASE_DIR,
    "documents.npy"
)


# ============================================================
# Load Constitution CSV
# ============================================================

df = pd.read_csv(
    CSV_PATH
)

documents = []


# ============================================================
# Create Documents
# ============================================================

for _, row in df.iterrows():

    article_id = str(
        row["article_id"]
    )

    article_desc = str(
        row["article_desc"]
    )

    # IMPORTANT:
    # Include article_id inside the text that gets embedded.
    # This improves retrieval for queries such as
    # "What is Article 21?"
    article_text = (
        f"{article_id}\n"
        f"{article_desc}"
    )

    documents.append(
        Document(
            page_content=article_text,
            metadata={
                "article_id": article_id
            }
        )
    )


# ============================================================
# Text Chunking
# ============================================================

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=128
)

documents = text_splitter.split_documents(
    documents
)

print(
    "Documents:",
    len(documents)
)


# ============================================================
# Load Embedding Model
# ============================================================

embedding_model = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


# ============================================================
# Generate Document Embeddings
# ============================================================

document_texts = [
    doc.page_content
    for doc in documents
]

document_embeddings = (
    embedding_model.embed_documents(
        document_texts
    )
)


# ============================================================
# Convert to NumPy
# ============================================================

embeddings_np = np.array(
    document_embeddings
).astype(
    "float32"
)


# ============================================================
# Normalize Embeddings
# ============================================================

faiss.normalize_L2(
    embeddings_np
)


# ============================================================
# Create FAISS Index
# ============================================================

index = faiss.IndexFlatIP(
    embeddings_np.shape[1]
)

index.add(
    embeddings_np
)


# ============================================================
# Save FAISS Index
# ============================================================

faiss.write_index(
    index,
    INDEX_PATH
)


# ============================================================
# Save Documents
# ============================================================

document_data = np.array(
    [
        {
            "page_content": doc.page_content,
            "article_id": doc.metadata[
                "article_id"
            ]
        }
        for doc in documents
    ],
    dtype=object
)

np.save(
    DOCUMENTS_PATH,
    document_data,
    allow_pickle=True
)


# ============================================================
# Completion
# ============================================================

print(
    "FAISS index saved successfully"
)

print(
    "Index:",
    INDEX_PATH
)

print(
    "Documents:",
    DOCUMENTS_PATH
)