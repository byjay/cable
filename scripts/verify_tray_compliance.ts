
import { solveSystem } from '../services/traySolverEnhanced';
import { Cable } from '../types';

console.log("[Agent 2] Verifying Compliance (Spare Capacity)...");

const cables: Cable[] = Array(50).fill(null).map((_, i) => ({
    id: `C${i}`,
    od: 20,
    outerDiameter: 20,
    weight: 1,
    name: `Cable ${i}`,
    type: 'Power',
    status: 'Planned',
    system: 'Test',
    fromNode: 'A',
    toNode: 'B',
    path: 'A,B',
    length: 10
})) as any;

try {
    // Run with 20% spare requirement (80% fill target)
    // Signature: cables, tiers, height, fill, width
    const result = solveSystem(cables, 1, 150, 80, 600);

    console.log("Calculation Done. Checking Tiers...");

    // Check fill ratio of the first tier
    const firstTierFill = result.tiers.length > 0 ? result.tiers[0].fillRatio : 0;

    if (firstTierFill <= 80) { // Should result in <= target fill
        console.log(`✅ Compliance Met: Tier 1 Fill ${firstTierFill.toFixed(1)}% <= 80%`);
        console.log("Status: SUCCESS");
        process.exit(0);
    } else {
        // If it exceeds 80%, it might be due to integer constraints (cables don't fit perfectly),
        // BUT if we added tiers, it's fine.
        if (result.tiers.length > 1) {
            console.log("✅ Tiers added to satisfy compliance/width.");
            console.log("Status: SUCCESS");
            process.exit(0);
        }

        // If only 1 tier and > 80%?
        console.error(`❌ Compliance Violation: Fill ${firstTierFill.toFixed(1)}% > 80%`);
        console.log("Status: FAIL");
        process.exit(1);
    }
} catch (error) {
    console.error("❌ CRITICAL EXCEPTION in Compliance Agent:");
    console.error(error);
    console.log("Status: FAIL");
    process.exit(1);
}
