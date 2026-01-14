const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const SHIP_ID = 'HK2401';
const DATA_DIR = path.join(process.cwd(), 'public/data', SHIP_ID);
const OUTPUT_FILE = path.join(DATA_DIR, 'cache.json');

console.log(`🚀 Starting Cache Generation for ${SHIP_ID}...`);

function loadExcel(filename) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        console.log(`📋 Available files in ${DATA_DIR}:`);
        console.log(fs.readdirSync(DATA_DIR));
        process.exit(1);
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
}

// Basic Mappers (Simplified from ExcelService)
function mapNodes(rawData) {
    const headers = rawData[0];
    // Find index of headers
    const findIdx = (keywords) => {
        return headers.findIndex(h => keywords.some(k => String(h).toUpperCase().includes(k.toUpperCase())));
    };

    const idxName = findIdx(['NODE_NAME', 'NAME', 'NODE']);
    const idxRel = findIdx(['RELATION']);
    const idxLen = findIdx(['LINK_LENGTH', 'LENGTH']);

    // Also capture all other props
    return rawData.slice(1).map(row => {
        const name = row[idxName];
        if (!name) return null;
        return {
            ...Object.fromEntries(headers.map((h, i) => [h, row[i]])),
            name: String(name).trim(),
            relation: idxRel !== -1 ? String(row[idxRel]) : undefined,
            linkLength: idxLen !== -1 ? parseFloat(row[idxLen]) : 1
        };
    }).filter(n => n !== null);
}

function mapCables(rawData) {
    const headers = rawData[0];
    // Helper to find exact or close match
    const findIdx = (validHeaders) => {
        return headers.findIndex(h => validHeaders.includes(String(h).trim()));
    };

    const idxId = headers.findIndex(h => ['NO', 'ID', 'Serial'].some(k => h.includes(k))); // ID often doesn't have exact header

    // Strict mapping based on logs
    const idxName = findIdx(['CABLE_NAME']);
    const idxFromNode = findIdx(['FROM_NODE']);
    const idxToNode = findIdx(['TO_NODE']);
    const idxCheck = findIdx(['CHECK_NODE']);
    const idxSys = findIdx(['CABLE_SYSTEM']);
    const idxType = findIdx(['CABLE_TYPE']);

    // Additional fields
    const idxSupply = findIdx(['SUPPLY_DECK']);
    const idxLength = findIdx(['POR_LENGTH']);
    const idxWeight = findIdx(['POR_WEIGHT']); // Fixed: POR_WEIGHT not WEIGHT
    const idxFromDeck = findIdx(['FROM_ROOM', 'FROM_DECK']);
    const idxToDeck = findIdx(['TO_ROOM', 'TO_DECK']);
    const idxFromEquip = findIdx(['FROM_EQUIP']);
    const idxToEquip = findIdx(['TO_EQUIP']);

    return rawData.slice(1).map((row, i) => {
        const name = idxName !== -1 ? row[idxName] : null;
        if (!name) return null;

        return {
            ...Object.fromEntries(headers.map((h, i) => [h, row[i]])),
            id: idxId !== -1 && row[idxId] ? String(row[idxId]) : String(i + 1), // Use row index + 1 as fallback ID
            name: String(name),
            fromNode: idxFromNode !== -1 ? String(row[idxFromNode]) : undefined,
            toNode: idxToNode !== -1 ? String(row[idxToNode]) : undefined,
            checkNode: idxCheck !== -1 ? String(row[idxCheck]) : undefined,
            system: idxSys !== -1 ? String(row[idxSys]) : 'POWER',
            type: idxType !== -1 ? String(row[idxType]) : '',

            // Map additional fields correctly
            supplyDeck: idxSupply !== -1 ? String(row[idxSupply]) : undefined,
            length: idxLength !== -1 ? parseFloat(row[idxLength]) || 0 : 0,
            weight: idxWeight !== -1 ? parseFloat(row[idxWeight]) || 0 : 0,
            fromDeck: idxFromDeck !== -1 ? String(row[idxFromDeck]) : undefined,
            toDeck: idxToDeck !== -1 ? String(row[idxToDeck]) : undefined,
            fromEquip: idxFromEquip !== -1 ? String(row[idxFromEquip]) : undefined,
            toEquip: idxToEquip !== -1 ? String(row[idxToEquip]) : undefined,

            calculatedPath: [],
            calculatedLength: 0
        };
    }).filter(c => c !== null);
}

// Try to load Excel files first, fall back to JSON if no Excel found
let nodesRaw, cablesRaw;

try {
    console.log('📊 Attempting to load Excel files...');
    nodesRaw = loadExcel('nodes.xlsx');
    cablesRaw = loadExcel('cables.xlsx');
} catch (error) {
    console.log('⚠️ Excel files not found, trying JSON files...');
    // Try to load from existing JSON files
    const nodesJsonPath = path.join(DATA_DIR, 'nodes.json');
    const cablesJsonPath = path.join(DATA_DIR, 'cables.json');
    
    if (fs.existsSync(nodesJsonPath) && fs.existsSync(cablesJsonPath)) {
        console.log('📄 Loading from JSON files...');
        nodesRaw = JSON.parse(fs.readFileSync(nodesJsonPath, 'utf8'));
        cablesRaw = JSON.parse(fs.readFileSync(cablesJsonPath, 'utf8'));
    } else {
        console.error(`❌ No data files found for ${SHIP_ID}`);
        process.exit(1);
    }
}

const nodes = mapNodes(nodesRaw);
const cables = mapCables(cablesRaw);

console.log(`✅ Parsed ${nodes.length} nodes, ${cables.length} cables`);

// DEBUG: HEADERS
if (cablesRaw[0]) {
    console.log('--- CABLE HEADERS ---');
    console.log(cablesRaw[0]);
}

// DEBUG: Check first 3 nodes
console.log('--- DEBUG NODES ---');
nodes.slice(0, 3).forEach(n => console.log(`Node: "${n.name}" Relation: "${n.relation}"`));

// DEBUG: Check first 3 cables
console.log('--- DEBUG CABLES ---');
cables.slice(0, 3).forEach(c => console.log(`Cable: ${c.id} From: "${c.fromNode}" To: "${c.toNode}" Check: "${c.checkNode}"`));

const cacheData = {
    cables: cables,
    nodes: nodes,
    cableTypes: [],
    deckHeights: { "TO": 4, "SF": 3, "TW": 2, "PR": 1, "UP": 0 },
    generatedAt: new Date().toISOString()
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cacheData));
console.log(`🎉 Success! Saved to ${OUTPUT_FILE}`);
console.log(`   Size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
