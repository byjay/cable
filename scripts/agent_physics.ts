
import { solveSystem } from '../services/traySolverEnhanced';
import { Cable } from '../types';

console.log("?? [Agent 1: Physicist] Thinking Loop Cycle 2...");
const cables: Cable[] = [
    { id: 'C1', od: 60, name: 'Main Power' },
    { id: 'C2', od: 45, name: 'Power 2' },
    { id: 'C3', od: 30, name: 'Control 1' },
    { id: 'C4', od: 25, name: 'Control 2' },
    { id: 'C5', od: 20, name: 'Data' }
] as any;

const result = solveSystem(cables, 1, 100, 60, 450); // Hard Constraint 450mm
console.log(`Initial Calc: ${result.systemWidth}mm, Tiers: ${result.tiers.length}`);

if (result.systemWidth <= 450 && result.success) {
    console.log("✅ Success: Logic converged on correct size.");
    process.exit(0);
} else {
    // If logic didn't scale tiers when width failed
    console.error(`❌ Logic Failure: Size ${result.systemWidth} exceeds 450 or Success=False`);
    process.exit(1);
}
