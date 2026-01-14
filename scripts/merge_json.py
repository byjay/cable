import json
import os

def merge_project_data(project_dir, output_path):
    print(f"Merging data from: {project_dir}")
    project_data = {
        "cables": [],
        "nodes": [],
        "cableTypes": []
    }
    
    # Load Cables
    cables_path = os.path.join(project_dir, 'cables.json')
    if os.path.exists(cables_path):
        with open(cables_path, 'r', encoding='utf-8') as f:
            project_data["cables"] = json.load(f)
            
    # Load Nodes
    nodes_path = os.path.join(project_dir, 'nodes.json')
    if os.path.exists(nodes_path):
        with open(nodes_path, 'r', encoding='utf-8') as f:
            project_data["nodes"] = json.load(f)
            
    # Load Cable Types
    types_path = os.path.join(project_dir, 'cable-types.json')
    if os.path.exists(types_path):
        with open(types_path, 'r', encoding='utf-8') as f:
            project_data["cableTypes"] = json.load(f)
            
    # Write Unified JSON
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(project_data, f, indent=2)
    print(f"✅ Success: Project file created at {output_path}")

# Run for HK2401
merge_project_data(
    'f:/genmini/CABLE MANEGE1/seastar-cable-manager/dist/data/HK2401',
    'f:/genmini/CABLE MANEGE1/seastar-cable-manager/public/data/HK2401.json'
)
