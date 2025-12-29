import concurrent.futures
import time
from pathlib import Path
from typing import List, Dict, Any
from .parser import AdvancedCableParser
from ..core.cache import ExtractionCache
from ..models.schemas import ExtractionSummary

# Module-level function for multiprocessing (Picklable)
def process_single_file(file_path: str) -> Dict[str, Any]:
    """
    Worker function executed in separate process.
    Returns dictionary with 'cables', 'meta', 'misses', 'error'.
    """
    # Check Cache First
    cached = ExtractionCache.get(file_path)
    if cached:
        return {"cached": True, "data": cached, "file": Path(file_path).name}

    # If no cache, Parse
    parser = AdvancedCableParser() # New instance per process
    try:
        # Extract metadata
        filename = Path(file_path).name
        meta = parser.extract_metadata(filename)
        
        # Parse cables
        cables = parser.parse_file(file_path)
        
        # Serialize for return/caching
        cables_data = [c.dict() for c in cables]
        
        result = {
            "cables": cables_data,
            "meta": meta,
            "misses": parser.missed_patterns,
            "error": None
        }
        
        # Save to Cache
        ExtractionCache.set(file_path, result)
        
        return {"cached": False, "data": result, "file": filename}
        
    except Exception as e:
        return {"cached": False, "data": None, "file": Path(file_path).name, "error": str(e)}

class ExtractionManager:
    """
    Manages parallel execution of extraction tasks.
    """
    
    def __init__(self, max_workers: int = None):
        # Default to fewer than CPU count to leave room for OS/Server
        self.max_workers = max_workers or (os.cpu_count() or 1)

    def extract_batch(self, file_paths: List[str]) -> Dict[str, Any]:
        start_time = time.time()
        
        all_cables = []
        all_misses = []
        ship_info_agg = {"hull_no": set(), "ship_type": set()}
        
        # Use ProcessPoolExecutor for CPU-bound tasks
        with concurrent.futures.ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_file = {executor.submit(process_single_file, fp): fp for fp in file_paths}
            
            for future in concurrent.futures.as_completed(future_to_file):
                res = future.result()
                
                if res.get("error"):
                    print(f"❌ Error processing {res['file']}: {res['error']}")
                    continue
                
                data = res["data"]
                # Aggregate Results
                # data["cables"] is a list of dicts here due to serialization
                all_cables.extend(data["cables"])
                all_misses.extend(data["misses"])
                
                meta = data["meta"]
                if meta.get("hull_no") and meta["hull_no"] != "UNKNOWN":
                    ship_info_agg["hull_no"].add(meta["hull_no"])
                if meta.get("ship_type") and meta["ship_type"] != "UNKNOWN":
                    ship_info_agg["ship_type"].add(meta["ship_type"])
                    
                print(f"✅ Finished {res['file']} (Cached: {res.get('cached')})")

        # Resolve unified Ship Info
        unified_hull = next(iter(ship_info_agg["hull_no"])) if ship_info_agg["hull_no"] else "UNKNOWN"
        unified_type = next(iter(ship_info_agg["ship_type"])) if ship_info_agg["ship_type"] else "UNKNOWN"

        # Calculate Distributions
        system_counts = {}
        for c in all_cables:
            # c is dict
            sys_code = c["cable_name"][0]
            system_counts[sys_code] = system_counts.get(sys_code, 0) + 1

        end_time = time.time()
        
        return {
            "total_count": len(all_cables),
            "system_distribution": system_counts,
            "potential_misses": all_misses,
            "processing_time_ms": (end_time - start_time) * 1000,
            "ship_metadata": {
                "hull_no": unified_hull,
                "ship_type": unified_type
            },
            "cables": all_cables # Return full data if needed or handled by caller
        }

import os
