# 🕵️‍♂️ SovereignLM

Privacy-first deep-research agent that runs entirely on your machine. The stack is Parallax-first: we expect a Parallax-served model on your local network (single box or distributed layers) and treat any OpenAI-compatible endpoint as a fallback. The FastAPI backend (ChromaDB + Parallax/OpenAI client) pairs with a Vite/React/Tailwind frontend that streams reasoning steps, citations, and status updates.

## ✨ What you get

- Parallax-native LLM calls for fully local inference, with multi-host layer-splitting when you want to distribute a big model across boxes.
- Streaming ReAct-style investigation with status logs, thoughts, and evidence snippets.
- Local vector index (ChromaDB) built from your PDFs/text/CSV files.
- Document upload with optional auto-reindexing.
- Frontend sidebar to view documents, trigger reindex, and upload.

## 🧱 Architecture

- Backend: FastAPI + ChromaDB + Parallax-first OpenAI-compatible client (works with vanilla OpenAI/Ollama if needed).
- Agent loop: regulated ReAct prompt with search tool backed by Chroma embeddings.
- Frontend: Vite + React + Tailwind CSS + Framer Motion, consuming SSE from `/api/investigate`.

## 📦 Requirements

- Python 3.10+
- Node.js 18+
- Local LLM endpoint that speaks the OpenAI chat protocol (ideally Parallax, also works with vLLM/Ollama with an OpenAI bridge).

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

### Parallax backend (local or distributed)

Parallax is the default path for running the LLM locally. You can keep everything on one host or split layers across multiple machines on your LAN/Wi-Fi to fit larger models.

Install Parallax:

```bash
git clone https://github.com/GradientHQ/parallax.git
cd parallax
pip install -e '.[gpu]'  # or '.[mac]' for Apple Silicon
```

Single-machine launch (example):

```bash
python3 ./src/parallax/launch.py \
  --model-path path/to/Qwen/Qwen2-72B-AWQ \
  --port 3000 \
  --max-batch-size 1 \
  --host 0.0.0.0
```

Distributed launch (split layers across two boxes on your local network):

```bash
# Mac / MLX (early layers)
python3 ./src/parallax/launch.py \
  --model-path path/to/Qwen/Qwen3-32B-MLX-4bit \
  --port 3000 \
  --max-batch-size 1 \
  --start-layer 0 \
  --end-layer 32 \
  --host 0.0.0.0

# Linux or WSL (later layers)
python3 ./src/parallax/launch.py \
  --model-path path/to/Qwen/Qwen3-32B-AWQ \
  --port 3000 \
  --max-batch-size 1 \
  --start-layer 32 \
  --end-layer 64 \
  --dtype float16 \
  --host 0.0.0.0
```

Point the app at your Parallax coordinator in `.env` (`LLM_BASE_URL=http://<parallax-host>:3000/v1`, `LLM_MODE=PARALLAX`), then start the backend:

```bash
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
