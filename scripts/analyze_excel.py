
import os
import pandas as pd
import json
import re

# This script will be used to analyze the excel file once found
def analyze_excel(file_path):
    print(f"Analyzing {file_path}...")
    try:
        xl = pd.ExcelFile(file_path)
        print(f"Sheet names: {xl.sheet_names}")
        
        # Load first sheet or specific cable sheet
        df = xl.parse(0) # Assume first sheet for now
        print("Columns:", df.columns.tolist())
        print("First 5 rows:")
        print(df.head().to_string())
        
        # Check for ROUTE column
        route_cols = [c for c in df.columns if 'ROUTE' in str(c).upper() or 'PATH' in str(c).upper()]
        if route_cols:
            print(f"\nPotential Route Columns: {route_cols}")
            print(df[route_cols[0]].head(10).to_string())
            
    except Exception as e:
        print(f"Error: {e}")

# analyze_excel("PATH_TO_BE_FILLED")
