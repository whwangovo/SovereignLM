import os

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# API Configuration
PARALLAX_API_BASE = os.getenv("LLM_BASE_URL", "http://localhost:8888/v1")
PARALLAX_API_KEY = os.getenv("LLM_API_KEY", "parallax")

# Model Configuration
MODEL_NAME = os.getenv("MODEL_NAME", "Qwen/Qwen2.5-32B-Instruct-GGUF")

# Paths
DB_PATH = "./chroma_db"
DOCS_PATH = "./documents"

# Ensure documents directory exists
if not os.path.exists(DOCS_PATH):
    os.makedirs(DOCS_PATH)
