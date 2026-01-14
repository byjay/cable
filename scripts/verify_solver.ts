
import { solveSystem, CableData } from '../services/traySolverEnhanced';

// Helper to generate mock cables
const generateCables = (count: number, type: 'Large' | 'Small' | 'Mixed'): CableData[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `C${i}`,
        name: `Cable-${i}`,
        type: 'Power',
        od: type === 'Large' ? 35 : (type === 'Small' ? 12 : (i % 2 === 0 ? 35 : 12))
    }));
};

console.log("=== STARTING TRIPLE SYSTEM VERIFICATION ===");

// TEST 1: Baseline (Easy)
console.log("\n[TEST 1/3] Baseline Check: Small Load");
const cables1 = generateCables(5, 'Small');
const result1 = solveSystem(cables1, 1, 100, 60);
console.log(`Success: ${result1.success}, Width: ${result1.systemWidth}, Fill: ${result1.tiers[0]?.fillRatio.toFixed(1)}%`);
if (!result1.success) console.error("TEST 1 FAILED: Should have succeeded easily.");

// TEST 2: Stress (Heavy)
console.log("\n[TEST 2/3] Stress Check: Heavy Load (Large Cables)");
const cables2 = generateCables(20, 'Large');
// 20 cables * 35mm = 700mm raw width. 
// If we limit height/tiers, it might struggle or expand width significantly.
const result2 = solveSystem(cables2, 1, 100, 60);
console.log(`Success: ${result2.success}, Width: ${result2.systemWidth}, Tiers: ${result2.tiers.length}`);
if (result2.systemWidth < 600) console.warn("TEST 2 WARNING: Width seems suspiciously low for 20 large cables.");

// TEST 3: Complex (Stacking)
console.log("\n[TEST 3/3] Logic Check: Mixed Stacking (Large & Small)");
const cables3 = generateCables(30, 'Mixed'); // 15 Large, 15 Small
const result3 = solveSystem(cables3, 2, 100, 60); // 2 Tiers allowed
console.log(`Success: ${result3.success}, Width: ${result3.systemWidth}, Tiers: ${result3.tiers.length}`);
result3.tiers.forEach((t, i) => {
    console.log(` Tier ${i + 1}: ${t.cables.length} cables, Fill ${t.fillRatio.toFixed(1)}%`);
});

console.log("\n=== VERIFICATION COMPLETE ===");
