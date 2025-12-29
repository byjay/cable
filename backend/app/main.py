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

from fastapi import UploadFile, File, Form
import shutil

@app.post("/api/upload/{ship_id}")
async def upload_file(ship_id: str, file: UploadFile = File(...)):
    """
    Upload a PDF file to the specific ship's working directory.
    """
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    ship_wd = base_dir / "wd" / ship_id
    ship_wd.mkdir(parents=True, exist_ok=True)
    
    file_path = ship_wd / file.filename
    
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        file.file.close()
        
    return {"filename": file.filename, "ship_id": ship_id, "status": "uploaded"}

@app.post("/api/extract/{ship_id}", response_model=ExtractionSummary)
async def extract_from_ship_wd(ship_id: str):
    """
    Process all files in the specific SHIP's 'wd' folder.
    """
    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    ship_wd = base_dir / "wd" / ship_id
    
    if not ship_wd.exists():
        # Try finding it in root wd if ship specific folder doesn't exist yet but root does?
        # No, enforce strict separation. 
        return ExtractionSummary(
            total_count=0,
            system_distribution={},
            potential_misses=[],
            processing_time_ms=0,
            ship_metadata={"hull_no": "N/A", "ship_type": "No Data"},
            cables=[]
        )
    
    # Get all PDF paths
    pdf_files = [str(p) for p in ship_wd.glob("*.pdf")]
    
    if not pdf_files:
         return ExtractionSummary(
            total_count=0,
            system_distribution={},
            potential_misses=[],
            processing_time_ms=0,
            ship_metadata={"hull_no": "N/A", "ship_type": "No Data"},
            cables=[]
        )
    
    # Execute Parallel Extraction
    result = parser_manager.extract_batch(pdf_files)
    
    return ExtractionSummary(
        total_count=result["total_count"],
        system_distribution=result["system_distribution"],
        potential_misses=result["potential_misses"],
        processing_time_ms=result["processing_time_ms"],
        ship_metadata=result["ship_metadata"],
        cables=result.get("cables", []) # Ensure we pass the list back
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
