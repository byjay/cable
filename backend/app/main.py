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

parser = AdvancedCableParser()

@app.get("/")
async def root():
    return {"message": "Seastar Cable Manager API v3.0 Online"}

@app.post("/api/extract/wd", response_model=ExtractionSummary)
async def extract_from_wd():
    """
    Batch process all files in the server's 'wd' (Working Directory).
    Simulates the specific user request workflow.
    """
    base_dir = Path(__file__).resolve().parent.parent.parent.parent # Adjust based on depth
    wd_dir = base_dir / "wd"
    print(f"Scanning directory: {wd_dir}")
    
    if not wd_dir.exists():
        raise HTTPException(status_code=404, detail="'wd' directory not found on server")
    
    pdf_files = list(wd_dir.glob("*.pdf"))
    if not pdf_files:
        raise HTTPException(status_code=404, detail="No PDF files found in 'wd' directory")
    
    all_cables = []
    ship_info_agg = {
        "hull_no": set(),
        "ship_type": set()
    }
    
    for pdf in pdf_files:
        try:
            # Extract metadata from filename
            meta = parser.extract_metadata(pdf.name)
            ship_info_agg["hull_no"].add(meta["hull_no"])
            ship_info_agg["ship_type"].add(meta["ship_type"])
            
            # Parse cables
            cables = parser.parse_file(str(pdf))
            all_cables.extend(cables)
        except Exception as e:
            print(f"Error parsing {pdf}: {str(e)}")
            # Continue processing other files even if one fails
    
    # Resolve unified Ship Info (simple majority or first found)
    unified_hull = next(iter(ship_info_agg["hull_no"])) if ship_info_agg["hull_no"] else "UNKNOWN"
    unified_type = next(iter(ship_info_agg["ship_type"])) if ship_info_agg["ship_type"] else "UNKNOWN"
    
    # Calculate stats
    system_counts = {}
    for c in all_cables:
        sys_code = c.cable_name[0]
        system_counts[sys_code] = system_counts.get(sys_code, 0) + 1
        
    return ExtractionSummary(
        total_count=len(all_cables),
        system_distribution=system_counts,
        potential_misses=parser.missed_patterns,
        processing_time_ms=0.0,
        ship_metadata={  # New field in response (need to update schema if strict)
            "hull_no": unified_hull,
            "ship_type": unified_type
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
