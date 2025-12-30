
import pandas as pd
import os

file_path = r"f:\genmini\CABLE MANEGE1\seastar-cable-manager\list참조\KMTC 6500TEU_CABLE SCH_BWTS(0731).xlsm"

if os.path.exists(file_path):
    print(f"Reading {file_path}")
    try:
        df = pd.read_excel(file_path, header=None, nrows=10)
        print(df.to_string())
    except Exception as e:
        print(f"Error: {e}")
else:
    print("File not found")
