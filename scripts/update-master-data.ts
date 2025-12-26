
import * as fs from 'fs';
import * as path from 'path';

const part1 = fs.readFileSync(path.join(__dirname, 'master_data_part1.txt'), 'utf8');
const part2 = fs.readFileSync(path.join(__dirname, 'master_data_part2.txt'), 'utf8');
const rawData = part1 + '\n' + part2;

// Column Mapping based on step 637
// 0: Code, 1: Abbr, 2: Spec, 3: Type, 4: Weight, 5: Area, 6: OD, 7: Insert, 8: Drum, 9: UOM, 10: Loc, 11: Bind

const cables = rawData.split('\n').map(line => {
    const cols = line.split('\t').map(s => s.trim());
    if (cols.length < 5) return null; // Skip empty rows

    const typeCode = cols[0];
    if (typeCode === '코 드') return null; // Header

    return {
        TYPE_CODE: typeCode,
        TYPE_ABBR: cols[1],
        TYPE_SPEC: cols[2],
        TYPE_TYPE: cols[3],
        TYPE_WEIGHT: parseFloat(cols[4]) || 0,
        TYPE_AREA: parseFloat(cols[5]) || 0,
        OUT_DIA: parseFloat(cols[6]) || 0,
        INSERT_BLOCK: cols[7],
        DRUM_LEN: parseFloat(cols[8]) || 0,
        UOM: parseFloat(cols[9]) || 0,
        LOC_CLASS: parseFloat(cols[10]) || 0,
        BIND_GROUP: cols[11] || ''
    };
}).filter(c => c !== null);

// Generate TS Code
const tsCode = `
import { Cable, Node, GenericRow } from '../types';

export const initialCables: Cable[] = [
    // ... kept as is or reset ...
];

// ... keep initialNodes ...

export const initialCableTypes: GenericRow[] = ${JSON.stringify(cables, null, 2)};
`;

// We need to preserve existing exports constants, so we should read mockData.ts and replace just the list
const mockDataPath = path.join(__dirname, '../services/mockData.ts');
let mockDataContent = fs.readFileSync(mockDataPath, 'utf8');

const startMarker = 'export const initialCableTypes: GenericRow[] = [';
const endMarker = '];';
const startIndex = mockDataContent.indexOf(startMarker);

if (startIndex !== -1) {
    // Basic replacement logic, but sensitive to '];' which might appear elsewhere.
    // Assuming simple structure where the array ends at the *last* '];' or we find the matching bracket?
    // Let's just create the string implementation directly.

    // Actually safer to assume the structure of mockData.ts hasn't changed much
    // Or we can just rewrite the Whole file with the parts we want to keep?
    // But we might lose dynamic updates.

    // Strategy: Replace everything from startMarker to the end of the file (assuming it's the last export)
    // or regex replace.

    const newArrayString = JSON.stringify(cables, null, 2);
    // Regex to match "export const initialCableTypes: GenericRow[] = [ ... ];"
    // Using simple replacement since we know the file content from view_file

    // We will assume 'initialCableTypes' is at the end or distinct block.
    const regex = /export const initialCableTypes: GenericRow\[\] = \[([\s\S]*?)\];/;
    mockDataContent = mockDataContent.replace(regex, `export const initialCableTypes: GenericRow[] = ${newArrayString};`);

    fs.writeFileSync(mockDataPath, mockDataContent);
    console.log(`✅ Updated mockData.ts with ${cables.length} cable types.`);
} else {
    console.error('❌ Could not find initialCableTypes in mockData.ts');
}
