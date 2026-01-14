import re
import pdfplumber
from typing import List, Dict, Tuple
from pathlib import Path
from ..models.schemas import ExtractedCable, SystemType

class AdvancedCableParser:
    CIRCUIT_PATTERN = re.compile(r'\b([A-Z][\dA-Z-]{3,19})\b')
    CABLE_TYPE_PATTERN = re.compile(r'\b((?:[FDTMS][DYSM]?[YP]?[CS]?-?\d{1,3}|5P(?:YC)?-?\d+|RG-?\w+|CAT-?\d+)(?:\(\d+A\))?)\b')
    ROOM_PATTERN = re.compile(r'\b([A-Z]{2,}/[A-Z]|[A-Z]{3,}(?:\s+[A-Z]+)*)\b')

    def __init__(self):
        self.missed_patterns = []

    def reset_state(self):
        self.missed_patterns = []

    def parse_file(self, file_path: str) -> List[ExtractedCable]:
        extracted_data = []
        path = Path(file_path)
        if not path.exists(): return []

        try:
            with pdfplumber.open(path) as pdf:
                for page_idx, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    extracted_data.extend(self._extract_cables_from_text(text, page_idx + 1))
        except:
            pass
        return self._deduplicate(extracted_data)

    def extract_metadata(self, filename: str) -> Dict[str, str]:
        meta = {"hull_no": "UNKNOWN", "ship_type": "UNKNOWN", "system": "UNKNOWN"}
        return meta
        
    def parse(self, lines: List[str]) -> List[ExtractedCable]:
        return self._extract_cables_from_text('\n'.join(lines), 1)

    def _extract_cables_from_text(self, text: str, page_num: int) -> List[ExtractedCable]:
        cables = []
        lines = text.split('\n')
        for i, line in enumerate(lines):
            matches = self.CIRCUIT_PATTERN.findall(line)
            for circuit_num in matches:
                # Simplified robust extraction
                if len(circuit_num.strip()) < 4: continue
                
                # Context window
                context = '\n'.join(lines[max(0, i-2):min(len(lines), i+5)])
                
                try:
                    cables.append(ExtractedCable(
                        cable_name=circuit_num.strip(),
                        cable_type=self._find_match(self.CABLE_TYPE_PATTERN, context),
                        from_room=self._find_rooms(context)[0],
                        to_room=self._find_rooms(context)[1],
                        from_equip="", to_equip="",
                        from_node=self._find_nodes(context)[0],
                        to_node=self._find_nodes(context)[1],
                        page_number=page_num,
                        raw_text=line.strip()
                    ))
                except ValueError: pass
        return cables

    def _find_match(self, pattern, text):
        m = pattern.search(text)
        return m.group(1) if m else "UNKNOWN"

    def _find_rooms(self, context: str) -> Tuple[str, str]:
        rooms = self.ROOM_PATTERN.findall(context)
        if len(rooms) >= 2: return rooms[0], rooms[1]
        elif len(rooms) == 1: return rooms[0], ""
        return "", ""

    def _find_nodes(self, context: str) -> Tuple[str, str]:
        # Node Pattern: 1-3 Letters + digits (e.g. N25, TW99S)
        node_pattern = r'\b([A-Z]{1,3}\d{2,3}[A-Z]{0,2})\b'
        matches = [m for m in re.findall(node_pattern, context) if m not in ["SPYC", "TPYC", "DPYC", "CAT"] and "DK" not in m]
        if len(matches) >= 2: return matches[0], matches[1]
        elif len(matches) == 1: return matches[0], ""
        return "", ""

    def _normalize_type(self, raw_type: str) -> str:
        return raw_type.strip().upper() if raw_type else "UNKNOWN"

    def _deduplicate(self, cables: List[ExtractedCable]) -> List[ExtractedCable]:
        unique_map = {c.cable_name: c for c in cables}
        return list(unique_map.values())
