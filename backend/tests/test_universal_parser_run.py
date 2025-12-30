
import sys
import os
import pandas as pd

# Add backend to sys.path to import services
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.services.universal_parser import UniversalParser

def test_run():
    base_dir = r"f:\genmini\CABLE MANEGE1\seastar-cable-manager\list참조"
    parser = UniversalParser()
    
    # Files to test
    test_files = [
        "35k cableLIST type2.xls",
        "MV LISA_MATERIAL LIST FOR EGCS-R0_20200104.xls",
        "ref.xlsx"
    ]
    
    print("=== Universal Parser Verification Run ===\n")

    for filename in test_files:
        file_path = os.path.join(base_dir, filename)
        if not os.path.exists(file_path):
            print(f"[SKIP] File not found: {filename}")
            continue
            
        print(f"Processing: {filename}...")
        try:
            results = parser.parse(file_path)
            
            count = len(results)
            print(f"  -> SUCCESS: Extracted {count} cables.")
            
            if count > 0:
                # Show first 3 result samples to verify mapping
                print("  -> Sample Data (First 3 rows):")
                df_res = pd.DataFrame(results)
                
                # Select only critical columns for display
                display_cols = ['no', 'system', 'cable_name', 'length', 'from_node', 'to_node']
                # Filter to only cols that exist
                cols = [c for c in display_cols if c in df_res.columns]
                
                print(df_res[cols].head(3).to_string(index=False))
                
                # Check for critical missing data
                missing_names = df_res['cable_name'].isna().sum() + (df_res['cable_name'] == '').sum()
                print(f"  -> Quality: {missing_names} cables missing 'Cable Name'.")
                
            else:
                print("  -> WARNING: No data extracted.")

        except Exception as e:
            print(f"  -> FAILED: {str(e)}")
        
        print("\n" + "-"*50 + "\n")

if __name__ == "__main__":
    test_run()
