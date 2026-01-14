
import { solveSystem } from '../services/traySolverEnhanced';
import { Cable } from '../types';

console.log("?? [Agent 2: Compliance] Fill Ratio Check...");
const cables: Cable[] = Array(50).fill(null).map((_, i) => ({
    id: `C${i}`, od: 15, name: `C${i}`, type: 'C'
})) as any;
const result = solveSystem(cables, 1, 150, 70, 600);
const fill = result.tiers[0]?.fillRatio || 0;
if (fill <= 75) {
    console.log(`✅ Compliance Met: ${fill.toFixed(1)}%`);
    process.exit(0);
} else {
    console.error(`❌ Fill Overlimit: ${fill}%`);
    process.exit(1);
}
