
import os
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, BinaryIO

class IStorageService(ABC):
    """Abstract Base Class for Storage Services"""
    
    @abstractmethod
    def save_file(self, ship_id: str, filename: str, file_obj: BinaryIO) -> str:
        """Save file and return the path/uri"""
        pass

    @abstractmethod
    def list_files(self, ship_id: str) -> List[str]:
        """List all file paths/uris for a ship"""
        pass
    
    @abstractmethod
    def get_file_path(self, ship_id: str, filename: str) -> str:
        """Get accessible path or download to temp path"""
        pass

class LocalStorageService(IStorageService):
    def __init__(self, base_dir: Path):
        self.base_dir = base_dir / "wd"
        self.base_dir.mkdir(exist_ok=True)
    
    def save_file(self, ship_id: str, filename: str, file_obj: BinaryIO) -> str:
        ship_wd = self.base_dir / ship_id
        ship_wd.mkdir(parents=True, exist_ok=True)
        file_path = ship_wd / filename
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file_obj, buffer)
            
        return str(file_path)

    def list_files(self, ship_id: str) -> List[str]:
        ship_wd = self.base_dir / ship_id
        if not ship_wd.exists():
            return []
        return [str(p) for p in ship_wd.glob("*.pdf")] + [str(p) for p in ship_wd.glob("*.xlsx")]
    
    def get_file_path(self, ship_id: str, filename: str) -> str:
        return str(self.base_dir / ship_id / filename)

class GCSStorageService(IStorageService):
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        # Late import to avoid hard dependency if not used
        from google.cloud import storage
        self.client = storage.Client()
        self.bucket = self.client.bucket(bucket_name)

    def save_file(self, ship_id: str, filename: str, file_obj: BinaryIO) -> str:
        blob_name = f"{ship_id}/{filename}"
        blob = self.bucket.blob(blob_name)
        blob.upload_from_file(file_obj)
        return f"gs://{self.bucket_name}/{blob_name}"

    def list_files(self, ship_id: str) -> List[str]:
        blobs = self.client.list_blobs(self.bucket_name, prefix=f"{ship_id}/")
        # For parser compatibility, we might need to download them or handle gs:// paths
        # But Parser expects a file path. 
        # Strategy: Return gs:// URIs, and let get_file_path handle download.
        return [f"gs://{self.bucket_name}/{blob.name}" for blob in blobs]

    def get_file_path(self, ship_id: str, filename: str) -> str:
        # Check if it's already a full URI or just filename
        blob_name = f"{ship_id}/{filename}"
        if filename.startswith("gs://"):
             # extract blob name from URI
             blob_name = filename.replace(f"gs://{self.bucket_name}/", "")
        
        # Download to a temporary location for processing
        temp_dir = Path("/tmp/seastar_cache") / ship_id
        temp_dir.mkdir(parents=True, exist_ok=True)
        local_path = temp_dir / Path(blob_name).name
        
        # Simple cache: if exists, skip download? (Risk of staleness)
        # For security, better to always fresh download or check md5.
        # For MVP: overwrite.
        blob = self.bucket.blob(blob_name)
        blob.download_to_filename(str(local_path))
        
        return str(local_path)

def get_storage_service() -> IStorageService:
    bucket_name = os.getenv("BUCKET_NAME")
    if bucket_name:
        print(f"[Storage] Initializing GCS Storage (Bucket: {bucket_name})")
        return GCSStorageService(bucket_name)
    else:
        # Fallback to local
        base_path = Path(__file__).resolve().parent.parent.parent.parent
        print(f"[Storage] Initializing Local Storage (Path: {base_path}/wd)")
        return LocalStorageService(base_path)
