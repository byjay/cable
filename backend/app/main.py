from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import shutil
import os
from pathlib import Path

from .services.parser import AdvancedCableParser
from .models.schemas import ExtractedCable, ExtractionSummary

app = FastAPI(
    title="Seastar Cable Manager API",
    description="Enterprise API for Ship Cable Engineering",
    version="3.0.0"
)

# CORS Policy configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .services.manager import ExtractionManager

parser_manager = ExtractionManager()

@app.get("/")
async def root():
    return {"message": "Seastar Cable Manager API v3.0 Online (High-Performance Mode)"}

@app.post("/api/extract/wd", response_model=ExtractionSummary)
async def extract_from_wd():
    """
    Batch process all files in the server's 'wd' (Working Directory).
    Uses Parallel Processing and Caching for maximum performance.
    """
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    wd_dir = base_dir / "wd"
    
    if not wd_dir.exists():
        raise HTTPException(status_code=404, detail="'wd' directory not found")
    
    # Get all PDF paths
    pdf_files = [str(p) for p in wd_dir.glob("*.pdf")]
    
    if not pdf_files:
        raise HTTPException(status_code=404, detail="No PDF files found")
    
    # Execute Parallel Extraction
    result = parser_manager.extract_batch(pdf_files)
    
    return ExtractionSummary(
        total_count=result["total_count"],
        system_distribution=result["system_distribution"],
        potential_misses=result["potential_misses"],
        processing_time_ms=result["processing_time_ms"],
        ship_metadata=result["ship_metadata"]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
