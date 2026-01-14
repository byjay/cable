
import { solveSystem, CableData } from '../services/traySolverEnhanced';

const generateLargeCables = (count: number): CableData[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `L${i}`,
        name: `Large-${i}`,
        type: 'Power',
        od: 30 // Large cables, harder to stack
    }));
};

console.log("=== CHECKING AUTO-TIERING LOGIC ===");

// 100 Large cables.
// 30mm * 100 = 3000mm raw width.
// At 60% fill, width ~ 5000mm. 
// A single tier of 5000mm is unreal. It SHOULD be split into multiple tiers.
const cables = generateLargeCables(100);

// Request 1 Tier (Default behavior)
const result = solveSystem(cables, 1, 100, 60);

console.log(`Requested Tiers: 1`);
console.log(`Result: Success=${result.success}`);
console.log(`Result Tiers: ${result.tiers.length}`);
console.log(`Result System Width: ${result.systemWidth}mm`);

if (result.tiers.length === 1 && result.systemWidth > 900) {
    console.error("ISSUE: System kept 1 Tier despite huge width (>900mm). Auto-tiering is missing.");
} else if (result.tiers.length > 1) {
    console.log("SUCCESS: System automatically added tiers.");
} else {
    console.log("NOTE: Width is small enough?");
}
