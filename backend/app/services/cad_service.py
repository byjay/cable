
import ezdxf
from typing import List, Dict, Any, Optional
import os

class CADService:
    @staticmethod
    def parse_dxf(file_path: str) -> Dict[str, Any]:
        """
        Parses a DXF file and extracts entities (LINES, LWPOLYLINE, TEXT, MTEXT)
        optimized for web visualization.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"DXF file not found: {file_path}")

        try:
            doc = ezdxf.readfile(file_path)
            msp = doc.modelspace()
            
            layers = set()
            entities = []

            # 1. Process Lines
            for line in msp.query('LINE'):
                layers.add(line.dxf.layer)
                entities.append({
                    "type": "LINE",
                    "layer": line.dxf.layer,
                    "start": [line.dxf.start.x, line.dxf.start.y, line.dxf.start.z],
                    "end": [line.dxf.end.x, line.dxf.end.y, line.dxf.end.z]
                })

            # 2. Process Polylines (LWPOLYLINE is modern)
            for pline in msp.query('LWPOLYLINE'):
                layers.add(pline.dxf.layer)
                points = list(pline.get_points())
                # Convert to line segments
                for i in range(len(points) - 1):
                    entities.append({
                        "type": "LINE",
                        "layer": pline.dxf.layer,
                        "start": [points[i][0], points[i][1], 0],
                        "end": [points[i+1][0], points[i+1][1], 0]
                    })
                if pline.closed:
                    entities.append({
                        "type": "LINE",
                        "layer": pline.dxf.layer,
                        "start": [points[-1][0], points[-1][1], 0],
                        "end": [points[0][0], points[0][1], 0]
                    })

            # 3. Process Text
            for text in msp.query('TEXT MTEXT'):
                layers.add(text.dxf.layer)
                content = ""
                pos = [0, 0, 0]
                
                if text.dxftype() == 'TEXT':
                    content = text.dxf.text
                    pos = [text.dxf.insert.x, text.dxf.insert.y, text.dxf.insert.z]
                else: # MTEXT
                    content = text.text
                    pos = [text.dxf.insert.x, text.dxf.insert.y, text.dxf.insert.z]

                entities.append({
                    "type": "TEXT",
                    "layer": text.dxf.layer,
                    "pos": pos,
                    "content": content
                })

            # 4. Process Blocks (INSERT/ATTRIB)
            blocks = []
            for insert in msp.query('INSERT'):
                layers.add(insert.dxf.layer)
                
                # Basic Block Info
                block_data = {
                    "name": insert.dxf.name,
                    "layer": insert.dxf.layer,
                    "pos": [insert.dxf.insert.x, insert.dxf.insert.y, insert.dxf.insert.z],
                    "attributes": {}
                }
                
                # Extract Attributes
                for attr in insert.attribs:
                    block_data["attributes"][attr.dxf.tag] = attr.dxf.text
                
                blocks.append(block_data)

            return {
                "layers": sorted(list(layers)),
                "entities": entities,
                "blocks": blocks
            }

        except Exception as e:
            raise Exception(f"Failed to parse DXF: {str(e)}")
