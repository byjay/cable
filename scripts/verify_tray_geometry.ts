
import { solveSystem } from '../services/traySolverEnhanced';
import { Cable } from '../types';

console.log("[Agent 3] Verifying Geometry & Limits (900mm)...");

// MASSIVE LOAD to force > 900mm
const cables: Cable[] = Array(500).fill(null).map((_, i) => ({
    id: `C${i}`,
    od: 30,
    outerDiameter: 30, // Big cables
    weight: 2,
    name: `Cable ${i}`,
    type: 'Power',
    status: 'Planned',
    system: 'Test',
    fromNode: 'A',
    toNode: 'B',
    path: 'A,B',
    length: 10
})) as any;

// Use userMaxTrayWidth = 900
const result = solveSystem(cables, 1, 150, 100, 900);

console.log(`Result: Width ${result.systemWidth}mm, Tiers ${result.tiers.length}`);

if (result.systemWidth <= 900) {
    if (result.tiers.length >= 2) {
        console.log("✅ Smart Auto-Tiering Confirmed: Kept width <= 900 by adding tiers.");
        console.log("Status: SUCCESS");
        process.exit(0);
    } else {
        // If it fits in 1 tier? 500 * (PI*15^2) = 500 * 706 = 353,000 area.
        // 900 * 150 = 135,000 area.
        // It definitely needs tiers.
        console.error("❌ Logic Failure: Should have added tiers but didn't (Physics violation).");
        console.log("Status: FAIL");
        process.exit(1);
    }
} else {
    console.error(`❌ Constraint Violation: Width ${result.systemWidth} > 900mm`);
    console.log("Status: FAIL");
    process.exit(1);
}
