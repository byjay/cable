import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const SHIP_ID = 'S1001_35K_FD';
const DATA_DIR = path.join(__dirname, '../public/data', SHIP_ID);
const OUTPUT_FILE = path.join(DATA_DIR, 'cache.json');

// --- TYPES & HELPERS ---
interface RouteResult {
    path: string[];
    distance: number;
    error?: string;
}

// Minimal Node Interface
interface Node {
    name: string;
    relation?: string;
    linkLength?: number;
    [key: string]: any;
}

// Minimal Cable Interface
interface Cable {
    id: string;
    fromNode?: string;
    toNode?: string;
    checkNode?: string;
    calculatedPath?: string[];
    calculatedLength?: number;
    routeError?: string;
    [key: string]: any;
}

// --- ROUTING SERVICE (Copied) ---
class RoutingService {
    private graph: { [key: string]: { [neighbor: string]: number } } = {};

    constructor(nodes: Node[]) {
        this.buildGraph(nodes);
    }

    private buildGraph(nodes: Node[]) {
        this.graph = {};
        nodes.forEach(node => {
            if (!this.graph[node.name]) {
                this.graph[node.name] = {};
            }
            if (node.relation) {
                const neighbors = node.relation.split(',').map(n => n.trim()).filter(n => n);
                neighbors.forEach(neighbor => {
                    this.graph[node.name][neighbor] = node.linkLength || 1;
                    // Bidirectional
                    if (!this.graph[neighbor]) this.graph[neighbor] = {};
                    this.graph[neighbor][node.name] = node.linkLength || 1;
                });
            }
        });
    }

    public findRoute(start: string, end: string, checkNodeStr?: string): RouteResult {
        const waypoints = checkNodeStr ? checkNodeStr.split(',').map(s => s.trim()).filter(s => s) : [];
        if (waypoints.length > 0) return this.calculatePathWithWaypoints(start, end, waypoints);
        return this.dijkstra(start, end);
    }

    private calculatePathWithWaypoints(start: string, end: string, waypoints: string[]): RouteResult {
        const fullPath: string[] = [start];
        let totalDistance = 0;
        let current = start;

        for (const waypoint of waypoints) {
            const segment = this.dijkstra(current, waypoint);
            if (segment.distance < 0) return { path: [], distance: -1, error: `Cannot reach waypoint ${waypoint}` };
            fullPath.push(...segment.path.slice(1));
            totalDistance += segment.distance;
            current = waypoint;
        }

        const finalSegment = this.dijkstra(current, end);
        if (finalSegment.distance < 0) return { path: [], distance: -1, error: `Cannot reach destination ${end}` };

        fullPath.push(...finalSegment.path.slice(1));
        totalDistance += finalSegment.distance;
        return { path: fullPath, distance: totalDistance };
    }

    private dijkstra(start: string, end: string): RouteResult {
        if (!this.graph[start] || !this.graph[end]) return { path: [], distance: -1, error: "Node not found" };
        if (start === end) return { path: [start], distance: 0 };

        const distances: { [key: string]: number } = {};
        const previous: { [key: string]: string | null } = {};
        const unvisited = new Set<string>();

        // Init
        for (const node in this.graph) {
            distances[node] = Infinity;
            previous[node] = null;
            unvisited.add(node);
        }
        distances[start] = 0;

        while (unvisited.size > 0) {
            let u: string | null = null;
            let minDesc = Infinity;
            for (const node of unvisited) {
                if (distances[node] < minDesc) {
                    minDesc = distances[node];
                    u = node;
                }
            }
            if (u === null || distances[u] === Infinity) break;
            if (u === end) break;

            unvisited.delete(u);

            const neighbors = this.graph[u];
            for (const v in neighbors) {
                if (unvisited.has(v)) {
                    const alt = distances[u] + neighbors[v];
                    if (alt < distances[v]) {
                        distances[v] = alt;
                        previous[v] = u;
                    }
                }
            }
        }

        if (distances[end] === Infinity) return { path: [], distance: -1, error: "Target unreachable" };

        const path: string[] = [];
        let curr: string | null = end;
        while (curr) {
            path.unshift(curr);
            curr = previous[curr];
        }
        return { path, distance: distances[end] };
    }
}

// --- MAIN ---
console.log(`🚀 Starting Cache Generation for ${SHIP_ID}...`);

function loadExcel(filename: string) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
}

// Basic Mappers (Simplified from ExcelService)
function mapNodes(rawData: any[]): Node[] {
    const headers = rawData[0] as string[];
    // Find index of headers
    const findIdx = (keywords: string[]) => {
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
    }).filter(n => n !== null) as Node[];
}

function mapCables(rawData: any[]): Cable[] {
    const headers = rawData[0] as string[];
    // Helper to find exact or close match
    const findIdx = (validHeaders: string[]) => {
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
    }).filter(c => c !== null) as Cable[];
}

const nodesRaw = loadExcel('nodes.xlsx');
const cablesRaw = loadExcel('cables.xlsx');

const nodes = mapNodes(nodesRaw as any[]);
const cables = mapCables(cablesRaw as any[]);

console.log(`✅ Parsed ${nodes.length} nodes, ${cables.length} cables`);

// DEBUG: HEADERS
console.log('--- CABLE HEADERS ---');
console.log(cablesRaw[0]);

// DEBUG: Check first 3 nodes
console.log('--- DEBUG NODES ---');
nodes.slice(0, 3).forEach(n => console.log(`Node: "${n.name}" Relation: "${n.relation}"`));

// DEBUG: Check first 3 cables
console.log('--- DEBUG CABLES ---');
cables.slice(0, 3).forEach(c => console.log(`Cable: ${c.id} From: "${c.fromNode}" To: "${c.toNode}" Check: "${c.checkNode}"`));

const routingService = new RoutingService(nodes);

console.log(`🛣️  Routing...`);
let routed = 0;
cables.forEach((c, i) => {
    if (i < 5) {
        console.log(`Attempting route ${c.id}: ${c.fromNode} -> ${c.toNode}`);
        const res = routingService.findRoute(c.fromNode || '', c.toNode || '', c.checkNode);
        console.log(`Result: ${res.path.length > 0 ? 'Success' : 'Fail: ' + res.error}`);
    }

    if (i % 500 === 0) console.log(`   ${i}/${cables.length}`);
    if (c.fromNode && c.toNode) {
        const res = routingService.findRoute(c.fromNode, c.toNode, c.checkNode);
        if (res.path.length > 0) {
            c.calculatedPath = res.path;
            c.calculatedLength = res.distance;
            routed++;
        } else {
            c.routeError = res.error;
        }
    }
});

const cacheData = {
    cables: cables,
    nodes: nodes,
    cableTypes: [],
    deckHeights: { "TO": 4, "SF": 3, "TW": 2, "PR": 1, "UP": 0 },
    generatedAt: new Date().toISOString()
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cacheData));
console.log(`🎉 Success! Saved to ${OUTPUT_FILE}`);
console.log(`   Routed: ${routed}/${cables.length}`);
console.log(`   Size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);
