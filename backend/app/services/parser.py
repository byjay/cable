import re
import pdfplumber
from typing import List, Dict, Tuple
from pathlib import Path
from ..models.schemas import ExtractedCable, SystemType

class AdvancedCableParser:
    """
    Enterprise-grade PDF Parser for Ship Cable Schedules.
    Implements 'Hybrid Topological Parsing' strategy.
    """
    
    # Pre-compiled Regex Patterns for Performance (Global Scope)
    CIRCUIT_PATTERN = re.compile(r'\b([PLCFNAS]\d{4}[A-Z]?)\b')
    # Enhanced pattern to catch 5P, RG, CAT types as requested by user verification
    CABLE_TYPE_PATTERN = re.compile(r'\b((?:[FDTMS][DYSM]?[YP]?[CS]?-?\d{1,3}|5P(?:YC)?-?\d+|RG-?\w+|CAT-?\d+)(?:\(\d+A\))?)\b')
    ROOM_PATTERN = re.compile(r'\b([A-Z]{2,}/[A-Z]|[A-Z]{3,}(?:\s+[A-Z]+)*)\b')

    def __init__(self):
        self.missed_patterns = []

    def reset_state(self):
        self.missed_patterns = []

    def parse_file(self, file_path: str) -> List[ExtractedCable]:
        """
        Main entry point for parsing a PDF file.
        """
        # Reset misses for this run? 
        # Actually user might want cumulative for the object, but if we reuse object, it grows forever.
        # Let's keep it cumulative for the session but `parse_file` is usually one-off in API.
        # However, for batch processing, we might want to manage it.
        # Let's NOT reset here to maintain API behavior (main.py returns accumulated), 
        # but the diagnostic runner should be aware.
        # Wait, the prompt implies "continuously test". 
        # Let's reset it here to be safe? No, let's leave it and handle in runner or caller.
        # Actually, if I run 4 files, I want misses for 4 files.
        # But if I run API request twice, I don't want old misses.
        # The parser is instantiated once at global scope in main.py? 
        # Yes: `parser = AdvancedCableParser()` at top level.
        # This is a BUG in main.py if misses accumulate forever across requests.
        # FIX: Reset `missed_patterns` at start of `parse_file` OR ensure one instance per request.
        # Better: Reset at start of `parse_file` implies `missed_patterns` only holds last file's misses.
        # That breaks `extract_from_wd` which loops `parse_file`.
        # CORRECT FIX: Make `missed_patterns` a return value or local variable, not instance state.
        # OR: clear it in `__init__` and provide a `clear()` method, or use a new instance per request.
        # For now, to satisfy "continuous update", I will modify `parse_file` to *append* to internal state, 
        # but I will add a `reset_state()` method and call it.
        
        extracted_data = []
        path = Path(file_path)

        
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        with pdfplumber.open(path) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                text = page.extract_text()
                if not text:
                    continue
                
                page_cables = self._extract_cables_from_text(text, page_idx + 1)
                extracted_data.extend(page_cables)
                
        return self._deduplicate(extracted_data)

    def extract_metadata(self, filename: str) -> Dict[str, str]:
        """
        Extracts ship information from standard filename format.
        Format ex: [OE-002]_다목적 관공선_동력계통도R1(250403).pdf
        """
        meta = {
            "hull_no": "UNKNOWN",
            "ship_type": "UNKNOWN",
            "system": "UNKNOWN",
            "revision": "",
            "date": ""
        }
        
        # Regex for filename pattern
        # Matches: [HULL_NO]_SHIP_TYPE_SYSTEM_REV(DATE)
        pattern = re.compile(r'\[([\w-]+)\]_([^_]+)_([^(]+)(?:R(\d+))?(?:\((\d+)\))?')
        match = pattern.search(filename)
        
        if match:
            meta["hull_no"] = match.group(1)
            meta["ship_type"] = match.group(2)
            meta["system"] = match.group(3).replace('계통도', '').strip()
            meta["revision"] = f"R{match.group(4)}" if match.group(4) else "R0"
            meta["date"] = match.group(5) if match.group(5) else ""
            
        return meta

    def _extract_cables_from_text(self, text: str, page_num: int) -> List[ExtractedCable]:
        cables = []
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            # 1. Primary Extraction: Circuit Numbers
            matches = self.CIRCUIT_PATTERN.findall(line)
            
            for circuit_num in matches:
                # 2. Contextual Analysis (Proven Window: -2 to +5 lines)
                context_window = lines[max(0, i-2):min(len(lines), i+5)]
                context_str = '\n'.join(context_window)
                
                cable_type = self._find_cable_type(context_str)
                from_room, to_room = self._find_rooms(context_str)
                
                # Create ExtractedCable object
                # Use strict validation from Pydantic models
                try:
                    cable_obj = ExtractedCable(
                        cable_name=circuit_num,
                        cable_type=self._normalize_type(cable_type),
                        from_room=from_room,
                        to_room=to_room,
                        from_equip="", 
                        to_equip="",
                        page_number=page_num,
                        raw_text=line.strip()
                    )
                    cables.append(cable_obj)
                except ValueError as e:
                    # Log validation error but don't crash extraction
                    print(f"Validation Error for {circuit_num}: {e}")
                    pass
            
            # [VERIFICATION] Check for potential misses (Ported from script)
            # Look for patterns that resemble circuit numbers but were not caught
            loose_pattern = r'\b([A-Z]{1,2}[-\s]?\d{3,4}[A-Z]?)\b'
            potential_matches = re.findall(loose_pattern, line)
            for pot in potential_matches:
                clean_pot = pot.replace('-', '').replace(' ', '')
                # Check if this potential match was already extracted as a valid cable
                extracted_names = [c.cable_name for c in cables]
                if clean_pot not in extracted_names:
                    # Ignore common technical terms (Noise Filter)
                    if not re.match(r'^(IEC|JIS|NK|POS|NO|DWG|REF|REV|SEC|PAGE|DATE|APP|CHK|DRW|TYP|CAP|AC\d|DC\d|OE-)', clean_pot):
                         # Create a unique key for the miss to avoid duplicate logging per page
                         miss_entry = f"Page {page_num}: {pot}"
                         if not any(miss_entry in m for m in self.missed_patterns):
                             self.missed_patterns.append(f"{miss_entry} (Context: {line.strip()[:50]}...)")
        
        return cables

    def _find_cable_type(self, context: str) -> str:
        match = self.CABLE_TYPE_PATTERN.search(context)
        return match.group(1) if match else "UNKNOWN"

    def _find_rooms(self, context: str) -> Tuple[str, str]:
        # Room Regex matching the script's logic
        rooms = self.ROOM_PATTERN.findall(context)
        if len(rooms) >= 2:
            return rooms[0], rooms[1]
        elif len(rooms) == 1:
            return rooms[0], ""
        return "", ""

    def _normalize_type(self, raw_type: str) -> str:
        """
        Standardizes cable types to the shipyard ERP format.
        Based on the proven logic from ship_cable_parser.py
        """
        if not raw_type: return "UNKNOWN"
        
        # Strip whitespace and uppercase
        original = raw_type.strip().upper().replace(' ', '')
        
        # 1. Direct Mapping (Optimized lookup)
        # TODO: Inject specific mapping dictionary if needed
        
        # 2. Regex Pattern Matching normalization
        
        # Single core: S-2, S2 → S(Y)(S)2
        match = re.match(r'^S-?(\d+)', original)
        if match:
            num = match.group(1)
            valid_nums = ['1', '2', '4', '6', '10', '16', '25', '35', '50', '70', '95', '150']
            if num in valid_nums:
                if num in ['70', '95', '150']:
                    return f'S(Y)(C)(S){num}'
                return f'S(Y)(S){num if num != "1" else "1"}'
        
        # SPYC: SP-2, SP2 → SPYC(Y)(S)-2.5
        match = re.match(r'^SP-?(\d+)', original)
        if match:
            num = match.group(1)
            num_map = {'1': '1.5', '2': '2.5', '4': '4', '6': '6', '10': '10', '16': '16', '25': '25', '35': '35', '50': '50'}
            if num in num_map:
                return f'SPYC(Y)(S)-{num_map[num]}'

        # Double core: D-2, D2 → D(Y)(S)2  
        match = re.match(r'^D-?(\d+)', original)
        if match:
            num = match.group(1)
            valid_nums = ['1', '2', '4', '6', '10', '16', '25', '35', '50']
            if num in valid_nums:
                return f'D(Y)(S){num}'
        
        # DPYC: DP-2, DP2 → DPYC(Y)(S)-2.5
        match = re.match(r'^DP-?(\d+)', original)
        if match:
            num = match.group(1)
            num_map = {'1': '1.5', '2': '2.5', '4': '4', '6': '6', '10': '10', '16': '16'}
            if num in num_map:
                return f'DPYC(Y)(S)-{num_map[num]}'

        # Three core: T-35, T35 → T(Y)(S)35
        match = re.match(r'^T-?(\d+)', original)
        if match:
            num = match.group(1)
            valid_nums = ['1', '2', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120', '150']
            if num in valid_nums:
                return f'T(Y)(S){num}'
        
        # TPYC: TP-35, TP35 → TPYC(Y)(S)-35
        match = re.match(r'^TP-?(\d+)', original)
        if match:
            num = match.group(1)
            num_map = {'1': '1.5', '2': '2.5', '4': '4', '6': '6', '10': '10', '16': '16', '25': '25', '35': '35', '50': '50'}
            if num in num_map:
                return f'TPYC(Y)(S)-{num_map[num]}'

        # Multi core: M-7, M7 → M(Y)(S)7
        match = re.match(r'^M-?(\d+)', original)
        if match:
            num = match.group(1)
            valid_nums = ['2', '4', '7', '12', '19', '27', '37', '44']
            if num in valid_nums:
                return f'M(Y)(S){num}'

        # TT series: TT-1, TT1 → TT(Y)(S)1
        match = re.match(r'^TT-?(\d+)([QS]?)\b', original)
        if match:
            num = match.group(1)
            suffix = match.group(2)
            valid_nums = ['1', '2', '4', '7', '10', '14']
            if num in valid_nums:
                if suffix == 'Q':
                    return f'TT(Y)(S){num}Q'
                return f'TT(Y)(S){num}'

        # TTS/TTYC series: TTS-1, TTS1 → TTYC(Y)(S)-1
        match = re.match(r'^TTS-?(\d+)([QS]?)\b', original)
        if match:
            num = match.group(1)
            suffix = match.group(2)
            if suffix == 'Q':
                return f'TTYC(Y)(S)-{num}Q'
            return f'TTYC(Y)(S)-{num}'
            
        # Fire resistant: FD-2, FD2 → FDPYC(Y)(S)-2.5FA or FM-7, FM7 -> FMPYC(Y)(S)-7FA
        match = re.match(r'^F([DTM])-?(\d+)', original)
        if match:
            prefix = match.group(1)
            num = match.group(2)
            
            if prefix == 'D':
                num_map = {'1': '1.5', '2': '2.5', '4': '4', '6': '6'}
                if num in num_map:
                    return f'FDPYC(Y)(S)-{num_map[num]}FA'
            elif prefix == 'T':
                num_map = {'1': '1.5', '2': '2.5', '4': '4', '6': '6', '10': '10', '16': '16', '25': '25', '35': '35', '50': '50'}
                if num in num_map:
                    return f'FTPYC(Y)(S)-{num_map[num]}FA'
            elif prefix == 'M':
                if num in ['2', '4', '7', '12', '19']:
                    return f'FMPYC(Y)(S)-{num}FA'

        # Special types (maintain hyphen): DY-1, TY-2, MY-7, SY-6 etc.
        match = re.match(r'^([DTMS])Y-?(\d+)', original)
        if match:
            prefix = match.group(1)
            num = match.group(2)
            return f'{prefix}Y-{num}'

        # MS series: MS-2, MS2 → MS-2
        match = re.match(r'^MS-?(\d+)', original)
        if match:
            num = match.group(1)
            return f'MS-{num}'
            
        # 5P series: 5P-1, 5P1 → 5PYC(Y)-1.5
        match = re.match(r'^5P-?(\d+)', original)
        if match:
            num = match.group(1)
            num_map = {'1': '1.5', '2': '2.5'}
            if num in num_map:
                return f'5PYC(Y)-{num_map[num]}'
        
        # RG series: RG-6, RG6 → RG-6
        match = re.match(r'^RG-?(\w+)', original)
        if match:
            suffix = match.group(1)
            return f'RG-{suffix}'
            
        # CAT series: CAT-5, CAT5 → STP CAT-5
        match = re.match(r'^(?:STP)?-?CAT-?([56])', original)
        if match:
            num = match.group(1)
            return f'STP CAT-{num}'
        
        return raw_type # Return raw if no rule matches

    def _deduplicate(self, cables: List[ExtractedCable]) -> List[ExtractedCable]:
        """
        Removes duplicates based on cable_name, keeping the one with higher information density.
        """
        unique_map = {}
        for c in cables:
            if c.cable_name not in unique_map:
                unique_map[c.cable_name] = c
            else:
                # Merge logic: if existing has UNKNOWN type but new has type, replace
                existing = unique_map[c.cable_name]
                if existing.cable_type == "UNKNOWN" and c.cable_type != "UNKNOWN":
                    unique_map[c.cable_name] = c
                # If new one has rooms and old one doesn't, use new one
                elif not existing.from_room and c.from_room:
                     unique_map[c.cable_name] = c
        return list(unique_map.values())
