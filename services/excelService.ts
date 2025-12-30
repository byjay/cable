import * as XLSX from 'xlsx';
import { Cable, Node } from '../types';

// Strict Column Mapping based on User Request and Screenshots
const CABLE_COLUMNS: { [key: string]: string[] } = {
  id: ['NO', 'ID', 'No.', 'Serial'],
  system: ['CABLE_SYSTEM', 'SYSTEM', 'System', 'Sys'],
  page: ['WD_PAGE', 'WD_PAG', 'PAGE', 'Page'],
  name: ['CABLE_NAME', 'NAME', 'Cable Name', 'Circuit Name', 'Circuit'],
  // User indicated COMP_NAME is used for Type in their data
  type: ['COMP_NAME', 'CABLE_TYPE', 'TYPE', 'Type', 'Cable Type'],

  // Critical: User specified FROM_ROOM = Deck
  fromDeck: ['FROM_ROOM', 'FROM_DECK', 'F_Deck', 'DECK_F'],
  fromRoom: ['FROM_ROOM', 'F_Room', 'ROOM_F'],  // Also map separately
  fromNode: ['FROM_NODE', 'From Node', 'FROM', 'F_Node', 'NODE_F'],
  fromEquip: ['FROM_EQUIP', 'From Equipment', 'F_Equip', 'EQUIP_F'],
  fromRest: ['FROM_REST', 'FROM_RES', 'F_Res', 'REST_F'],

  // To Side
  toDeck: ['TO_ROOM', 'TO_DECK', 'T_Deck', 'DECK_T'],
  toRoom: ['TO_ROOM', 'T_Room', 'ROOM_T'],  // Also map separately
  toNode: ['TO_NODE', 'To Node', 'TO', 'T_Node', 'NODE_T'],
  toEquip: ['TO_EQUIP', 'To Equipment', 'T_Equip', 'EQUIP_T'],
  toRest: ['TO_REST', 'TO_RES', 'T_Res', 'REST_T'],

  length: ['POR_LENGTH', 'LENGTH', 'Length', 'Total Length'],
  // Critical: Cable Path (Excel source)
  path: ['CABLE_PATH', 'CABLE_ROUTE', 'PATH', 'Path'],
  od: ['CABLE_OUTDIA', 'OUT_DIA', 'Diameter', 'OD', 'DIA'],
  checkNode: ['CHECK_NODE', 'Check Node', 'Check'],
  supplyDeck: ['SUPPLY_DECK', 'SUPPLY_DK', 'Supply'],
  weight: ['POR_WEIGHT', 'WEIGHT', 'Weight'],
  drum: ['DRUM', 'DRUM_', 'Drum', 'DRUM_NO'],
  remark: ['REMARK', 'Remark', 'Comments']
};

const NODE_COLUMNS: { [key: string]: string[] } = {
  name: ['NODE_RNAME', 'NODE_NAME', 'NAME', 'Node'],
  structure: ['STRUCTURE_NAME', 'STRUCTURE', 'Structure'],
  component: ['COMPONENT', 'Component', 'COMP'],
  type: ['NODE_TYPE', 'TYPE', 'Type'],
  cableList: ['CABLE_LIST', 'CableList', 'CABLES'],
  relation: ['RELATION', 'Relation', 'Link', 'Adj'],
  linkLength: ['LINK_LENGTH', 'Link Length', 'LENGTH'],
  areaSize: ['AREA_SIZE', 'AreaSize', 'AREA'],
  maxCable: ['MAX_CABLE', 'MaxCable', 'MAX'],
  point: ['POINT', 'Point', 'COORDINATE', 'COORD'],
  x: ['X', 'x', 'POS_X'],
  y: ['Y', 'y', 'POS_Y'],
  z: ['Z', 'z', 'POS_Z'],
  deck: ['DECK', 'Deck']
};

// Parse POINT column format: "X,Y,Z E: X2,Y2,Z2" or "X,Y,Z"
const parsePointCoordinate = (pointStr: string | undefined): { x: number, y: number, z: number } => {
  if (!pointStr) return { x: 0, y: 0, z: 0 };
  const str = String(pointStr).trim();
  // Match pattern: number,number,number (first set of coordinates)
  const match = str.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (match) {
    return {
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      z: parseFloat(match[3])
    };
  }
  return { x: 0, y: 0, z: 0 };
};

const getColumnIndex = (headers: string[], possibleNames: string[]): number => {
  const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim().replace(/_/g, ''));
  for (const name of possibleNames) {
    const search = name.toLowerCase().replace(/_/g, '');
    const idx = lowerHeaders.indexOf(search);
    if (idx !== -1) return idx;
  }
  return -1;
};

export const ExcelService = {
  exportToExcel: (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  },

  importFromExcel: (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  },

  readArrayBuffer: (buffer: ArrayBuffer): any[] => {
    try {
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    } catch (error) {
      console.error("Excel Parse Error:", error);
      return [];
    }
  },

  detectFileType: (headers: string[]): 'CABLE' | 'NODE' | 'TYPE' | 'UNKNOWN' => {
    const h = headers.map(s => String(s).toUpperCase().replace(/_/g, ''));
    const has = (k: string) => h.some(header => header.includes(k.toUpperCase()));

    if (has('CABLENAME') || (has('FROMNODE') && has('TONODE'))) return 'CABLE';
    // Modified to be more robust for NODE_RNAME or just NODE + RELATION
    if ((has('NODENAME') || has('NODERNAME') || has('NODE')) && has('RELATION')) return 'NODE';
    if (has('TYPECODE')) return 'TYPE';
    return 'UNKNOWN';
  },

  mapRawToCable: (rawData: any[]): Cable[] => {
    if (rawData.length < 2) return [];

    const headers = rawData[0] as string[];
    const indices: { [key: string]: number } = {};

    for (const key in CABLE_COLUMNS) {
      indices[key] = getColumnIndex(headers, CABLE_COLUMNS[key]);
    }

    const mapped: Cable[] = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      if (!row || row.length === 0) continue;

      const getVal = (key: string) => indices[key] !== -1 ? row[indices[key]] : undefined;
      const getStr = (key: string) => {
        const val = getVal(key);
        return (val !== undefined && val !== null) ? String(val).trim() : '';
      };
      const getNum = (key: string) => {
        const val = getVal(key);
        const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
        return isNaN(parsed) ? 0 : parsed;
      };

      const name = getStr('name');
      if (!name) continue;

      const rawId = getStr('id');
      const page = getStr('page');

      // CRITICAL FIX: Ensure Unique ID
      // If rawId (NO) is present, it might duplicate across pages (1, 2, 3).
      // Combine with Page if possible, or fallback to Name (usually unique).
      let uniqueId = rawId;
      if (rawId && page) uniqueId = `${page}_${rawId}`;
      else if (!rawId) uniqueId = name; // Fallback to Name if No ID

      // Final fallback to index if collision likely (though Name should be unique)
      if (!uniqueId) uniqueId = String(i);

      const cable: Cable = {
        id: uniqueId,
        name: name,
        type: getStr('type'),
        system: getStr('system') || 'POWER',
        page: getStr('page'),

        fromDeck: getStr('fromDeck'),
        fromRoom: getStr('fromRoom') || getStr('fromDeck'),  // Use fromRoom or fallback to fromDeck
        fromNode: getStr('fromNode'),
        fromEquip: getStr('fromEquip'),
        fromRest: getStr('fromRest'),

        toDeck: getStr('toDeck'),
        toRoom: getStr('toRoom') || getStr('toDeck'),  // Use toRoom or fallback to toDeck
        toNode: getStr('toNode'),
        toEquip: getStr('toEquip'),
        toRest: getStr('toRest'),

        length: getNum('length'),
        path: getStr('path'), // Mapped to CABLE_PATH
        od: getNum('od'),
        weight: getNum('weight'),

        checkNode: getStr('checkNode'),
        supplyDeck: getStr('supplyDeck'),
        drum: getStr('drum'),
        remark: getStr('remark'),

        // Store all raw data for backup
        ...Object.fromEntries(headers.map((h, idx) => [h, row[idx]]))
      };
      mapped.push(cable);
    }
    return mapped;
  },

  mapRawToNode: (rawData: any[]): Node[] => {
    if (rawData.length < 2) return [];
    const headers = rawData[0] as string[];
    const indices: { [key: string]: number } = {};
    for (const key in NODE_COLUMNS) indices[key] = getColumnIndex(headers, NODE_COLUMNS[key]);

    console.log('📍 Node columns found:', Object.entries(indices).filter(([k, v]) => v !== -1).map(([k]) => k));

    return rawData.slice(1).map(row => {
      const getVal = (key: string) => indices[key] !== -1 ? row[indices[key]] : undefined;
      const getStr = (key: string) => { const v = getVal(key); return v ? String(v).trim() : ''; };
      const getNum = (key: string) => { const v = parseFloat(String(getVal(key))); return isNaN(v) ? 0 : v; };

      const name = getStr('name');
      if (!name) return null;

      // Parse POINT column for coordinates (priority over separate X/Y/Z)
      const pointStr = getStr('point');
      const pointCoords = parsePointCoordinate(pointStr);

      // Use X/Y/Z if available, otherwise use parsed POINT
      let x = getNum('x');
      let y = getNum('y');
      let z = getNum('z');

      // If no explicit X/Y/Z, use POINT coordinates
      if (x === 0 && y === 0 && z === 0 && (pointCoords.x !== 0 || pointCoords.y !== 0 || pointCoords.z !== 0)) {
        x = pointCoords.x;
        y = pointCoords.y;
        z = pointCoords.z;
        console.log(`📌 Node ${name}: Using POINT coordinates (${x}, ${y}, ${z})`);
      }

      return {
        name: name,
        relation: getStr('relation'),
        linkLength: getNum('linkLength') || 1,
        x, y, z,
        deck: getStr('deck'),
        structure: getStr('structure'),
        component: getStr('component'),
        type: getStr('type'),
        cableList: getStr('cableList'),
        areaSize: getNum('areaSize'),
        maxCable: getNum('maxCable'),
        point: pointStr, // Store original POINT string
        ...Object.fromEntries(headers.map((h, idx) => [h, row[idx]]))
      };
    }).filter(n => n !== null) as Node[];
  }
};