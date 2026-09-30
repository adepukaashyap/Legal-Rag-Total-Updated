import os
import re
from datetime import datetime

import numpy as np
import faiss
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from groq import Groq
from pymongo import MongoClient
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from sentence_transformers import SentenceTransformer


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MONGO_URI = os.getenv("MONGO_URI")

if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set.")

if not MONGO_URI:
    print("WARNING: MONGO_URI is not set.")


# ============================================================
# FLASK APP + CORS
# ============================================================

app = Flask(__name__)

# Allow the React/Vercel frontend and local React development server.
# This also handles browser OPTIONS preflight requests.
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Content-Type"],
    supports_credentials=False,
)


# Explicit OPTIONS response for the conversation collection route.
# This guarantees that the browser's POST preflight receives HTTP 200.
@app.route("/conversations", methods=["OPTIONS"])
def conversations_options():
    return ("", 200)


# Explicit OPTIONS response for conversation GET/DELETE routes.
@app.route("/conversations/<identifier>", methods=["OPTIONS"])
def conversation_identifier_options(identifier):
    return ("", 200)


# ============================================================
# MONGODB
# ============================================================

mongo_client = None
db = None
users_collection = None
conversations_collection = None

if MONGO_URI:
    try:
        mongo_client = MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=10000
        )

        # Force a connection check during startup.
        mongo_client.admin.command("ping")

        db = mongo_client["legal_rag"]

        users_collection = db["users"]
        conversations_collection = db["conversations"]

        print("MongoDB connected successfully.")

    except Exception as e:
        print("MongoDB connection failed:", e)


# ============================================================
# GROQ
# ============================================================

groq_client = None

if GROQ_API_KEY:
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("Groq client initialized successfully.")
    except Exception as e:
        print("Groq initialization failed:", e)


# Keep the working model used by the deployed project.
GROQ_MODEL = "qwen/qwen3.8-27b"


# ============================================================
# FAISS + EMBEDDING MODEL
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

INDEX_PATH = os.path.join(BASE_DIR, "constitution.index")
DOCUMENTS_PATH = os.path.join(BASE_DIR, "documents.npy")


faiss_index = None
documents = None
embedding_model = None


# ------------------------------------------------------------
# Load FAISS index
# ------------------------------------------------------------

try:
    if os.path.exists(INDEX_PATH):
        faiss_index = faiss.read_index(INDEX_PATH)

        print(
            f"FAISS index loaded successfully: "
            f"{faiss_index.ntotal} vectors"
        )
    else:
        print(
            f"WARNING: FAISS index not found at {INDEX_PATH}"
        )

except Exception as e:
    print("FAISS loading failed:", e)


# ------------------------------------------------------------
# Load documents
# ------------------------------------------------------------

try:
    if os.path.exists(DOCUMENTS_PATH):
        documents = np.load(
            DOCUMENTS_PATH,
            allow_pickle=True
        )

        print(
            f"Documents loaded successfully: "
            f"{len(documents)} documents"
        )
    else:
        print(
            f"WARNING: documents.npy not found at "
            f"{DOCUMENTS_PATH}"
        )

except Exception as e:
    print("Document loading failed:", e)


# ------------------------------------------------------------
# Load MiniLM ONNX embedding model
# ------------------------------------------------------------

try:
    embedding_model = SentenceTransformer(
        "sentence-transformers/all-MiniLM-L6-v2",
        backend="onnx"
    )

    print("SentenceTransformer ONNX model loaded successfully.")

except Exception as e:
    print("Embedding model loading failed:", e)


# ============================================================
# HELPERS
# ============================================================

def normalize_email(email):
    return (email or "").strip().lower()


def serialize_document(document):
    """
    Convert numpy/object documents into normal JSON-safe text.
    """
    if isinstance(document, dict):
        return document

    if hasattr(document, "page_content"):
        return {
            "text": str(document.page_content)
        }

    return {
        "text": str(document)
    }


def get_document_text(document):
    """
    Extract the actual text from documents.npy entries.
    """
    if isinstance(document, dict):
        for key in (
            "text",
            "content",
            "page_content",
            "article_desc",
            "document"
        ):
            if key in document:
                return str(document[key])

        return str(document)

    if hasattr(document, "page_content"):
        return str(document.page_content)

    return str(document)


def extract_article_number(text):
    """
    Detect article references such as:
    Article 14
    article 21
    Art. 19
    """
    if not text:
        return None

    match = re.search(
        r"\b(?:article|art\.?)\s+(\d+[A-Za-z]?)\b",
        text,
        re.IGNORECASE
    )

    if match:
        return f"Article {match.group(1)}"

    return None

def lexical_overlap_score(query, text):
    """
    Lightweight lexical relevance score.
    Measures how many important query words
    are present in the retrieved constitutional text.
    """

    query_words = set(
        re.findall(r"\b[a-zA-Z]{3,}\b", query.lower())
    )

    text_words = set(
        re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())
    )

    if not query_words:
        return 0.0

    overlap = query_words.intersection(text_words)

    return len(overlap) / len(query_words)


def topic_keyword_score(query, text):
    """
    Boost documents containing important constitutional
    topic keywords.
    """

    query_lower = query.lower()
    text_lower = text.lower()

    score = 0.0

    topic_keywords = {
        "fundamental rights": [
            "fundamental rights",
            "part iii",
            "article 12",
            "article 13",
            "article 14",
            "article 15",
            "article 16",
            "article 17",
            "article 18",
            "article 19",
            "article 20",
            "article 21",
            "article 21a",
            "article 22",
            "article 23",
            "article 24",
            "article 25",
            "article 26",
            "article 27",
            "article 28",
            "article 29",
            "article 30",
            "article 32"
        ]
    }

    for topic, keywords in topic_keywords.items():

        if topic in query_lower:

            for keyword in keywords:

                if keyword in text_lower:
                    score += 1

    return min(score / 5, 1.0)


def retrieve_context(query, top_k=5, threshold=0.20):
    """
    Retrieve relevant constitutional chunks using:
    1. Exact Article-number matching for queries like:
       "What is Article 14?"
       "Explain Article 21"
    2. FAISS semantic search for other queries.
    """

    if documents is None:
        return []

    try:
        # ---------------------------------------------------------
        # STEP 1: Check whether the query contains an Article number
        # ---------------------------------------------------------
        article_number = extract_article_number(query)

        if article_number:
            target_article = article_number

            exact_matches = []

            for index, document in enumerate(documents):
                doc_data = serialize_document(document)

                article_id = str(
                    doc_data.get("article_id", "")
                ).strip()

                # Exact article ID match
                if article_id.lower().startswith(
                   target_article.lower() + " of indian constitution"
                ):
                    exact_matches.append({
                        "score": 1.0,
                        "index": int(index),
                        "document": doc_data,
                        "text": get_document_text(document)
                    })

            # If exact article was found, return it
            if exact_matches:
                print(
                    f"EXACT ARTICLE MATCH FOUND: {target_article}"
                )

                return exact_matches[:top_k]

            print(
                f"NO EXACT ARTICLE MATCH FOUND: {target_article}"
            )

        # ---------------------------------------------------------
        # STEP 2: Fall back to normal FAISS semantic retrieval
        # ---------------------------------------------------------
        if faiss_index is None:
            return []

        if embedding_model is None:
            return []

        query_embedding = embedding_model.encode(
            [query],
            normalize_embeddings=True
        )

        query_embedding = np.asarray(
            query_embedding,
            dtype="float32"
        )

        candidate_k = min(20, len(documents))

        distances, indices = faiss_index.search(
           query_embedding,
           candidate_k
        )

        results = []

        for score, index in zip(
            distances[0],
            indices[0]
        ):
            if index < 0:
                continue

            if index >= len(documents):
                continue

            if float(score) < threshold:
                continue

            document = documents[index]
            
            text = get_document_text(document).strip()

            if len(text) < 40:
              continue

            semantic_score = float(score)

            lexical_score = lexical_overlap_score(
              query,
              text
            )

            topic_score = topic_keyword_score(
               query,
               text
            )

            final_score = (
             0.60 * semantic_score
            + 0.20 * lexical_score
            + 0.20 * topic_score
            )

            results.append({
             "score": final_score,
             "semantic_score": semantic_score,
             "lexical_score": lexical_score,
             "topic_score": topic_score,
             "index": int(index),
             "document": serialize_document(document),
             "text": text
            })

        results.sort(
         key=lambda x: x["score"],
         reverse=True
        )

        return results[:top_k]

    except Exception as e:
        print("Retrieval error:", e)
        return []


def build_context(retrieved_documents):
    """
    Build the context sent to the LLM.
    """
    if not retrieved_documents:
        return ""

    context_parts = []

    for i, item in enumerate(
        retrieved_documents,
        start=1
    ):
        context_parts.append(
            f"[Context {i}]\n"
            f"{item['text']}"
        )

    return "\n\n".join(context_parts)


def get_mode_instruction(mode):
    mode = (mode or "detailed").lower()

    if mode == "simple":
        return (
            "Explain the answer in simple, clear language "
            "for a person without legal training. Avoid "
            "unnecessary legal jargon."
        )

    if mode == "legal":
        return (
            "Provide a rigorous constitutional explanation "
            "using precise legal terminology where supported "
            "by the retrieved Constitution context."
        )

    return (
        "Provide a detailed constitutional explanation, "
        "including the relevant provision, scope, and key "
        "points where supported by the retrieved context."
    )


def generate_rag_answer(query, mode="detailed"):
    """
    Main RAG pipeline:
    Query -> MiniLM embedding -> FAISS -> context -> Groq/Qwen.
    """
    retrieved = retrieve_context(
        query,
        top_k=5,
        threshold=0.20
    )
    
    print("\n========== RAG RETRIEVAL ==========")
    print("QUERY:", query)
    print("RETRIEVED COUNT:", len(retrieved))

    for i, item in enumerate(retrieved):
        print(f"\n--- RESULT {i + 1} ---")
        print(item)

    print("===================================\n")

    if not retrieved:
        return (
            "I could not find sufficiently relevant content "
            "in the indexed Constitution data to answer this "
            "question."
        )

    context = build_context(retrieved)

    if groq_client is None:
        return (
            "The constitutional retrieval system found "
            "relevant content, but the language-generation "
            "service is currently unavailable."
        )

    mode_instruction = get_mode_instruction(mode)

    prompt = f"""
You are a constitutional question-answering assistant.

Answer ONLY from the Constitution context provided below.

Do not invent facts, articles, cases, provisions, or legal
claims that are not supported by the retrieved context.

If the context does not contain enough information to answer
the question, clearly say that the indexed Constitution
context does not contain enough information.

{mode_instruction}

User question:
{query}

Constitution context:
{context}

Answer:
""".strip()

    try:
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a careful constitutional "
                        "RAG assistant. Ground every answer "
                        "in the supplied context."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
            max_tokens=900
        )

        answer = (
            completion.choices[0].message.content
            if completion.choices
            else ""
        )

        if not answer:
            return (
                "No answer was returned by the language "
                "generation service."
            )

        return answer.strip()

    except Exception as e:
        print("Groq generation error:", e)

        return (
            "The constitutional retrieval succeeded, but "
            "answer generation is temporarily unavailable."
        )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "online",
        "service": "Legal RAG Backend",
        "faiss_loaded": faiss_index is not None,
        "documents_loaded": documents is not None,
        "embedding_model_loaded": embedding_model is not None,
        "mongodb_connected": conversations_collection is not None,
        "groq_configured": groq_client is not None
    }), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "faiss_vectors": (
            int(faiss_index.ntotal)
            if faiss_index is not None
            else 0
        ),
        "documents": (
            int(len(documents))
            if documents is not None
            else 0
        ),
        "mongodb": conversations_collection is not None,
        "groq": groq_client is not None
    }), 200


# ============================================================
# SIGNUP
# ============================================================

@app.route("/signup", methods=["POST", "OPTIONS"])
def signup():
    if request.method == "OPTIONS":
        return ("", 200)

    try:
        if users_collection is None:
            return jsonify({
                "error": "Database is not available"
            }), 503

        data = request.get_json(silent=True) or {}

        name = (data.get("name") or "").strip()
        email = normalize_email(data.get("email"))
        password = data.get("password") or ""

        if not name:
            return jsonify({
                "error": "Name is required"
            }), 400

        if not email:
            return jsonify({
                "error": "Email is required"
            }), 400

        if not password:
            return jsonify({
                "error": "Password is required"
            }), 400

        existing_user = users_collection.find_one({
           "email": email
        })

        print("================================")
        print("SIGNUP EMAIL:", repr(email))
        print("EXISTING USER:", existing_user)
        print("================================")

        if existing_user:
            return jsonify({
                "error": "An account with this email already exists"
            }), 409

        hashed_password = generate_password_hash(
            password
        )

        users_collection.insert_one({
            "name": name,
            "email": email,
            "password": hashed_password,
            "createdAt": datetime.utcnow()
        })

        return jsonify({
            "message": "Account created successfully",
            "name": name,
            "email": email
        }), 201

    except Exception as e:
        print("Signup error:", e)

        return jsonify({
            "error": "Signup failed"
        }), 500


# ============================================================
# LOGIN
# ============================================================

@app.route("/login", methods=["POST", "OPTIONS"])
def login():

    if request.method == "OPTIONS":
        return ("", 200)

    try:
        if users_collection is None:
            return jsonify({
                "error": "Database is not available"
            }), 503

        data = request.get_json(silent=True) or {}

        email = normalize_email(data.get("email"))
        password = data.get("password") or ""

        if not email or not password:
            return jsonify({
                "error": "Email and password are required"
            }), 400

        user = users_collection.find_one({
            "email": email
        })

        if not user:
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        stored_password = user.get("password", "")

        if not check_password_hash(
            stored_password,
            password
        ):
            return jsonify({
                "error": "Invalid email or password"
            }), 401

        return jsonify({
            "message": "Login successful",
            "name": user.get("name", ""),
            "email": user.get("email", "")
        }), 200

    except Exception as e:
        print("Login error:", e)

        return jsonify({
            "error": "Login failed"
        }), 500


# ============================================================
# GENERATE / RAG
# ============================================================

@app.route("/generate", methods=["POST", "OPTIONS"])
def generate():

    if request.method == "OPTIONS":
        return ("", 200)

    try:
        data = request.get_json(silent=True) or {}

        query = (data.get("query") or "").strip()
        mode = data.get("mode", "detailed")

        if not query:
            return jsonify({
                "error": "Query is required"
            }), 400

        answer = generate_rag_answer(
            query,
            mode
        )

        return jsonify({
            "answer": answer,
            "mode": mode
        }), 200

    except Exception as e:
        print("Generate error:", e)

        return jsonify({
            "error": "Failed to generate answer"
        }), 500


# ============================================================
# SAVE / UPDATE CONVERSATION
# ============================================================

@app.route("/conversations", methods=["POST", "OPTIONS"])
def save_conversation():

    if request.method == "OPTIONS":
        return ("", 200)

    try:
        if conversations_collection is None:
            return jsonify({
                "error": "Database is not available"
            }), 503

        data = request.get_json(silent=True) or {}

        email = normalize_email(data.get("email"))
        messages = data.get("messages", [])
        title = (
            data.get("title") or
            "New Conversation"
        )
        conversation_id = data.get("conversationId")

        if not email:
            return jsonify({
                "error": "Email is required"
            }), 400

        if not isinstance(messages, list) or not messages:
            return jsonify({
                "error": "Messages are required"
            }), 400

        # ----------------------------------------------------
        # UPDATE EXISTING CONVERSATION
        # ----------------------------------------------------

        if conversation_id:

            try:
                object_id = ObjectId(
                    conversation_id
                )
            except Exception:
                return jsonify({
                    "error": "Invalid conversation ID"
                }), 400

            result = conversations_collection.update_one(
                {
                    "_id": object_id,
                    "email": email
                },
                {
                    "$set": {
                        "title": title,
                        "messages": messages,
                        "updatedAt": datetime.utcnow()
                    }
                }
            )

            if result.matched_count == 0:
                return jsonify({
                    "error": "Conversation not found"
                }), 404

            return jsonify({
                "message": "Conversation updated successfully",
                "conversationId": conversation_id
            }), 200

        # ----------------------------------------------------
        # CREATE NEW CONVERSATION
        # ----------------------------------------------------

        now = datetime.utcnow()

        conversation = {
            "email": email,
            "title": title,
            "messages": messages,
            "createdAt": now,
            "updatedAt": now
        }

        result = conversations_collection.insert_one(
            conversation
        )

        return jsonify({
            "message": "Conversation saved successfully",
            "conversationId": str(
                result.inserted_id
            )
        }), 201

    except Exception as e:
        print("Error saving conversation:", e)

        return jsonify({
            "error": "Failed to save conversation"
        }), 500


# ============================================================
# GET USER CONVERSATIONS
# DELETE USER CONVERSATION
#
# IMPORTANT:
# Both operations intentionally use ONE dynamic route.
# This avoids the Flask route conflict between:
# /conversations/<email>
# /conversations/<conversation_id>
# ============================================================

@app.route(
    "/conversations/<identifier>",
    methods=["GET", "DELETE", "OPTIONS"]
)
def conversation_by_identifier(identifier):

    # --------------------------------------------------------
    # OPTIONS / PREFLIGHT
    # --------------------------------------------------------

    if request.method == "OPTIONS":
        return ("", 200)

    # --------------------------------------------------------
    # GET USER CONVERSATIONS
    # --------------------------------------------------------

    if request.method == "GET":

        try:
            if conversations_collection is None:
                return jsonify({
                    "error": "Database is not available"
                }), 503

            email = normalize_email(identifier)

            if not email:
                return jsonify({
                    "error": "Email is required"
                }), 400

            conversations = list(
                conversations_collection.find(
                    {
                        "email": email
                    }
                ).sort(
                    "updatedAt",
                    -1
                )
            )

            for conversation in conversations:
                conversation["_id"] = str(
                    conversation["_id"]
                )

            return jsonify({
                "conversations": conversations
            }), 200

        except Exception as e:
            print(
                "Error loading conversations:",
                e
            )

            return jsonify({
                "error": "Failed to load conversations"
            }), 500

    # --------------------------------------------------------
    # DELETE CONVERSATION
    # --------------------------------------------------------

    if request.method == "DELETE":

        try:
            if conversations_collection is None:
                return jsonify({
                    "error": "Database is not available"
                }), 503

            conversation_id = identifier

            try:
                object_id = ObjectId(
                    conversation_id
                )
            except Exception:
                return jsonify({
                    "error": "Invalid conversation ID"
                }), 400

            # The frontend sends the user's email as a query
            # parameter when available:
            # DELETE /conversations/<id>?email=user@example.com
            #
            # If email is supplied, enforce ownership.
            email = normalize_email(
                request.args.get("email")
            )

            if email:
                result = conversations_collection.delete_one(
                    {
                        "_id": object_id,
                        "email": email
                    }
                )
            else:
                # Backward-compatible deletion for the current
                # frontend. The ID is random MongoDB ObjectId.
                result = conversations_collection.delete_one(
                    {
                        "_id": object_id
                    }
                )

            if result.deleted_count == 0:
                return jsonify({
                    "error": "Conversation not found"
                }), 404

            return jsonify({
                "message": "Conversation deleted successfully"
            }), 200

        except Exception as e:
            print(
                "Error deleting conversation:",
                e
            )

            return jsonify({
                "error": "Failed to delete conversation"
            }), 500

    return jsonify({
        "error": "Method not allowed"
    }), 405


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "Endpoint not found"
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        "error": "Method not allowed"
    }), 405


@app.errorhandler(500)
def internal_server_error(error):
    return jsonify({
        "error": "Internal server error"
    }), 500


# ============================================================
# LOCAL DEVELOPMENT
# ============================================================

if __name__ == "__main__":
    port = int(
        os.environ.get(
            "PORT",
            5000
        )
    )

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
