import sys
import os
from pathlib import Path
from collections import Counter

# Add backend directory to path so we can import app modules
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.services.manager import ExtractionManager

def run_diagnostics():
    print("="*80)
    print("    SEASTAR CABLE MANAGER - HIGH PERFORMANCE DIAGNOSTIC RUNNER")
    print("="*80)
    
    root_dir = backend_dir.parent
    wd_dir = root_dir / "wd"
    
    if not wd_dir.exists():
        print(f"❌ Error: 'wd' directory not found at {wd_dir}")
        return

    pdf_files = [str(p) for p in wd_dir.glob("*.pdf")]
    
    print(f"📂 Found {len(pdf_files)} PDF files to process in PARALLEL.\n")
    
    manager = ExtractionManager()
    
    # Execute
    result = manager.extract_batch(pdf_files)
    
    print(f"⏱️  Processing Time: {result['processing_time_ms']:.2f} ms")
    print(f"   Ship Info: {result['ship_metadata']}")
    print(f"   ✅ Total Extracted: {result['total_count']}")
    
    misses = result['potential_misses']
    print(f"   ⚠️  Potential Misses: {len(misses)}")
    
    if misses:
        print("\n⚠️  POTENTIAL MISS ANALYSIS (Top 20):")
        unique_misses = sorted(list(set(misses)))
        for i, miss in enumerate(unique_misses[:20]):
            print(f"   - {miss}")
            
    print("="*80)

if __name__ == "__main__":
    run_diagnostics()
