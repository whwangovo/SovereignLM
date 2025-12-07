# 🕵️‍♂️ SovereignLM

Privacy-first deep-research agent that runs entirely on your machine. It pairs a FastAPI backend (ChromaDB + local LLM via Parallax or compatible API) with a Vite/React/Tailwind frontend that streams reasoning steps, citations, and status updates.

## ✨ What you get

- Streaming ReAct-style investigation with status logs, thoughts, and evidence snippets.
- Local vector index (ChromaDB) built from your PDFs/text/CSV files.
- Document upload with optional auto-reindexing.
- Frontend sidebar to view documents, trigger reindex, and upload.

## 🧱 Architecture

- Backend: FastAPI + ChromaDB + local LLM client (OpenAI-compatible endpoint).
- Agent loop: regulated ReAct prompt with search tool backed by Chroma embeddings.
- Frontend: Vite + React + Tailwind CSS + Framer Motion, consuming SSE from `/api/investigate`.

## 📦 Requirements

- Python 3.10+
- Node.js 18+
- Local LLM endpoint that speaks the OpenAI chat protocol (e.g., Parallax, vLLM, Ollama with OpenAI bridge).

## ⚙️ Configure environment

1) Copy the example env and edit values:

```bash
cp .env.example .env
# LLM_BASE_URL=http://localhost:3000/v1
# LLM_API_KEY=your_key
# MODEL_NAME=Qwen/Qwen3-32B
# LLM_MODE=PARALLAX  # or OPENAI
```

## 🚀 Run backend

```bash
pip install -r requirements.txt
```

### Parallax backend

First, install parallax:

```
git clone https://github.com/GradientHQ/parallax.git
cd parallax
pip install -e '.[gpu]' # or pip install -e '.[mac]'
```

If it's a distributed deployment, start the service on different machines(eg. mac and wsl) on different local area networks:

```
# for Mac
python3 ./src/parallax/launch.py \
  --model-path path/to/Qwen/Qwen3-32B-MLX-4bit \
  --port 3000 \
  --max-batch-size 1 \
  --start-layer 0 \
  --end-layer 32 \
  --host 0.0.0.0

# for Linux or WSL
python3 ./src/parallax/launch.py \
  --model-path path/to/Qwen/Qwen3-32B-AWQ \
  --port 3000 \
  --max-batch-size 1 \
  --start-layer 32 \
  --end-layer 64 \
  --dtype float16 \
  --host 0.0.0.0
```

Finally, start the backend service:

```
uvicorn backend.main:app --reload --port 8000
```

### Openai backend

Simply fill in the base URL and API key in the env field.


Key directories:

- `./documents`: source docs to index (PDF, TXT/MD, CSV).
- `./my_documents`: uploaded PDFs saved here by `/api/upload`.

Indexing options:

- Manual: `python -m backend.indexer`
- API: `curl -X POST http://localhost:8000/api/index`

## 🖥️ Run frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 and start chatting.

## 🔌 API quick reference

- `GET /api/documents` — list indexed PDFs.
- `POST /api/index` — rebuild index (optional JSON body `{ "path": "./some_folder" }`).
- `POST /api/upload` — multipart upload (`file`) with optional `reindex` flag.
- `POST /api/investigate` — streaming SSE investigation; body `{ query, history }`.
- `GET /health` — simple health check.

## 🗂️ Workflow

1) Drop PDFs/TXT/CSV into `documents/` or upload via UI.
2) Click “Re-Index” in the sidebar (or call `/api/index`).
3) Ask questions in the chat; answers include citations to your local docs.

## 🔒 Privacy

All documents, embeddings, and model calls stay within your local network. The app never ships your data to a hosted service.
