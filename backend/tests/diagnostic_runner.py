import sys
import os
from pathlib import Path
from collections import Counter

# Add backend directory to path so we can import app modules
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from app.services.parser import AdvancedCableParser

def run_diagnostics():
    print("="*80)
    print("    SEASTAR CABLE MANAGER - CONTINUOUS DIAGNOSTIC RUNNER")
    print("="*80)
    
    # Locate WD
    # Assuming script is in backend/tests/
    # wd is in root/wd
    root_dir = backend_dir.parent
    wd_dir = root_dir / "wd"
    
    if not wd_dir.exists():
        print(f"❌ Error: 'wd' directory not found at {wd_dir}")
        return

    pdf_files = list(wd_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"❌ Error: No PDF files found in {wd_dir}")
        return

    parser = AdvancedCableParser()
    total_cables = 0
    all_misses = []
    
    print(f"📂 Found {len(pdf_files)} PDF files to process.\n")
    
    for pdf in pdf_files:
        print(f"running: {pdf.name}...")
        try:
            # Metadata Check
            meta = parser.extract_metadata(pdf.name)
            print(f"   MetaData: Hull[{meta.get('hull_no', '?')}] Type[{meta.get('ship_type', '?')}]")
            
            # Extraction Check
            cables = parser.parse_file(str(pdf))
            count = len(cables)
            total_cables += count
            print(f"   ✅ Extracted: {count} cables")
            
            # Check for misses specific to this file (using internal state of parser if accessible, 
            # but parser.missed_patterns is cumulative in current implementation. 
            # We should probably reset it or handle per-file in the runner if we want per-file stats clearly.)
            # For now, we rely on the parser's cumulative list logic or check if it clears.
            # Looking at parser code: __init__ sets self.missed_patterns = []. It accumulates.
            # IMPORTANT: We need to instantiate parser or clear misses per file for cleaner logs?
            # Actually, reusing parser is fine, we just check the delta or print all at end.
            
        except Exception as e:
            print(f"   ❌ Failed: {str(e)}")

    print("\n" + "="*80)
    print("    DIAGNOSTIC RESULTS Summary")
    print("="*80)
    print(f"TOTAL EXTRACTED CABLES: {total_cables}")
    print(f"TOTAL POTENTIAL MISSES: {len(parser.missed_patterns)}")
    
    if parser.missed_patterns:
        print("\n⚠️  POTENTIAL MISS ANALYSIS (Top 50):")
        print("-" * 60)
        # Group by pattern to see frequent noise
        miss_counter = Counter([m.split(':')[1].strip().split(' ')[0] for m in parser.missed_patterns])
        
        # Print raw misses with context
        for i, miss in enumerate(parser.missed_patterns[:50]):
            print(f" [{i+1:02d}] {miss}")
            
        if len(parser.missed_patterns) > 50:
            print(f"\n ... and {len(parser.missed_patterns)-50} more items.")
            
        print("\n🔍 FREQUENCY ANALYSIS OF MISSES (Top Noise Candidates):")
        for item, cnt in miss_counter.most_common(10):
            print(f"   {item}: {cnt} times")
            
    else:
        print("\n✨ Perfect Run: No potential misses detected!")
        
    print("="*80)

if __name__ == "__main__":
    run_diagnostics()
