
import pandas as pd
import json
import os
import re
from datetime import datetime

# Configuration
INPUT_FILE = "dist/data/HK2401 Cable List-포설실적용_251203.xlsm"
OUTPUT_DIR = "public/data/HK2401"
HEADER_ROW = 11

def clean_node_name(name):
    if pd.isna(name): return ""
    return str(name).strip().upper()

def parse_excel():
    print(f"Reading {INPUT_FILE}...")
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    # Read Data
    df = pd.read_excel(INPUT_FILE, sheet_name='CABLE LIST(1030)', header=HEADER_ROW)
    
    cables = []
    nodes_set = set()
    edges_count = {}

    print(f"Processing {len(df)} rows...")

    for i, row in df.iterrows():
        # Valid Check
        cable_id = str(row['CIRCUIT\nNO.']).strip()
        if pd.isna(row['CIRCUIT\nNO.']) or cable_id == 'nan':
            continue

        # Extract Fields
        # Prefer CODE, fallback to EQUIPMENT
        from_node = clean_node_name(row['FROM CODE']) or clean_node_name(row['FROM EQUIPMENT'])
        to_node = clean_node_name(row['TO CODE']) or clean_node_name(row['TO EQUIPMENT'])
        
        # Route Parsing
        route_str = str(row['ROUTE']).strip()
        path = []
        if not pd.isna(row['ROUTE']) and route_str != 'nan':
            # Split by comma or space if comma missing
            if ',' in route_str:
                path = [n.strip() for n in route_str.split(',') if n.strip()]
            else:
                path = [n.strip() for n in route_str.split() if n.strip()]
        
        # Infer Nodes from Route
        for node in path:
            nodes_set.add(node)
        
        # Add Endpoints to nodes
        if from_node: nodes_set.add(from_node)
        if to_node: nodes_set.add(to_node)

        # Installation Status (Macro Logic)
        install_date_raw = row['포설일자']
        status = "Planned"
        install_date = None
        
        if not pd.isna(install_date_raw):
            status = "Installed"
            try:
                if isinstance(install_date_raw, datetime):
                    install_date = install_date_raw.isoformat()
                else:
                    install_date = str(install_date_raw)
            except:
                install_date = str(install_date_raw)

        # Build Cable Object
        cable = {
            "id": cable_id,
            "name": cable_id,
            "system": str(row['SYS']).strip(),
            "type": str(row['CABLE\nTYPE']).strip(),
            "fromNode": from_node,
            "toNode": to_node,
            "length": float(row['LENGTH']) if not pd.isna(row['LENGTH']) else 0,
            "route": path if path else None, # Official Route (if fixed)
            "path": ",".join(path), # Text representation
            "status": status,
            "installDate": install_date,
            "radius": 0, # Default
            "weight": 0 # Default
        }
        cables.append(cable)

    print(f"Generated {len(cables)} cables.")
    
    # Infer Topology (Relations) from Routes
    adjacency = {}
    
    # Initialize adjacency for all potential nodes
    for n in nodes_set:
        adjacency[n] = set()

    for cable in cables:
        route = cable.get('route', [])
        if not route or len(route) < 2:
            continue
        
        # Link sequential nodes in the route
        for i in range(len(route) - 1):
            u = route[i]
            v = route[i+1]
            if u and v:
                adjacency[u].add(v)
                adjacency[v].add(u)

    # Build Nodes List with Relations
    nodes = []
    for n in nodes_set:
        neighbors = sorted(list(adjacency.get(n, [])))
        relation_str = ",".join(neighbors)
        
        nodes.append({
            "id": n,
            "name": n,
            "type": "TRAY",
            "relation": relation_str, # Critical for RoutingService
            "x": 0,
            "y": 0, 
            "z": 0
        })
    
    print(f"Generated {len(nodes)} nodes with inferred topology.")

    # Save Files
    with open(os.path.join(OUTPUT_DIR, "cables.json"), "w", encoding="utf-8") as f:
        json.dump(cables, f, indent=2)
        
    with open(os.path.join(OUTPUT_DIR, "nodes.json"), "w", encoding="utf-8") as f:
        json.dump(nodes, f, indent=2)

    # Convert Cable Types (if valid)
    # We might need to extract unique types and make a dummy types file
    types = set([c['type'] for c in cables])
    cable_types = [{"id": t, "name": t, "diameter": 15, "weight": 0.5} for t in types] # Defaults
    
    with open(os.path.join(OUTPUT_DIR, "cable-types.json"), "w", encoding="utf-8") as f:
        json.dump(cable_types, f, indent=2)

    print("Done!")

if __name__ == "__main__":
    parse_excel()
