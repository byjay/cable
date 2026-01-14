
import { solveSystem, validateSystemGravity } from '../services/traySolverEnhanced';
import { Cable } from '../types';

console.log("?? [Agent 1: Physicist] Running Depth-First Gravity Audit...");

const cables: Cable[] = [
    { id: 'C1', od: 50, outerDiameter: 50, name: 'Big1', type: 'Power' },
    { id: 'C2', od: 20, outerDiameter: 20, name: 'Small1', type: 'Control' },
    { id: 'C3', od: 20, outerDiameter: 20, name: 'Small2', type: 'Control' },
    { id: 'C4', od: 20, outerDiameter: 20, name: 'Small3', type: 'Control' },
] as any;

const result = solveSystem(cables, 1, 100, 60, 600);

if (!result.success) {
    console.error("❌ Physical Packing Failed even for small set");
    process.exit(1);
}

for (const tier of result.tiers) {
    const gravityOk = validateSystemGravity(tier.cables);
    if (!gravityOk) {
        console.error(`❌ Tier ${tier.tierIndex} has FLOATING CABLES!`);
        process.exit(1);
    }
}

console.log("✅ Gravity/Collision Physics: PASSED");
process.exit(0);
