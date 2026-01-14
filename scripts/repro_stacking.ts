
import { solveSingleTier, CableData } from '../services/traySolverEnhanced';

const generateSmallCables = (count: number): CableData[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `S${i}`,
        name: `Small-${i}`,
        type: 'Control',
        od: 10 // 10mm OD
    }));
};

console.log("=== CHECKING CABLE STACKING (LAYERING) ===");

// 30 cables of 10mm OD. 
// Total width approx 300mm if side-by-side.
// We force a width of 150mm. They MUST stack to fit.
const cables = generateSmallCables(30);
const width = 150;
const heightLimit = 100;
const stackingLimit = 4; // Allow up to 4 layers

const result = solveSingleTier(cables, 0, heightLimit, 60, stackingLimit);

// Check manually by forcing width constraint validation
// solveSingleTier tries to find *best* width, it doesn't enforce 'width'.
// Wait, solveSingleTierAtFixedWidth does. 
// Let's use solveSystemAtWidth or just call the internal logic if accessible?
// Verify_solver used solveSystem. 
// I'll use solveSystemAtWidth if available or simulate it.
// Actually `solveSingleTier` inside tries widths.
// I will check if the result uses width < 300 and has layers > 1.

console.log(`Result: Success=${result.success}, Width=${result.width}, Fill=${result.fillRatio.toFixed(1)}%`);
console.log(`Total Cables: ${result.cables.length}`);

// Analyze Layers
const layers = new Map<number, number>();
result.cables.forEach(c => {
    const l = c.layer || 1;
    layers.set(l, (layers.get(l) || 0) + 1);
});

console.log("Layer Distribution:");
[1, 2, 3, 4].forEach(l => {
    console.log(` Layer ${l}: ${layers.get(l) || 0} cables`);
});

if ((layers.get(2) || 0) === 0) {
    console.error("FAIL: No cables in Layer 2! Stacking is NOT working.");
} else {
    console.log("SUCCESS: Cables are stacking.");
}

// Print Y coordinates of first few
console.log("Sample Y coordinates:");
result.cables.slice(0, 5).forEach(c => console.log(` ${c.name}: y=${c.y.toFixed(1)}, layer=${c.layer}`));

