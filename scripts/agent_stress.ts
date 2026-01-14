
import { solveSystem } from '../services/traySolverEnhanced';
import { Cable } from '../types';

console.log("?? [Agent 4: Stress] 3000 Cable Load Test...");
const cables: Cable[] = Array(3000).fill(null).map((_, i) => ({
    id: `S${i}`, od: 12, name: `C${i}`, type: 'S'
})) as any;
const start = Date.now();
const result = solveSystem(cables, 1, 200, 60, 900);
const duration = Date.now() - start;
if (duration < 6000 && result.success) {
    console.log(`✅ Stress Passed: ${duration}ms, Tiers: ${result.tiers.length}`);
    process.exit(0);
} else {
    console.error(`❌ Stress Failed: ${duration}ms`);
    process.exit(1);
}
