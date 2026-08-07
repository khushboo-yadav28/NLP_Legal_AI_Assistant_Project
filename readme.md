# Legal AI Assistant India ⚖️🤖

An intelligent, full-stack Legal AI Assistant designed to help ordinary citizens understand complex Indian legal documents, statutes, contracts, and court procedures in plain, accessible language.

The system utilizes a **Hybrid RAG (Retrieval-Augmented Generation)** architecture powered by **FastAPI**, **Google Gemini 3.5 Flash**, **Dense Vector Embeddings**, and **Cross-Encoder Reranking**, featuring a responsive **React** frontend with real-time **Server-Sent Events (SSE) streaming**.

---

## 🌟 Key Features

* **Smart Legal Document QA:** Ask about complex legal texts (Acts, Employment Agreements, Consumer Protection Laws, IT Act, etc.).
* **Hybrid Retrieval & Reranking:** Combines vector similarity search with a Cross-Encoder reranker (`BAAI/bge-reranker-large` / `ms-marco-MiniLM`) to guarantee high-precision legal context retrieval.
* **Domain Guardrails & Noise Filtering:** Automatically rejects off-topic queries (e.g., cooking, drawing) and filters out low-confidence context to eliminate source hallucination.
* **Low-Latency SSE Streaming:** Delivers fast Time-To-First-Token (TTFT) via Server-Sent Events, ensuring a seamless chat experience.
* **Multi-Turn Chat History:** Maintains conversation context across multiple turns using SQLAlchemy database persistence.
* **Source Attribution:** Dynamically cites specific source PDF documents utilized during response generation.

---

## 🏗️ Tech Stack & Architecture

### **Backend**
* **Framework:** FastAPI (Python 3.10+)
* **Database:**  PostgreSQL with SQLAlchemy ORM
* **Vector Database:**  PGVector(Postgres Extension)
* **LLM Client:** Google Gemini API (`gemini-2.5-flash`)
* **Embeddings & Reranking:** Hugging Face `SentenceTransformers` & `CrossEncoder`
* **Streaming:** Server-Sent Events (`StreamingResponse`)

### **Frontend**
* **Framework:** React.js (Vite / Create React App)
* **HTTP & Streaming:** EventSource API / Fetch API

---

## 📁 Repository Structure

```text
Legal-AI-Assistant/
├── backend/
│   ├── app/
│   │   ├── api/                  # FastAPI route handlers & SSE endpoints
│   │   ├── core/                 # Config & Security modules
│   │   ├── db/                   # Database models, schemas, & repositories
│   │   ├── models/               # Pydantic data models
│   │   └── rag/
│   │       ├── generation/       # Gemini LLM client & prompt builders
│   │       └── retrieval/        # Embedding models, vector search, & reranker
│   ├── data/                     # Source PDF legal documents & knowledge base
│   ├── scripts/                  # DB initialization & ingestion scripts
│   ├── requirements.txt          # Python dependencies
│   └── main.py                   # FastAPI application entry point
├── frontend/                     # React User Interface
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```
---

# 🚀 Quick Start Guide

## 📋 Prerequisites

Before running the project, make sure you have the following installed:

- **Python**: v3.10 or higher
- **Node.js**: v18.0 or higher
- **Git**
- A valid **Google Gemini API Key** (Get one from Google AI Studio)

---

# 1️⃣ Setting Up the Backend

## Step 1: Navigate to the Backend Directory

```bash
cd backend
```

---

## Step 2: Create and Activate a Virtual Environment

### Windows (PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\activate
```

### macOS/Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

## Step 3: Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Step 4: Configure Environment Variables

Create a `.env` file inside the `backend/` directory.

**backend/.env**

```env
# ===========================
# Gemini API Configuration
# ===========================

GEMINI_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-3.5-flash
LLM_TEMPERATURE=0.2
LLM_MAX_OUTPUT_TOKENS=500

# ===========================
# Database Configuration
# ===========================

DATABASE_URL=postgresql:///./legal_assistant.db

```

---

## Step 5: Initialize Database & Seed Legal Documents

Run the database initialization and ingestion scripts to process, embed, and index your legal documents.

```bash
python -m scripts.init_db
python -m scripts.seed_data
```

---

## Step 6: Start the FastAPI Backend Server

```bash
uvicorn app.main:app --reload --port 8000
```

The backend server will be available at:

- **API:** http://localhost:8000
- **Swagger Documentation:** http://localhost:8000/docs

---

# 2️⃣ Setting Up the Frontend (React)

## Step 1: Navigate to the Frontend Directory

Open a **new terminal** and run:

```bash
cd frontend
```

---

## Step 2: Install Dependencies

```bash
npm install
```

---

## Step 3: Configure Environment Variables

Create a `.env` file inside the `frontend/` directory.

**frontend/.env**

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

> **Note:** If your project uses **Create React App** instead of **Vite**, use:

```env
REACT_APP_API_BASE_URL=http://localhost:8000/api
```

---

## Step 4: Start the React Development Server

### Vite

```bash
npm run dev
```

### Create React App

```bash
npm start
```

The frontend will run at:

- **Vite:** http://localhost:5173
- **Create React App:** http://localhost:3000

---

# ⚡ API Endpoints Summary

| Method | Endpoint | Description |
|---------|----------|-------------|
| **GET** | `/api/chats/?user_id={id}` | Fetch all active chat sessions for a user |
| **POST** | `/api/chats/` | Create a new legal consultation session |
| **POST** | `/api/chats/message/stream` | Stream AI responses using Server-Sent Events (SSE) |

---

# 🔬 Performance & System Notes

## CPU vs GPU

- SentenceTransformer embeddings and Cross-Encoder reranking execute on **CPU** by default.
- For production deployments or low-latency responses (**< 1 second**), using a **CUDA-enabled GPU** is recommended.

---

## First Request Latency

The first API request may take a few additional seconds because the following models need to be loaded into memory:

- SentenceTransformers
- CrossEncoder
- Embedding Models

Subsequent requests will be significantly faster.



---

# ✅ Startup Checklist

### Backend

- [ ] Create virtual environment
- [ ] Activate virtual environment
- [ ] Install Python dependencies
- [ ] Configure `.env`
- [ ] Initialize database
- [ ] Seed legal documents
- [ ] Start FastAPI server

### Frontend

- [ ] Install Node dependencies
- [ ] Configure `.env`
- [ ] Start React development server

---

# 🌐 Local URLs

| Service | URL |
|----------|-----|
| Backend API | http://localhost:8000 |
| Swagger API Docs | http://localhost:8000/docs |
| React Frontend (Vite) | http://localhost:5173 |
| React Frontend (CRA) | http://localhost:3000 |

---

## 👥 Authors & Contributors

* **Mahak Maheshwari** – *Backend Architecture, RAG Pipeline, Embedding & Reranking Models, API Route Design & SSE Streaming Engine*
* **Khushboo Yadav** – *Frontend UI/UX Design & React Component Development*

---

## 🏫 Academic Details

* **Course:** Master of Science in Information Technology (MSc IT)
* **Subject:** Natural Language Processing (NLP)