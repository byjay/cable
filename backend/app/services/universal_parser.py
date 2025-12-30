
import pandas as pd
import difflib
import re
from typing import List, Dict, Any, Optional

class UniversalParser:
    """
    Parses diverse Excel files into a standardized 'Type 2' cable schedule format.
    Uses fuzzy matching for headers and heuristics for merged columns.
    """

    # Target Schema (what we want to output)
    SCHEMA = {
        'no': ['NO', 'NO.', 'SEQ', 'NUMBER'],
        'system': ['SYSTEM', 'SYS', 'SYS NAME'],
        'cable_name': ['CABLE NO', 'CABLE NAME', 'CABLE NO.', 'TAG NUMBER', 'CIR', 'CIRCUIT', 'TAG'],
        'comp_name': ['COMP NAME', 'TYPE', 'CABLE TYPE', 'CABLE \nTYPE'],
        'length': ['LENGTH', 'LEN', 'TOTAL LEN', 'DESIGN LEN'],
        # FROM group
        'from_deck': ['FROM DECK', 'DECK', 'FR DECK'],
        'from_equip': ['FROM EQUIP', 'FROM EQUIPMENT', 'EQUIPMENT NAME', 'FR EQUIP', 'FROM DESCRIPTION', 'DESCRIPTION'],
        'from_node': ['FROM NODE', 'NODE', 'Node No.', 'FR NODE'],
        'from_rest': ['FROM REST', 'REST', 'FR REST'],
        # TO group
        'to_deck': ['TO DECK', 'DECK', 'TO DECK'],
        'to_equip': ['TO EQUIP', 'TO EQUIPMENT', 'TO EQUIP', 'TO DESCRIPTION', 'DESCRIPTION'],
        'to_node': ['TO NODE', 'NODE', 'Node No.', 'TO NODE'],
        'to_rest': ['TO REST', 'REST', 'TO REST'],
        # Routing
        'path': ['PATH', 'ROUTE', 'CABLE WAY', 'ROUTING'],
        'remark': ['REMARK', 'NOTE', 'COMMENTS', 'PLAN HISTORY']
    }

    def parse(self, file_path: str) -> List[Dict[str, Any]]:
        df = pd.read_excel(file_path, header=None)
        
        # 1. Detect Header Row
        header_idx = self.detect_header_row(df)
        if header_idx is None:
            raise ValueError("Could not detect a valid header row.")
        
        # 2. Extract Data
        # Re-read with correct header
        df = pd.read_excel(file_path, header=header_idx)
        
        # 3. Map Columns
        column_map = self.map_columns(df.columns.tolist())
        
        # 4. Standardize & Process
        normalized_data = []
        
        for _, row in df.iterrows():
            if pd.isna(row).all(): continue
            
            # Skip if critical fields are missing (e.g. Cable Name)
            # Find which source column maps to cable_name
            cable_col = next((k for k, v in column_map.items() if v == 'cable_name'), None)
            if cable_col and pd.isna(row[cable_col]):
                continue

            entry = {}
            for src_col, target_field in column_map.items():
                val = row[src_col]
                entry[target_field] = val if pd.notna(val) else ""

            # Handle duplicated columns (like Deck/Node appearing twice for From/To)
            # If map_columns found duplicate 'Node', it might have assigned them sequentially?
            # Standard mapping usually picks the best match. 
            # For "Type 2" specifically, we know FROM is left, TO is right.
            # We refine this in `refine_from_to_columns` if needed.
            
            normalized_data.append(entry)
            
        return normalized_data

    def detect_header_row(self, df: pd.DataFrame) -> Optional[int]:
        """Scans first 20 rows for a row containing critical keywords."""
        keywords = ['CABLE NO', 'SYSTEM', 'FROM', 'TO', 'LENGTH', 'NO.', 'CIR', 'SYS']
        
        for i, row in df.head(20).iterrows():
            row_str = " ".join([str(x).upper() for x in row.dropna().values])
            # If matches at least 2 keywords
            match_count = sum(1 for k in keywords if k in row_str)
            if match_count >= 2:
                return i
        return None

    def map_columns(self, columns: List[str]) -> Dict[str, str]:
        """
        Maps source columns to target schema using fuzzy matching.
        Handles duplicates (e.g., 'DECK' appearing twice) by positional context.
        """
        mapping = {}
        used_indices = set()
        
        # Clean columns strings: remove newlines, multiple spaces
        clean_cols = [str(c).upper().replace('\n', ' ').strip() for c in columns]
        clean_cols = [" ".join(c.split()) for c in clean_cols] # Normalize spaces
        
        for target, aliases in self.SCHEMA.items():
            best_score = 0
            best_col_idx = -1
            
            # Strict match attempt first
            for alias in aliases:
                # Find best matching column that is NOT used
                matches = difflib.get_close_matches(alias, clean_cols, n=3, cutoff=0.6)
                if matches:
                    # Pick the best unclaimed match
                    for match in matches:
                        idx = clean_cols.index(match) # Note: .index picks first occurrence
                        # If first occurrence is used, we need to search deeper.
                        # Actually we should iterate indices.
                        pass
        
        # Simplified Logic for Type 2 (Left-Right Grouping)
        # We assign 'FROM' group to left-most occurrences, 'TO' group to right-most.
        
        # 1. Identify all column indices that fuzzy match a concept
        col_matches = [] # type: List[dict]
        
        for idx, col_name in enumerate(clean_cols):
            if not col_name or "UNNAMED" in col_name: continue
            
            # Check against all schema aliases
            found_target = None
            max_ratio = 0
            
            for target_field, aliases in self.SCHEMA.items():
                for alias in aliases:
                    ratio = difflib.SequenceMatcher(None, col_name, alias).ratio()
                    if ratio > 0.7 and ratio > max_ratio:
                        max_ratio = ratio
                        found_target = target_field
            
            if found_target:
                col_matches.append({
                    'index': idx,
                    'original': columns[idx], # Use original name for mapping key
                    'target_base': found_target,
                    'ratio': max_ratio
                })

        # 2. Resolve From/To Ambuguity based on position
        # If we have two 'DECK' columns, first is FROM, second is TO.
        
        # Group duplicates
        grouped_matches = {} # type: Dict[str, List[dict]]
        for m in col_matches:
            base = m['target_base']
            # Normalize deck/equip/node/rest to generic base for position check
            generic_base = base
            if 'from_' in base: generic_base = base.replace('from_', '')
            if 'to_' in base: generic_base = base.replace('to_', '')
            
            if generic_base not in grouped_matches: grouped_matches[generic_base] = []
            grouped_matches[generic_base].append(m)

        # Assign
        final_mapping = {}
        
        # Special Fields (Singletons)
        singletons = ['no', 'system', 'cable_name', 'comp_name', 'length', 'path', 'remark']
        for field in singletons:
            # Find best match from col_matches that maps to this field
            candidates = [m for m in col_matches if m['target_base'] == field]
            if candidates:
                best = max(candidates, key=lambda x: x['ratio'])
                final_mapping[best['original']] = field
        
        # Positional Fields (Pairs)
        pairs = ['deck', 'equip', 'node', 'rest']
        for field in pairs:
            # Look for matches to 'from_field', 'to_field', or just 'field'
            # We collect all candidates that *could* be this field
            candidates = [
                m for m in col_matches 
                if field.upper() in m['target_base'].upper().replace('FROM_','').replace('TO_','')
            ]
            
            candidates.sort(key=lambda x: x['index'])
            
            if len(candidates) >= 2:
                # First is FROM, Second (or last) is TO
                final_mapping[candidates[0]['original']] = f"from_{field}"
                final_mapping[candidates[-1]['original']] = f"to_{field}"
            elif len(candidates) == 1:
                # Only one found... assume FROM? or check headers?
                # Heuristic: If it says "TO", it's TO.
                # If ambiguous, default to FROM.
                base = candidates[0]['target_base']
                if 'to_' in base:
                     final_mapping[candidates[0]['original']] = f"to_{field}"
                else:
                     final_mapping[candidates[0]['original']] = f"from_{field}"
        
        return final_mapping
    
    def normalize_key(self, key: str) -> str:
        return key.lower().replace(" ", "_")

