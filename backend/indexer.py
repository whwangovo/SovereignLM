import os

import chromadb
import PyPDF2
from chromadb.utils import embedding_functions

from .config import DB_PATH, DOCS_PATH


def index_documents(folder_path=DOCS_PATH):
    print(f"📂 Scanning for documents in {folder_path}...")
    
    # Ensure directory exists
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        print(f"Created directory: {folder_path}")
        return

    # Use a lightweight local embedding model
    emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    
    client = chromadb.PersistentClient(path=DB_PATH)
    
    # Get or create the collection
    collection = client.get_or_create_collection(name="sherlock_docs", embedding_function=emb_fn)

    files_indexed = 0
    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        
        # Skip directories and hidden files
        if os.path.isdir(file_path) or filename.startswith('.'):
            continue

        try:
            documents = []
            metadatas = []
            ids = []
            
            if filename.lower().endswith(".pdf"):
                print(f"📖 Reading PDF {filename}...")
                reader = PyPDF2.PdfReader(file_path)
                for i, page in enumerate(reader.pages):
                    text = page.extract_text()
                    if text:
                        documents.append(text)
                        metadatas.append({"source": filename, "page": i+1, "type": "pdf"})
                        ids.append(f"{filename}_p{i+1}")

            elif filename.lower().endswith((".txt", ".md")):
                print(f"📖 Reading Text/MD {filename}...")
                with open(file_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                    if text:
                        # For simple text files, we treat the whole file as one chunk for now
                        # Or we could split by paragraphs if needed. 
                        # Given the context, let's keep it simple: 1 file = 1 doc
                        documents.append(text)
                        metadatas.append({"source": filename, "page": 1, "type": "text"})
                        ids.append(f"{filename}_full")

            elif filename.lower().endswith(".csv"):
                print(f"📖 Reading CSV {filename}...")
                import csv
                with open(file_path, 'r', encoding='utf-8') as f:
                    reader = csv.reader(f)
                    headers = next(reader, None)
                    if headers:
                        for i, row in enumerate(reader):
                            # Format row as key-value pairs
                            row_content = ", ".join([f"{h}: {r}" for h, r in zip(headers, row)])
                            documents.append(row_content)
                            metadatas.append({"source": filename, "page": i+1, "type": "csv_row"})
                            ids.append(f"{filename}_row{i+1}")
            
            else:
                continue # Skip unsupported files

            if documents:
                # Batch add to collection
                # Check for existing IDs to avoid duplicates (optional, but good practice)
                # For simplicity in this script, we just try to add/upsert
                collection.upsert(
                    documents=documents,
                    metadatas=metadatas,
                    ids=ids
                )
                print(f"✅ Indexed {filename} ({len(documents)} chunks)")
                files_indexed += 1

        except Exception as e:
            print(f"❌ Error reading {filename}: {e}")
    
    if files_indexed == 0:
        print("⚠️ No new documents found to index.")
    else:
        print(f"🎉 Finished indexing {files_indexed} files.")

if __name__ == "__main__":
    index_documents()
