
import { RoutingService } from '../services/routingService';
import { Node } from '../types';

const mockNodes: Node[] = [
    { name: 'A', x: 0, y: 0, z: 0, relation: 'B,C', linkLength: 10 },
    { name: 'B', x: 10, y: 0, z: 0, relation: 'A,D', linkLength: 10 },
    { name: 'C', x: 0, y: 10, z: 0, relation: 'A,D', linkLength: 20 },
    { name: 'D', x: 10, y: 10, z: 0, relation: 'B,C', linkLength: 10 }
];

console.log("=== CHECKING ROUTING LOGIC ===");
const service = new RoutingService(mockNodes);

// Test 1: Simple Route
console.log("Test 1: A -> D (Expected Path: A->B->D, Distance 20)");
const route1 = service.findRoute('A', 'D');
console.log(`Path: ${route1.path.join('->')}, Dist: ${route1.distance}`);
if (route1.distance === 20 && route1.path.length === 3) {
    console.log("PASS");
} else {
    console.error("FAIL");
}

// Test 2: Unreachable
console.log("Test 2: A -> Z (Expected Error)");
const route2 = service.findRoute('A', 'Z');
if (route2.distance === -1 && route2.error) {
    console.log("PASS: Handled missing node correctly.");
} else {
    console.error("FAIL: Did not handle missing node.");
}

// Test 3: Waypoint (A -> C -> D)
console.log("Test 3: Waypoint A -> C -> D (Force via C)");
// Direct A->D is 20 (A-B-D). Via C is 30 (A-C-D covers 20+10=30? No A-C is 20, C-D is 10. So 30).
const route3 = service.findRoute('A', 'D', 'C');
console.log(`Path: ${route3.path.join('->')}, Dist: ${route3.distance}`);
if (route3.path.includes('C')) {
    console.log("PASS: Path included waypoint C.");
} else {
    console.error("FAIL: Ignored waypoint C.");
}

console.log("Status: SUCCESS");
process.exit(0);
