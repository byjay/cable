import re
import pandas as pd
import pdfplumber
from pathlib import Path
from typing import List, Dict, Optional
import os

class ShipCableListParser:
    """
    선박 전기 도면에서 케이블 리스트를 추출하는 클래스
    실제 도면 패턴: P2811, C0912, N1101 등
    """
    
    # 케이블 타입 하드코딩 (JIS-C3410 기준)
    CABLE_TYPES = {
        # Single core 시리즈
        'S1': 'S(Y)(S)1', 'S2': 'S(Y)(S)2.5', 'S4': 'S(Y)(S)4',
        'S6': 'S(Y)(S)6', 'S10': 'S(Y)(S)10', 'S16': 'S(Y)(S)16',
        'S25': 'S(Y)(S)25', 'S35': 'S(Y)(S)35', 'S50': 'S(Y)(S)50',
        'S70': 'S(Y)(C)(S)70', 'S95': 'S(Y)(C)(S)95', 'S150': 'S(Y)(C)(S)150',
        
        # SPYC 시리즈
        'SP1': 'SPYC(Y)(S)-1.5', 'SP2': 'SPYC(Y)(S)-2.5', 'SP4': 'SPYC(Y)(S)-4',
        'SP6': 'SPYC(Y)(S)-6', 'SP10': 'SPYC(Y)(S)-10', 'SP16': 'SPYC(Y)(S)-16',
        'SP25': 'SPYC(Y)(S)-25', 'SP35': 'SPYC(Y)(S)-35', 'SP50': 'SPYC(Y)(S)-50',
        
        # Double core 시리즈
        'D1': 'D(Y)(S)1', 'D2': 'D(Y)(S)2', 'D4': 'D(Y)(S)4',
        'D6': 'D(Y)(S)6', 'D10': 'D(Y)(S)10', 'D16': 'D(Y)(S)16',
        'D25': 'D(Y)(S)25', 'D35': 'D(Y)(S)35', 'D50': 'D(Y)(S)50',
        
        # DPYC 시리즈
        'DP1': 'DPYC(Y)(S)-1.5', 'DP2': 'DPYC(Y)(S)-2.5', 'DP4': 'DPYC(Y)(S)-4',
        'DP6': 'DPYC(Y)(S)-6', 'DP10': 'DPYC(Y)(S)-10', 'DP16': 'DPYC(Y)(S)-16',
        
        # Three core 시리즈
        'T1': 'T(Y)(S)1', 'T2': 'T(Y)(S)2', 'T4': 'T(Y)(S)4',
        'T6': 'T(Y)(S)6', 'T10': 'T(Y)(S)10', 'T16': 'T(Y)(S)16',
        'T25': 'T(Y)(S)25', 'T35': 'T(Y)(S)35', 'T50': 'T(Y)(S)50',
        'T70': 'T(Y)(S)70', 'T95': 'T(Y)(S)95', 'T120': 'T(Y)(S)120',
        'T150': 'T(Y)(S)150',
        
        # TPYC 시리즈
        'TP1': 'TPYC(Y)(S)-1.5', 'TP2': 'TPYC(Y)(S)-2.5', 'TP4': 'TPYC(Y)(S)-4',
        'TP10': 'TPYC(Y)(S)-10', 'TP16': 'TPYC(Y)(S)-16', 'TP25': 'TPYC(Y)(S)-25',
        
        # Multi core (M, TT 시리즈)
        'M2': 'M(Y)(S)2', 'M4': 'M(Y)(S)4', 'M7': 'M(Y)(S)7',
        'M12': 'M(Y)(S)12', 'M19': 'M(Y)(S)19', 'M27': 'M(Y)(S)27',
        
        'TT1': 'TT(Y)(S)1', 'TT1Q': 'TT(Y)(S)1Q', 'TT4': 'TT(Y)(S)4',
        'TT7': 'TT(Y)(S)7', 'TT10': 'TT(Y)(S)10', 'TT14': 'TT(Y)(S)14',
        
        'TTS1': 'TTYC(Y)(S)-1', 'TTS1Q': 'TTYC(Y)(S)-1Q', 'TTS4': 'TTYC(Y)(S)-4',
        
        # Fire resistant 시리즈 (Regex Logic has priority for specific mappings)
        # 'FD1': 'FD(Y)(S)1', 'FD2': 'FD(Y)(S)2', 'FD4': 'FD(Y)(S)4', 'FD6': 'FD(Y)(S)6',
        # 'FM2': 'FM(Y)(S)2', 'FM4': 'FM(Y)(S)4', 'FM7': 'FM(Y)(S)7', 'FM12': 'FM(Y)(S)12',
        'FT1': 'FT(Y)(S)1', 'FT2': 'FT(Y)(S)2', 'FT4': 'FT(Y)(S)4',
        
        # 기타
        'DY1': 'DY-1', 'DY2': 'DY-2', 'TY2': 'TY-2', 'TY6': 'TY-6', 'TY10': 'TY-10',
        'MY2': 'MY-2', 'MY4': 'MY-4', 'MY7': 'MY-7', 'MY12': 'MY-12',
        'SY6': 'SY-6', 'SY10': 'SY-10', 'SY50': 'SY-50', 'SY70': 'SY-70',
        'MS2': 'MS-2', 'MS4': 'MS-4', 'MS7': 'MS-7', 'MS12': 'MS-12',
        '5P1': '5PYC(Y)-1.5', '5P2': '5PYC(Y)-2.5',
        'RG6': 'RG-6', 'RG12U': 'RG-12/U', 'CAT5': 'STP CAT-5', 'CAT6': 'STP CAT-6',
    }
    
    # 약어 확장 (도면에서 사용되는 공간/장비 약어)
    ABBREVIATIONS = {
        'W/H': 'WHEEL HOUSE',
        'E/R': 'ENGINE ROOM',
        'W/J': 'WATER JET ROOM',
        'MSBD': 'MAIN SWITCH BOARD',
        'BCD': 'BATT. CH. & DISCH. BOARD',
        'BCDC': 'BATT. CH. & DISCH. BOARD',
        'BCC': 'BRIDGE CONTROL CONSOLE',
        'NDP': 'NAU. INST. DIST. PANEL',
        'ENDP': "EM'CY NAU. INST. DIST. PANEL",
        'PD1': 'POWER DIST. PANEL-1',
        'PD2': 'POWER DIST. PANEL-2',
        'S/G': 'STEERING GEAR',
        'RM': 'ROOM',
    }
    
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.cable_data = []
        
    def extract_text_from_pdf(self) -> List[str]:
        """PDF에서 텍스트 추출"""
        try:
            text_pages = []
            with pdfplumber.open(self.pdf_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_pages.append(text)
            return text_pages
        except Exception as e:
            print(f"PDF 추출 실패: {e}")
            return []
    
    def parse_circuit_number(self, text: str) -> List[Dict]:
        """
        실제 도면 패턴에서 회로 번호 추출
        
        패턴 예시:
        - P2811, P2901, P2207 (Power)
        - L1101, L1201 (Lighting)
        - C0912, C0811 (Control)
        - F0102, F0103 (Fire)
        - N0801, N1101 (Navigation)
        """
        cables = []
        
        # 회로 번호 패턴: [시스템코드][4자리숫자] (P2811, C0912 등)
        circuit_pattern = r'\b([PLCFNAS]\d{4}[A-Z]?)\b'
        
        # 케이블 타입 패턴: 도면에서 실제 사용되는 형식
        # 예: D-2, T-35, M-7, TY-2, DY-1, FM-7, TTS-1, 5P-1, RG-6, CAT-5
        # [FDTMS]: 기존 패턴
        # (?:5P|RG|CAT|STP): 추가 패턴
        cable_type_pattern = r'\b((?:[FDTMS][DYSM]?[YP]?[CS]?-?\d{1,3}|5P(?:YC)?-?\d+|RG-?\w+|CAT-?\d+)(?:\(\d+A\))?)\b'
        
        lines = text.split('\n')
        
        for i, line in enumerate(lines):
            circuit_matches = re.findall(circuit_pattern, line)
            
            for circuit_num in circuit_matches:
                cable_info = {
                    'CABLE_NAME': circuit_num,
                    'CABLE_TYPE': '',
                    'FROM_ROOM': '',
                    'FROM_EQUIP': '',
                    'FROM_NODE': '',
                    'FROM_REST': '',
                    'TO_ROOM': '',
                    'TO_EQUIP': '',
                    'TO_NODE': '',
                    'TO_REST': '',
                    'POR_LENGTH': ''
                }
                
                # 같은 줄이나 근처에서 케이블 타입 찾기
                context_lines = lines[max(0, i-2):min(len(lines), i+5)]
                context = '\n'.join(context_lines)
                
                # 케이블 타입 찾기
                type_match = re.search(cable_type_pattern, context)
                if type_match:
                    cable_info['CABLE_TYPE'] = type_match.group(1)
                
                # 방/장비 이름 찾기 (약어 형식)
                room_pattern = r'\b([A-Z]{2,}/[A-Z]|[A-Z]{3,}(?:\s+[A-Z]+)*)\b'
                rooms = re.findall(room_pattern, context)
                
                if len(rooms) >= 2:
                    cable_info['FROM_ROOM'] = rooms[0]
                    cable_info['TO_ROOM'] = rooms[1]
                elif len(rooms) == 1:
                    cable_info['FROM_ROOM'] = rooms[0]
                
                cables.append(cable_info)
            
            # [VERIFICATION] Check for potential misses
            # Look for patterns that resemble circuit numbers but were not caught
            # e.g., P-1234, P 1234, or different prefixes
            loose_pattern = r'\b([A-Z]{1,2}[-\s]?\d{3,4}[A-Z]?)\b'
            potential_matches = re.findall(loose_pattern, line)
            for pot in potential_matches:
                # Clean up potential match to compare
                clean_pot = pot.replace('-', '').replace(' ', '')
                if clean_pot not in [c['CABLE_NAME'] for c in cables] and clean_pot not in self.detected_potential_misses:
                    # Ignore common non-cable strings
                    if not re.match(r'^(IEC|JIS|NK|POS|NO|DWG|REF|REV|SEC|PAGE|DATE|APP|CHK|DRW|TYP|CAP|AC\d|DC\d|OE-)', clean_pot):
                         self.detected_potential_misses.append(f"Page {self.current_page}: {pot} (Context: {line.strip()[:50]}...)")

        return cables

    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.cable_data = []
        self.detected_potential_misses = []
        self.current_page = 0
    
    def normalize_cable_type(self, cable_type_str: str) -> str:
        """
        케이블 타입 문자열을 표준 형식으로 변환
        하이픈 유무 상관없이 처리: D-2, D2 모두 D(Y)(S)2로 변환
        """
        if not cable_type_str:
            return ''
        
        # 공백 제거 및 대문자 변환
        original = cable_type_str.strip().upper().replace(' ', '')
        
        # 하이픈 제거한 버전
        no_hyphen = original.replace('-', '').replace('(', '').replace(')', '')
        
        # 1. 직접 매칭 시도 (하이픈 있는 버전과 없는 버전 모두)
        for key, value in self.CABLE_TYPES.items():
            key_no_hyphen = key.replace('-', '')
            value_no_hyphen = value.replace('(', '').replace(')', '').replace('-', '')
            
            if (key_no_hyphen == no_hyphen or 
                key.upper() == original or
                value.upper() == original or
                value_no_hyphen.upper() == no_hyphen):
                return value
        
        # 2. 패턴 매칭 (하이픈 유무 상관없이)
        
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
            num_map = {'1': '1.5', '2': '2.5', '4': '4', '6': '6', '10': '10', 
                       '16': '16', '25': '25', '35': '35', '50': '50'}
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
            num_map = {'1': '1.5', '2': '2.5', '4': '4', '6': '6', '10': '10', 
                       '16': '16', '25': '25', '35': '35', '50': '50'}
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
        match = re.match(r'^TT-?(\d+)([QS]?)', original)
        if match:
            num = match.group(1)
            suffix = match.group(2)
            valid_nums = ['1', '2', '4', '7', '10', '14']
            if num in valid_nums:
                if suffix == 'Q':
                    return f'TT(Y)(S){num}Q'
                return f'TT(Y)(S){num}'
        
        # TTS/TTYC series: TTS-1, TTS1 → TTYC(Y)(S)-1
        match = re.match(r'^TTS-?(\d+)([QS]?)', original)
        if match:
            num = match.group(1)
            suffix = match.group(2)
            if suffix == 'Q':
                return f'TTYC(Y)(S)-{num}Q'
            return f'TTYC(Y)(S)-{num}'
        
        # Fire resistant: FD-2, FD2 → FD(Y)(S)2 or FDPYC(Y)(S)-2.5FA
        match = re.match(r'^F([DTM])-?(\d+)', original)
        if match:
            prefix = match.group(1)
            num = match.group(2)
            
            if prefix == 'D':
                num_map = {'1': '1.5', '2': '2.5', '4': '4', '6': '6'}
                if num in num_map:
                    return f'FDPYC(Y)(S)-{num_map[num]}FA'
            elif prefix == 'T':
                num_map = {'1': '1.5', '2': '2.5', '4': '4', '6': '6', '10': '10', 
                           '16': '16', '25': '25', '35': '35', '50': '50'}
                if num in num_map:
                    return f'FTPYC(Y)(S)-{num_map[num]}FA'
            elif prefix == 'M':
                if num in ['2', '4', '7', '12', '19']:
                    return f'FMPYC(Y)(S)-{num}FA'
        
        # 특수 타입들 (하이픈 유지 필요): DY-1, TY-2, MY-7, SY-6 등
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
        
        # 매칭 안되면 원본 반환
        return original
    
    def expand_abbreviation(self, abbr: str) -> str:
        """약어를 전체 이름으로 확장"""
        return self.ABBREVIATIONS.get(abbr, abbr)
    
    def process(self) -> List[Dict]:
        """전체 처리 파이프라인"""
        print(f"📄 PDF 파일 처리 중: {self.pdf_path}")
        
        text_pages = self.extract_text_from_pdf()
        
        if not text_pages:
            print("❌ 텍스트 추출 실패")
            return []
        
        print(f"✓ {len(text_pages)}페이지 텍스트 추출 완료")
        
        # 각 페이지에서 케이블 정보 추출
        all_cables = []
        for idx, text in enumerate(text_pages):
            self.current_page = idx + 1
            cables = self.parse_circuit_number(text)
            if cables:
                all_cables.extend(cables)
                print(f"  페이지 {idx+1}: {len(cables)}개 케이블 발견")
        
        # 중복 제거 (같은 케이블 이름)
        unique_cables = {}
        for cable in all_cables:
            cable_name = cable['CABLE_NAME']
            if cable_name not in unique_cables:
                unique_cables[cable_name] = cable
        
        self.cable_data = list(unique_cables.values())
        print(f"\n✓ 총 {len(self.cable_data)}개 고유 케이블 추출 완료")

        # [VERIFICATION REPORT]
        if self.detected_potential_misses:
            print("\n" + "!" * 80)
            print("⚠️ [VERIFICATION] 잠재적 누락 의심 항목 발견")
            print("!" * 80)
            print(f"총 {len(self.detected_potential_misses)}개 의심 항목:")
            for miss in self.detected_potential_misses[:20]: # Show top 20
                print(f"  - {miss}")
            if len(self.detected_potential_misses) > 20:
                print(f"  ... 외 {len(self.detected_potential_misses) - 20}개 더 있음")
            print("!" * 80 + "\n")
        else:
            print("\n✅ [VERIFICATION] 누락 의심 항목 없음 (추출 신뢰도 높음)\n")
        
        return self.cable_data
    
    def to_excel(self, output_path='cable_list.xlsx'):
        """Excel 파일로 저장"""
        if not self.cable_data:
            print("⚠ 추출된 데이터가 없습니다.")
            return None
        
        df = pd.DataFrame(self.cable_data)
        
        # 케이블 타입 정규화
        if 'CABLE_TYPE' in df.columns:
            df['CABLE_TYPE'] = df['CABLE_TYPE'].apply(self.normalize_cable_type)
        
        # 약어 확장
        for col in ['FROM_ROOM', 'TO_ROOM']:
            if col in df.columns:
                df[col] = df[col].apply(self.expand_abbreviation)
        
        # 컬럼 순서 지정
        columns = [
            'CABLE_NAME', 'CABLE_TYPE', 'FROM_ROOM', 'FROM_EQUIP', 
            'FROM_NODE', 'FROM_REST', 'TO_ROOM', 'TO_EQUIP', 
            'TO_NODE', 'TO_REST', 'POR_LENGTH'
        ]
        
        # Ensure only columns that exist are selected (prevent KeyError)
        existing_cols = [c for c in columns if c in df.columns]
        df = df[existing_cols]
        
        # Excel 저장
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            # 메인 케이블 리스트
            df.to_excel(writer, index=False, sheet_name='Cable List')
            
            # 시스템별 분류
            if not df.empty and 'CABLE_NAME' in df.columns:
                df['SYSTEM'] = df['CABLE_NAME'].str[0]
                system_summary = df.groupby('SYSTEM').size().reset_index(name='Count')
                system_summary['Description'] = system_summary['SYSTEM'].map({
                    'P': 'Power System (동력계통)',
                    'L': 'Lighting System (조명계통)',
                    'C': 'Control System (제어계통)',
                    'F': 'Fire Detection System (화재탐지)',
                    'N': 'Navigation System (항해계통)',
                    'A': 'Automation System (자동화)',
                    'S': 'Signal System (신호)'
                })
                system_summary.to_excel(writer, index=False, sheet_name='System Summary')
            
            # 케이블 타입 통계
            if 'CABLE_TYPE' in df.columns:
                type_stats = df['CABLE_TYPE'].value_counts().reset_index()
                type_stats.columns = ['Cable Type', 'Count']
                type_stats.to_excel(writer, index=False, sheet_name='Cable Type Stats')
        
        print(f"\n✅ Excel 파일 저장 완료: {output_path}")
        return df
    
    def create_template(self, output_path='cable_template.xlsx'):
        """수동 입력용 템플릿 생성 (실제 도면 예시 포함)"""
        template_data = {
            'CABLE_NAME': ['P2811', 'C0912', 'L1101', 'F0102', 'N0801'],
            'CABLE_TYPE': ['D(Y)(S)10', 'D(Y)(S)10', 'T(Y)(S)2', 'FD(Y)(S)2', 'D(Y)(S)2'],
            'FROM_ROOM': ['WH_FR40', 'ER(P)', 'WHEEL HOUSE', 'SWITCHBOARD ROOM', 'WHEEL HOUSE'],
            'FROM_EQUIP': ['BATT. CH. & DISCH. BOARD', 'LOP2 (NO.2 M/E)', 'LIGHTING PANEL', 'FIRE CONTROL PANEL', 'NAV. INST. DIST. PANEL'],
            'FROM_NODE': ['UP62A', 'ER01A', '', 'FCP', 'NDP'],
            'FROM_REST': ['2', '6', '', '', ''],
            'TO_ROOM': ['WH', 'WH', 'CABIN', 'ENGINE ROOM', 'RADAR'],
            'TO_EQUIP': ["EM'CY NAV. INST. DIST. PANEL", 'BATT. CH. & DISCH. BOARD', 'CEILING LIGHT', 'SMOKE DETECTOR', 'RADAR UNIT'],
            'TO_NODE': ['UP62B', 'UP62A', '', '', ''],
            'TO_REST': ['2', '3', '', '', ''],
            'POR_LENGTH': ['7', '29', '15', '12', '8']
        }
        
        df = pd.DataFrame(template_data)
        df.to_excel(output_path, index=False)
        print(f"✅ 수동 입력 템플릿 생성: {output_path}")

    def test_cable_type_normalization(self):
        """케이블 타입 정규화 테스트"""
        test_cases = [
            # 하이픈 있는 경우
            ('D-2', 'D(Y)(S)2'),
            ('D-10', 'D(Y)(S)10'),
            ('T-35', 'T(Y)(S)35'),
            ('M-7', 'M(Y)(S)7'),
            ('TY-2', 'TY-2'),
            ('DY-1', 'DY-1'),
            ('MY-7', 'MY-7'),
            ('SY-6', 'SY-6'),
            ('FM-7', 'FMPYC(Y)(S)-7FA'),
            ('TTS-1', 'TTYC(Y)(S)-1'),
            ('MS-2', 'MS-2'),
            ('RG-6', 'RG-6'),
            
            # 하이픈 없는 경우
            ('D2', 'D(Y)(S)2'),
            ('D10', 'D(Y)(S)10'),
            ('T35', 'T(Y)(S)35'),
            ('M7', 'M(Y)(S)7'),
            ('TY2', 'TY-2'),
            ('DY1', 'DY-1'),
            ('MY7', 'MY-7'),
            ('SY6', 'SY-6'),
            ('FM7', 'FMPYC(Y)(S)-7FA'),
            ('TTS1', 'TTYC(Y)(S)-1'),
            ('MS2', 'MS-2'),
            ('RG6', 'RG-6'),
            
            # 특수 케이스
            ('TT1Q', 'TT(Y)(S)1Q'),
            ('TT-1Q', 'TT(Y)(S)1Q'),
            ('FD2', 'FDPYC(Y)(S)-2.5FA'),
            ('FD-2', 'FDPYC(Y)(S)-2.5FA'),
            ('5P1', '5PYC(Y)-1.5'),
            ('5P-1', '5PYC(Y)-1.5'),
            ('CAT5', 'STP CAT-5'),
            ('CAT-5', 'STP CAT-5'),
            ('STPCAT5', 'STP CAT-5'),
        ]
        
        print("\n" + "=" * 80)
        print("케이블 타입 정규화 테스트")
        print("=" * 80)
        
        passed = 0
        failed = 0
        
        for input_type, expected in test_cases:
            result = self.normalize_cable_type(input_type)
            status = "✓" if result == expected else "✗"
            
            if result == expected:
                passed += 1
                # print(f"{status} {input_type:15} → {result:30} {'(OK)' if result == expected else ''}")
            else:
                failed += 1
                print(f"{status} {input_type:15} → {result:30} (예상: {expected})")
        
        print(f"테스트 결과: {passed}개 성공, {failed}개 실패")
        print("=" * 80)
        
        return passed, failed

# 사용 예시
if __name__ == "__main__":
    import sys
    
    # PDF 파일 경로 - Update this to the actual PDF file in the parent directory
    base_dir = Path(__file__).resolve().parent.parent 
    wd_dir = base_dir / "wd"
    print(f"Working Directory: {wd_dir}")

    # wd 폴더 내의 모든 pdf 파일 검색
    if wd_dir.exists():
        pdf_files = [str(p) for p in wd_dir.glob("*.pdf")]
        if not pdf_files:
            print(f"Warning: No PDF files found in {wd_dir}")
    else:
        pdf_files = []
        print(f"Error: 'wd' directory not found at {wd_dir}")
    
    print("=" * 80)
    print("선박 케이블 리스트 추출기 v2.0")
    print("=" * 80)
    
    # 0. Unit Test
    parser = ShipCableListParser("dummy.pdf")
    parser.test_cable_type_normalization()
    
    # 1. 템플릿 생성
    print("\n[단계 1] 수동 입력 템플릿 생성")
    template_path = "cable_template.xlsx"
    parser = ShipCableListParser("dummy.pdf")
    parser.create_template(template_path)
    
    # 3. 실제 PDF 처리 예시
    print("\n[단계 2] PDF 처리")
    print("=" * 80)
    
    print("처리 가능한 PDF 파일:")
    for pdf_file in pdf_files:
        status = "✓" if Path(pdf_file).exists() else "✗"
        print(f"  {status} {pdf_file}")
    
    # 실제 PDF 처리
    all_cables = []
    
    for pdf_file in pdf_files:
        if Path(pdf_file).exists():
            print(f"\n처리 중: {pdf_file}")
            parser = ShipCableListParser(pdf_file)
            cables = parser.process()
            all_cables.extend(cables)
    
    if all_cables:
        # 통합 Excel 생성
        final_parser = ShipCableListParser("dummy.pdf")
        final_parser.cable_data = all_cables
        df = final_parser.to_excel('integrated_cable_list.xlsx')
        
        print("\n" + "=" * 80)
        print("📊 추출 결과 요약")
        print("=" * 80)
        print(f"총 케이블 수: {len(all_cables)}개")
        
        if df is not None and not df.empty:
            print("\n시스템별 분포:")
            system_counts = df['CABLE_NAME'].str[0].value_counts()
            for system, count in system_counts.items():
                system_name = {
                    'P': 'Power (동력)',
                    'L': 'Lighting (조명)',
                    'C': 'Control (제어)',
                    'F': 'Fire (화재)',
                    'N': 'Navigation (항해)',
                }.get(system, system)
                print(f"  {system_name}: {count}개")
            
            print("\n케이블 타입 TOP 10:")
            if 'CABLE_TYPE' in df.columns:
                type_counts = df['CABLE_TYPE'].value_counts().head(10)
                for cable_type, count in type_counts.items():
                    print(f"  {cable_type:30} : {count:3}개")
