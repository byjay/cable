
import pandas as pd
import os
import sys

output_file = "analysis_result_v2.txt"
file_path = "dist/data/HK2401 Cable List-포설실적용_251203.xlsm"

def find_header_row(df, keywords):
    for i, row in df.iterrows():
        row_str = " ".join([str(val).upper() for val in row.values])
        matches = [k for k in keywords if k in row_str]
        if len(matches) >= 2: # At least 2 matches
            return i
    return -1

with open(output_file, "w", encoding="utf-8") as f:
    try:
        f.write(f"Analyzing {file_path}...\n")
        xl = pd.ExcelFile(file_path)
        
        # Analyze Main Sheet
        sheet_name = 'CABLE LIST(1030)'
        df_raw = xl.parse(sheet_name, header=None)
        
        header_row_idx = find_header_row(df_raw, ['CABLE NO', 'ROUTE', 'LENGTH', 'SYSTEM', 'FROM', 'TO'])
        
        if header_row_idx != -1:
            f.write(f"Header found at Row {header_row_idx}\n")
            # Reload with header
            df = xl.parse(sheet_name, header=header_row_idx)
            f.write(f"Columns: {list(df.columns)}\n")
            f.write("First 3 Data Rows:\n")
            f.write(df.head(3).to_string())
            
            # Route Analysis
            route_col = next((c for c in df.columns if 'ROUTE' in str(c).upper() or '경로' in str(c)), None)
            if route_col:
                f.write(f"\n\nRoute Column: {route_col}\n")
                f.write(df[route_col].dropna().head(10).to_string())
            else:
                f.write("\nNO ROUTE COLUMN IDENTIFIED via Keywords\n")
        else:
            f.write("HEADER NOT FOUND within first 20 rows.\n")
            f.write("Raw Dump of first 10 rows:\n")
            f.write(df_raw.head(10).to_string())

        # Analyze Report Sheet (Performance)
        f.write("\n\n--- Sheet: 포설실적보고 ---\n")
        df_rep = xl.parse('포설실적보고')
        f.write(f"Columns: {list(df_rep.columns)}\n")
        f.write(df_rep.head(5).to_string())

    except Exception as e:
        f.write(f"ERROR: {str(e)}\n")
