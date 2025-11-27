import asyncio
import json
from typing import Optional, List

import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .indexer import index_documents
from .LocalLM import run_investigation

app = FastAPI(title="LocalLM API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Message(BaseModel):
    role: str
    content: str

class QueryRequest(BaseModel):
    query: str
    history: Optional[List[Message]] = None

class IndexRequest(BaseModel):
    path: Optional[str] = None

@app.get("/api/documents")
def list_documents():
    import os
    doc_dir = "./documents"
    if not os.path.exists(doc_dir):
        return []
    return [f for f in os.listdir(doc_dir) if f.endswith('.pdf')]

@app.post("/api/investigate")
async def investigate(request: QueryRequest):
    from fastapi.responses import StreamingResponse
    
    async def event_generator():
        # run_investigation is a synchronous generator, so we iterate it
        # In a real async app, we might want to run this in a threadpool if it blocks
        try:
            # We need to run the synchronous generator in a way that doesn't block the event loop
            # For simplicity in this MVP, we'll iterate directly, but for heavy loads use run_in_executor
            history = []
            if request.history:
                # 只保留 role/content 字段，避免前端传递多余信息
                for m in request.history:
                    if m.role in ("user", "assistant") and m.content:
                        history.append({"role": m.role, "content": m.content})

            for event in run_investigation(request.query, history=history):
                yield f"data: {json.dumps(event)}\n\n"
                await asyncio.sleep(0.01) # Yield control briefly
            yield "data: [DONE]\n\n"
        except Exception as e:
            error_event = {"type": "status", "content": f"Error: {str(e)}"}
            yield f"data: {json.dumps(error_event)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/index")
async def trigger_index(request: IndexRequest):
    try:
        # Run indexing in background or threadpool to avoid blocking
        # For now, blocking is okay for MVP
        index_documents(request.path) if request.path else index_documents()
        return {"status": "success", "message": "Indexing complete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    reindex: bool = Form(default=True),
):
    """
    接收上传的 PDF 文件，保存到 my_documents，并可选触发重建索引。
    """
    doc_dir = "./my_documents"
    if not os.path.exists(doc_dir):
        os.makedirs(doc_dir, exist_ok=True)

    filename = file.filename or "upload.pdf"
    save_path = os.path.join(doc_dir, filename)

    try:
        with open(save_path, "wb") as f:
            f.write(await file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保存文件失败: {e}")

    if reindex:
        try:
            index_documents()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"索引失败: {e}")

    return {"status": "success", "filename": filename, "reindexed": reindex}

@app.get("/health")
def health_check():
    return {"status": "ok"}
