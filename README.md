# RAG for Legal Question Answering and Summarization

This project explores the implementation of a Retrieval-Augmented Generation (RAG) system for answering Indian constitutional legal queries. The architecture combines semantic retrieval and generative modeling to ensure accurate, context-aware responses grounded in authoritative legal texts.

## 📄 Project Overview

**Objective:**  
Develop a question-answering system that retrieves relevant legal content (from the Indian Constitution) and generates precise, contextually appropriate answers.

**Key Features:**
- Retrieval of relevant articles using dense embeddings (Sentence Transformers)
- Answer generation using Qwen-3 4B language model
- User authentication (login/signup)
- Query history tracking
- Responsive frontend for ease of use

**Technologies Used:**
- **Backend:** Python (Flask), MongoDB, FAISS
- **Frontend:** HTML, CSS, JavaScript
- **LLM:** Qwen-3 4B
- **Embedding Model:** all-MiniLM-L6-v2
- **Deployment:** Google Colab + Ngrok, Frontend hosted on Netlify/GitHub Pages

## 🏛️ Architecture

The system is structured into three layers:
- **Frontend Tier:** User interface (login/signup, query input, answer display).
- **Backend Tier:** API logic, authentication, retrieval pipeline.
- **Model Tier:** Retriever (FAISS) and Qwen-based answer generator.


## 💡 How it Works

1. **User Query:** User submits a legal question via the frontend.
2. **Retrieval:** The system retrieves the most relevant constitutional text chunks using embeddings.
3. **Generation:** Qwen-3 4B generates a contextually relevant answer based on the retrieved passages.
4. **Response:** The answer is displayed to the user, along with references to the source articles.

