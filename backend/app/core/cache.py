import hashlib
import json
import os
from pathlib import Path
from typing import Optional, Dict, Any

CACHE_DIR = Path(__file__).parent.parent.parent / "cache_store"
CACHE_DIR.mkdir(exist_ok=True)

class ExtractionCache:
    """
    Simple file-based cache mechanism.
    Key: MD5 hash of the PDF file content.
    Value: Extracted JSON result.
    """
    
    @staticmethod
    def get_file_hash(file_path: str) -> str:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()

    @staticmethod
    def get(file_path: str) -> Optional[Dict[str, Any]]:
        file_hash = ExtractionCache.get_file_hash(file_path)
        cache_file = CACHE_DIR / f"{file_hash}.json"
        
        if cache_file.exists():
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    # Verify metadata to ensure it's not stale logic? 
                    # For now, strict content hash is enough.
                    return data
            except Exception:
                return None
        return None

    @staticmethod
    def set(file_path: str, data: Dict[str, Any]):
        file_hash = ExtractionCache.get_file_hash(file_path)
        cache_file = CACHE_DIR / f"{file_hash}.json"
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
