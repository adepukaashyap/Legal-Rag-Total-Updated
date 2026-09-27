import os
import re

from dotenv import load_dotenv

# ============================================================
# BASE DIRECTORY
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

load_dotenv(
    os.path.join(BASE_DIR, ".env")
)

# ============================================================
# IMPORTS
# ============================================================

import numpy as np
import faiss

from flask import Flask, request, jsonify
from flask_cors import CORS

from groq import Groq
from pymongo import MongoClient

from werkzeug.security import (
    generate_password_hash,
    check_password_hash
)

from sentence_transformers import SentenceTransformer

# ============================================================
# ENVIRONMENT VARIABLES
# ============================================================

GROQ_API_KEY = os.getenv(
    "GROQ_API_KEY"
)

MONGO_URI = os.getenv(
    "MONGO_URI"
)

if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY is not set"
    )

if not MONGO_URI:
    raise ValueError(
        "MONGO_URI is not set"
    )

# ============================================================
# FILE PATHS
# ============================================================

INDEX_PATH = os.path.join(
    BASE_DIR,
    "constitution.index"
)

DOCUMENTS_PATH = os.path.join(
    BASE_DIR,
    "documents.npy"
)

# ============================================================
# GROQ
# ============================================================

groq_client = Groq(
    api_key=GROQ_API_KEY
)

# ============================================================
# MONGODB
# ============================================================

mongo_client = MongoClient(
    MONGO_URI
)

db = mongo_client[
    "legal_rag"
]

users_collection = db[
    "users"
]

# ============================================================
# LOAD FAISS INDEX
# ============================================================

if not os.path.exists(
    INDEX_PATH
):
    raise FileNotFoundError(
        f"FAISS index not found: {INDEX_PATH}"
    )

if not os.path.exists(
    DOCUMENTS_PATH
):
    raise FileNotFoundError(
        f"Documents file not found: {DOCUMENTS_PATH}"
    )

index = faiss.read_index(
    INDEX_PATH
)

documents = np.load(
    DOCUMENTS_PATH,
    allow_pickle=True
)

print(
    "FAISS index loaded successfully"
)

print(
    "FAISS vectors:",
    index.ntotal
)

print(
    "Documents:",
    len(documents)
)

# ============================================================
# LOAD EMBEDDING MODEL
# ============================================================

embedding_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2",
    backend="onnx"
)

print(
    "Embedding model loaded successfully"
)

# ============================================================
# RAG QUERY PROCESSING
# ============================================================

def process_rag_query(
    user_query
):

    print(
        "\n========== RETRIEVAL DEBUG =========="
    )

    print(
        "QUERY:",
        user_query
    )

    relevant_chunks = []

    # ========================================================
    # 1. DETECT ARTICLE NUMBER
    # ========================================================

    article_match = re.search(
        r"\barticle\s+(\d+[A-Za-z]?)\b",
        user_query,
        re.IGNORECASE
    )

    if article_match:

        requested_article = (
            article_match.group(1)
        )

        print(
            "Detected Article:",
            requested_article
        )

        # Example:
        # Article 21
        # Article 21A
        target = (
            f"Article {requested_article}"
        ).lower()

        # ====================================================
        # DIRECT ARTICLE RETRIEVAL
        # ====================================================

        for document in documents:

            article_id = str(
                document[
                    "article_id"
                ]
            )

            # Exact beginning match.
            #
            # This prevents:
            # Article 21
            # from accidentally matching:
            # Article 210
            #
            if article_id.lower().startswith(
                target
            ):

                # Additional boundary check
                remainder = article_id[
                    len(target):
                ]

                if (
                    remainder == ""
                    or not remainder[0].isdigit()
                ):

                    print(
                        "Direct match found:",
                        article_id
                    )

                    print(
                        "Text:",
                        document[
                            "page_content"
                        ]
                    )

                    relevant_chunks.append(
                        document[
                            "page_content"
                        ]
                    )

                    break

    # ========================================================
    # 2. FALLBACK TO FAISS
    # ========================================================

    if not relevant_chunks:

        print(
            "No direct Article match."
        )

        print(
            "Using FAISS semantic search..."
        )

        query_embedding = (
            embedding_model.encode(
                user_query,
                convert_to_numpy=True
            )
        )

        query_embedding_np = np.array(
            [query_embedding],
            dtype="float32"
        )

        # Normalize query vector
        faiss.normalize_L2(
            query_embedding_np
        )

        # Search top 5
        D, I = index.search(
            query_embedding_np,
            k=5
        )

        for score, idx in zip(
            D[0],
            I[0]
        ):

            if idx < 0:
                continue

            article_id = documents[
                idx
            ][
                "article_id"
            ]

            text = documents[
                idx
            ][
                "page_content"
            ]

            print(
                "--------------------------------"
            )

            print(
                "Score:",
                float(score)
            )

            print(
                "Index:",
                int(idx)
            )

            print(
                "Article:",
                article_id
            )

            print(
                "Text:",
                text
            )

            # Current threshold
            if score >= 0.20:

                relevant_chunks.append(
                    text
                )

    print(
        "=====================================\n"
    )

    # ========================================================
    # 3. NO RELEVANT CONTEXT
    # ========================================================

    if not relevant_chunks:

        return {
            "answer":
                "No relevant Constitution content was retrieved."
        }

    # ========================================================
    # 4. BUILD CONTEXT
    # ========================================================

    context = "\n\n".join(
        relevant_chunks
    )

    print(
        "CONTEXT SENT TO QWEN:"
    )

    print(
        context
    )

    # ========================================================
    # 5. SYSTEM PROMPT
    # ========================================================

    system_prompt = (
        "You are a legal assistant. "
        "Answer the user's question ONLY using "
        "the provided context from the Constitution "
        "of India. "
        "Do not use information outside the provided "
        "context. "
        "Do not claim that the context is missing "
        "when the answer is present in the context. "
        "Give the direct legal answer in a formal "
        "and concise manner.\n\n"
        "CONTEXT:\n"
        f"{context}"
    )

    # ========================================================
    # 6. QWEN THROUGH GROQ
    # ========================================================

    response = (
        groq_client
        .chat
        .completions
        .create(

            model="qwen/qwen3.8-27b",

            messages=[
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_query
                }
            ],

            temperature=0.4,

            max_completion_tokens=200,

            reasoning_effort="none"
        )
    )

    # ========================================================
    # 7. GET GENERATED ANSWER
    # ========================================================

    generated_text = (
        response
        .choices[0]
        .message
        .content
    )

    return {
        "answer":
            generated_text.strip()
    }


# ============================================================
# FLASK APP
# ============================================================

app = Flask(
    __name__
)

# ============================================================
# CORS
# ============================================================

CORS(
    app,
    resources={
        r"/*": {
            "origins": "*"
        }
    }
)

# ============================================================
# GENERATE ROUTE
# ============================================================

@app.route(
    "/generate",
    methods=["POST"]
)
def generate():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "error":
                    "Request body is required"
            }), 400

        query = data.get(
            "query",
            ""
        )

        if not query.strip():

            return jsonify({
                "error":
                    "Query is required"
            }), 400

        result = process_rag_query(
            query
        )

        return jsonify(
            result
        ), 200

    except Exception as e:

        import traceback

        traceback.print_exc()

        return jsonify({
            "error":
                str(e)
        }), 500


# ============================================================
# SIGNUP ROUTE
# ============================================================

@app.route(
    "/signup",
    methods=["POST"]
)
def signup():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "error":
                    "Request body is required"
            }), 400

        name = data.get(
            "name",
            ""
        )

        email = data.get(
            "email",
            ""
        )

        password = data.get(
            "password",
            ""
        )

        if not email or not password:

            return jsonify({
                "error":
                    "Email and password are required"
            }), 400

        # Check existing user
        existing_user = (
            users_collection.find_one(
                {
                    "email": email
                }
            )
        )

        if existing_user:

            return jsonify({
                "error":
                    "User already exists"
            }), 409

        # Hash password
        hashed_password = (
            generate_password_hash(
                password
            )
        )

        # Save user
        users_collection.insert_one(
            {
                "name": name,
                "email": email,
                "password": hashed_password
            }
        )

        return jsonify({
            "message":
                "Signup successful"
        }), 201

    except Exception as e:

        import traceback

        traceback.print_exc()

        return jsonify({
            "error":
                str(e)
        }), 500


# ============================================================
# LOGIN ROUTE
# ============================================================

@app.route(
    "/login",
    methods=["POST"]
)
def login():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "error":
                    "Request body is required"
            }), 400

        email = data.get(
            "email",
            ""
        )

        password = data.get(
            "password",
            ""
        )

        if not email or not password:

            return jsonify({
                "error":
                    "Email and password are required"
            }), 400

        # Find user
        user = (
            users_collection.find_one(
                {
                    "email": email
                }
            )
        )

        if not user:

            return jsonify({
                "error":
                    "Invalid email or password"
            }), 401

        # Verify password
        if not check_password_hash(
            user["password"],
            password
        ):

            return jsonify({
                "error":
                    "Invalid email or password"
            }), 401

        return jsonify({

            "message":
                "Login successful",

            "user": {

                "name":
                    user.get(
                        "name",
                        ""
                    ),

                "email":
                    user["email"]
            }

        }), 200

    except Exception as e:

        import traceback

        traceback.print_exc()

        return jsonify({
            "error":
                str(e)
        }), 500


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    app.run(

        host="0.0.0.0",

        port=int(
            os.environ.get(
                "PORT",
                5000
            )
        )
    )