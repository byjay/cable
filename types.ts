
export interface Cable {
  id: string; // 'No'
  name: string; // 'CABLE_NAME'
  type: string; // 'COMP_NAME' or 'CABLE_TYPE'
  od: number; // 'CABLE_OUTDIA'
  length: number; // 'POR_LENGTH'
  system: string; // 'CABLE_SYSTEM'
  // From Side
  fromDeck?: string; // 'FROM_ROOM' (mapped as Deck)
  fromNode: string; // 'FROM_NODE'
  fromEquip?: string; // 'FROM_EQUIP'
  fromRoom?: string; // (Additional room info if separate)
  fromRest?: number | string; // 'FROM_REST'
  // To Side
  toDeck?: string; // 'TO_ROOM' (mapped as Deck)
  toNode: string; // 'TO_NODE'
  toEquip?: string; // 'TO_EQUIP'
  toRoom?: string;
  toRest?: number | string; // 'TO_REST'
  // Metadata
  supplyDeck?: string; // 'SUPPLY_DECK'
  checkNode?: string; // 'CHECK_NODE'
  calculatedPath?: string[];
  calculatedLength?: number;
  weight?: number; // 'POR_WEIGHT'
  page?: string; // 'WD_PAGE'
  drum?: string; // 'DRUM'
  remark?: string;
  // Route Info from Excel
  path?: string; // 'CABLE_PATH'
  [key: string]: any; // Allow flexible indexing
}

export interface Node {
  name: string;
  relation: string;
  linkLength: number;
  x?: number;
  y?: number;
  z?: number;
  deck?: string;
  structure?: string;
  component?: string;
  type?: string;
  cableList?: string;
  areaSize?: number;
  maxCable?: number;
  point?: string; // Original POINT string from Excel
  [key: string]: any;
}

export interface RouteResult {
  path: string[];
  distance: number;
  error?: string;
}

export interface DeckConfig {
  [key: string]: number;
}

export interface GenericRow {
  [key: string]: string | number | boolean | null;
}

// Maps to the Top Menu Bar
export enum MainView {
  SCHEDULE = 'Schedule',
  DASHBOARD = 'Dashboard',
  MASTER_DATA = 'Master Data',
  CABLE_TYPE = 'Cable Type',
  USER_MGMT = 'User Management',
  SHIP_DEF = 'Ship Definition',
  REPORT_DRUM = 'Drum Schedule',
  REPORT_NODE = 'Node List',
  REPORT_BOM = 'Cable Requirement', // New Report
  THREE_D = '3D Visualization',
  GENERIC_GRID = 'Generic Grid' // For dynamic views
}
