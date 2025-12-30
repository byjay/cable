from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import shutil
import os
from pathlib import Path

from .services.parser import AdvancedCableParser
from .services.universal_parser import UniversalParser
from .services.cad_service import CADService
from .services.storage import get_storage_service
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
storage_service = get_storage_service()

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
    # Use Storage Service to save file
    # This handles Local vs Cloud abstraction
    try:
        file_path_or_uri = storage_service.save_file(ship_id, file.filename, file.file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    finally:
        file.file.close()
        
    return {"filename": file.filename, "ship_id": ship_id, "status": "uploaded"}

@app.post("/api/extract/{ship_id}", response_model=ExtractionSummary)
async def extract_from_ship_wd(ship_id: str):
    """
    Process all files in the specific SHIP's 'wd' folder.
    """
    
    # Use Storage Service to list files
    try:
        pdf_files = storage_service.list_files(ship_id)
        # Filter only PDFs? list_files already does some filtering or returns all?
        # Let's trust list_files but ensure extension check if needed.
        pdf_files = [f for f in pdf_files if f.lower().endswith(".pdf")]
    except Exception as e:
        # If storage fails (e.g. bucket access), return empty
        print(f"Storage Error: {e}")
        pdf_files = []

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
    # NOTE: parser_manager needs to handle gs:// paths if on cloud.
    # storage_service.get_file_path handles downloading if necessary.
    
    # We need to adapt parser_manager slightly or handle download here.
    # For robust architecture, let's download files to temp if they are remote
    # or ensure parser supports gs://
    
    # Currently parser expects Paths. 
    # Let's map remote URIs to local temp paths
    local_paths = []
    for uri in pdf_files:
        if uri.startswith("gs://"):
            local_paths.append(storage_service.get_file_path(ship_id, uri))
        else:
            local_paths.append(uri)
            
    result = parser_manager.extract_batch(local_paths)
    
    return ExtractionSummary(
        total_count=result["total_count"],
        system_distribution=result["system_distribution"],
        potential_misses=result["potential_misses"],
        processing_time_ms=result["processing_time_ms"],
        ship_metadata=result["ship_metadata"],
        cables=result.get("cables", []) # Ensure we pass the list back
    )

@app.post("/api/universal/upload/{ship_id}", response_model=ExtractionSummary)
async def universal_upload(
    ship_id: str,
    file: UploadFile = File(...)
):
    try:
        # Save temp file
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        parser = UniversalParser()
        data = parser.parse(temp_path)
        
        # Convert to ExtractedCable format
        cables = []
        for i, row in enumerate(data):
            try:
                # Basic validation / cleanup
                cable = ExtractedCable(
                    id=str(row.get('no', str(i+1))), # Use 'no' column if exists, else index
                    project_id=ship_id,
                    filename=file.filename,
                    valid=True,
                    
                    # Map standard fields from fuzzy parser result
                    cable_no=str(row.get('cable_name', '')),
                    system=str(row.get('system', '')),
                    cable_type=str(row.get('comp_name', '')),
                    length=str(row.get('length', '')),
                    
                    # Routing
                    from_node=str(row.get('from_node', '')),
                    to_node=str(row.get('to_node', '')),
                    
                    # Store extra metadata for full fidelity
                    metadata=row 
                )
                cables.append(cable)
            except Exception as row_err:
                print(f"Row error: {row_err}")
                continue

        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)

        return ExtractionSummary(
            total_count=len(cables),
            cables=cables,
            potential_misses=[],
            system_distribution={},
            processing_time_ms=0,
            ship_metadata={"hull_no": ship_id, "ship_type": "UNIVERSAL"}
        )
            
    except Exception as e:
        if os.path.exists(f"temp_{file.filename}"):
            os.remove(f"temp_{file.filename}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cad/upload")
async def cad_upload(
    file: UploadFile = File(...)
):
    try:
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        cad_service = CADService()
        result = cad_service.parse_dxf(temp_path)
        
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
        return result
            
    except Exception as e:
        if os.path.exists(f"temp_{file.filename}"):
            os.remove(f"temp_{file.filename}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
