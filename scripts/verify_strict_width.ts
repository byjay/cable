
import { solveSingleTier, CableData } from '../services/traySolverEnhanced';

const generateMediumCables = (count: number): CableData[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `M${i}`,
        name: `Medium-${i}`,
        type: 'Power',
        od: 20
    }));
};

console.log("=== CHECKING STRICT WIDTH LIMIT ===");

// 50 cables, 20mm each = 1000mm raw width.
// In a single tier, this requires >1600mm width at standard fill.
const cables = generateMediumCables(50);

// We run solveSingleTier. 
// It SHOULD optimize around 60% fill.
// BUT it should probably NOT exceed standard tray sizes (e.g. 900mm) if we want "standard" trays.
// Or at least, we need to know if it goes crazy (e.g. 4000mm).

const result = solveSingleTier(cables, 0, 100, 60, 1);

console.log(`Result Width: ${result.width}mm`);
console.log(`Result Success: ${result.success}`);

if (result.width > 900) {
    console.error(`FAIL: Solver expanded tray to ${result.width}mm, ignoring practical limits (900mm).`);
} else {
    console.log("SUCCESS: Solver respected width limit.");
}
