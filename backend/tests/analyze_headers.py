import pandas as pd
import os

base_dir = r"f:\genmini\CABLE MANEGE1\seastar-cable-manager\list참조"
files_to_check = [
    "35k cableLIST type2.xls",
    "KMTC 6500TEU_CABLE SCH_BWTS(0731).xlsm",
    "LISA_CABLE SCH(200310).xlsm"
]

report = []

for filename in files_to_check:
    file_path = os.path.join(base_dir, filename)
    try:
        # Read first few rows to find header
        df = pd.read_excel(file_path, header=None, nrows=10)
        
        report.append(f"--- File: {filename} ---")
        # Simple heuristic: find row with most non-nulls or specific keywords like 'CABLE NO'
        header_row_idx = -1
        max_cols = 0
        
        for i, row in df.iterrows():
            non_null_count = row.count()
            row_vals = [str(x).upper() for x in row.dropna().values]
            if "CABLE NO" in row_vals or "NO." in row_vals or "SYSTEM" in row_vals:
                header_row_idx = i
                break
        
        if header_row_idx != -1:
            report.append(f"Header found at row {header_row_idx}")
            headers = df.iloc[header_row_idx].dropna().tolist()
            report.append(f"Columns: {headers}")
        else:
            report.append("Could not confidently identify header row. showing first 5 rows:")
            report.append(df.head(5).to_string())
            
    except Exception as e:
        report.append(f"Error reading {filename}: {str(e)}")
    report.append("\n")

print("\n".join(report))
