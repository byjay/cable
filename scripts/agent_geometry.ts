
import { solveSystem } from '../services/traySolverEnhanced';
import { Cable } from '../types';

console.log("?? [Agent 3: Geometry] Hard Constraint Cycle 2...");
// Force a width conflict
const bigCables: Cable[] = Array(15).fill(null).map((_, i) => ({
    id: `B${i}`, od: 40, name: `Big${i}`
})) as any;

// 15 * 40mm = 600mm floor. If we set limit to 300, it MUST have 2 tiers.
const result = solveSystem(bigCables, 1, 100, 60, 300);

console.log(`Constraint: 300mm. Result: ${result.systemWidth}mm, Tiers: ${result.tiers.length}`);

if (result.systemWidth <= 300 && result.tiers.length >= 2) {
    console.log("✅ Geometry: Correct Auto-Tiering on constraint violation.");
    process.exit(0);
} else {
    console.error("❌ Geometry: Failed to honor hard width constraint.");
    process.exit(1);
}
