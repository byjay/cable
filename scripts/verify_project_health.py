import os
import sys

# Ensure backend can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

def main():
    print("Health Check Starting...")
    try:
        from app.services.parser import AdvancedCableParser
        print("Parser Imported Successfully.")
        
        parser = AdvancedCableParser()
        print("Parser Instantiated.")
        
        test_line = ["CABLE-1001  T-35  ROOM A  ROOM B  N01  N02  100"]
        res = parser.parse(test_line)
        print(f"Parsed {len(res)} cables.")
        if len(res) > 0:
            print(f"Sample: {res[0].cable_name} ({res[0].from_node} -> {res[0].to_node})")
            
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
