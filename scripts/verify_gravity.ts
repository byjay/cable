
import { solveSingleTier, CableData, PlacedCable } from '../services/traySolverEnhanced';

const generateGravityTestCables = (count: number): CableData[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `G-${i}`,
        name: `Grav-${i}`,
        type: 'Power',
        od: 20
    }));
};

const checkGravity = (cables: PlacedCable[]): number => {
    let floaters = 0;
    cables.forEach(c => {
        const r = c.od / 2;
        // Floor check
        if (c.y <= r + 0.5) return; // Supported by floor

        // Support check
        let supported = false;
        cables.forEach(other => {
            if (c.id === other.id) return;
            const dist = Math.sqrt(Math.pow(c.x - other.x, 2) + Math.pow(c.y - other.y, 2));
            // Check if touching (within tolerance) AND other is below
            if (Math.abs(dist - (r + other.od / 2)) < 1.0 && other.y < c.y) {
                supported = true;
            }
        });

        if (!supported) {
            console.error(`FLOATER DETECTED: ${c.name} at x=${c.x.toFixed(1)}, y=${c.y.toFixed(1)}`);
            floaters++;
        }
    });
    return floaters;
};

console.log("=== CHECKING GRAVITY COMPLIANCE ===");

const cables = generateGravityTestCables(20);
// Run solver
const result = solveSingleTier(cables, 0, 100, 60, 4);

console.log(`Placed: ${result.cables.length}`);
const floaters = checkGravity(result.cables);

if (floaters > 0) {
    console.log(`FAIL: ${floaters} cables are floating!`);
} else {
    console.log("SUCCESS: All cables physically supported.");
}
