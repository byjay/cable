
import { solveSystem } from '../services/traySolverEnhanced';
import { Cable } from '../types';

console.log("[Agent 1] Verifying Physics & Area Math...");

// Mock Cables: 100 cables, each 10mm diameter
// Area = PI * (5)^2 = 78.54 sq mm * 100 = 7854 sq mm.
const cables: Cable[] = Array(100).fill(null).map((_, i) => ({
    id: `C${i}`,
    od: 10, // Use 'od' as per interface
    outerDiameter: 10,
    weight: 1,
    name: `Cable ${i}`,
    type: 'Power', // Add type
    status: 'Planned',
    system: 'Test',
    fromNode: 'A',
    toNode: 'B',
    path: 'A,B',
    length: 10
})) as any; // Cast to avoid strict Cable interface issues if minor props missing

// Solve
try {
    const result = solveSystem(cables, 2, 100, 60); // tiers=2, height=100, fill=60

    console.log(`Calculation Complete. Result Width: ${result.systemWidth}, Tiers: ${result.tiers.length}`);

    if (result.systemWidth > 0 && result.tiers.length >= 1) {
        // Validation: calculated width should be reasonable (e.g. around 7854 area -> width ~800 for 1 tier, or 400 for 2)
        console.log(`✅ Solution Found: Width ${result.systemWidth}, Tiers ${result.tiers.length}`);

        if (result.systemWidth > 900) {
            console.error("❌ Width Violation: > 900mm");
            console.log("Status: FAIL");
            process.exit(1);
        }

        console.log("Status: SUCCESS");
        process.exit(0);
    } else {
        console.error(`❌ Physics Calculation Failed: Width ${result.systemWidth}`);
        console.log("Status: FAIL");
        process.exit(1);
    }
} catch (error) {
    console.error("❌ CRITICAL EXCEPTION in solveSystem:");
    console.error(error);
    console.log("Status: FAIL");
    process.exit(1);
}
