# 🕵️‍♂️ Sherlock Local

**Distributed Intelligence on Local Hardware**

Sherlock Local is a "Deep Research" agent that runs entirely on your local network. It connects to a local LLM (via Parallax or similar) to perform multi-step reasoning, document analysis, and report generation without your data ever leaving your machine.

## 🚀 Motivation
Privacy is paramount for deep research. Existing cloud-based solutions require uploading sensitive documents. Sherlock Local solves this by bringing the intelligence to your data, not the other way around.

## 🏗️ Architecture
- **Frontend**: Next.js 14 + Tailwind CSS (Apple-style Design)
- **Backend**: FastAPI (Python)
- **Agent**: ReAct Loop with ChromaDB & Local LLM

## 🛠️ Setup

1.  **Backend Setup**:
    ```bash
    # Install dependencies
    pip install -r requirements.txt
    
    # Configure API
    cp .env.example .env
    # Edit .env with your LLM settings
    
    # Run Backend
    uvicorn backend.main:app --reload --port 8000
    ```

2.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

3.  **Indexing Documents**:
    Place your files in `project_obsidian_data` and trigger indexing via the API or script:
    ```bash
    curl -X POST http://localhost:8000/api/index
    ```

## 🔒 Privacy
**Documents never leave your network.** All indexing and retrieval happens locally using ChromaDB. All inference happens on your local LLM.
