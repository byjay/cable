
import pandas as pd
import os
import sys

output_file = "analysis_result.txt"
file_path = "dist/data/HK2401 Cable List-포설실적용_251203.xlsm"

with open(output_file, "w", encoding="utf-8") as f:
    try:
        f.write(f"Analyzing {file_path}...\n")
        if not os.path.exists(file_path):
            f.write("FILE NOT FOUND!\n")
            sys.exit(1)
            
        xl = pd.ExcelFile(file_path)
        f.write(f"Sheet names: {xl.sheet_names}\n\n")
        
        # Parse first sheet
        df = xl.parse(0)
        f.write(f"Columns: {list(df.columns)}\n")
        f.write(f"Total Rows: {len(df)}\n\n")
        f.write("First 3 Rows:\n")
        f.write(df.head(3).to_string())
        f.write("\n\n")
        
        # Find Route
        route_cols = [c for c in df.columns if 'ROUTE' in str(c).upper() or 'PATH' in str(c).upper() or '경로' in str(c)]
        if route_cols:
            f.write(f"Route Columns Found: {route_cols}\n")
            f.write("Sample Routes:\n")
            f.write(df[route_cols[0]].dropna().head(10).to_string())
        else:
            f.write("NO ROUTE COLUMN FOUND.\n")

    except Exception as e:
        f.write(f"ERROR: {str(e)}\n")
