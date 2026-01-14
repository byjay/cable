
import { solveSystem, CableData } from '../services/traySolverEnhanced';

const generateMixedLoad = (count: number): CableData[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `Cab-${i}`,
        name: `CABLE-${i}`,
        type: i % 3 === 0 ? 'Power' : 'Control', // Mixed types
        od: i % 5 === 0 ? 30 : (i % 2 === 0 ? 15 : 10) // Mixed ODs: 30, 15, 10
    }));
};

const runAgentSimulation = (agentId: number, iterations: number) => {
    console.log(`[Agent ${agentId}] Starting ${iterations} calculation cycles...`);
    const cables = generateMixedLoad(50); // Heavy load
    const startTime = performance.now();
    let failureCount = 0;
    let checksum = "";

    for (let i = 0; i < iterations; i++) {
        // Run Solver
        const result = solveSystem(cables, 1, 100, 60);

        // Generate a simple checksum of the result to verify consistency
        const currentChecksum = `${result.systemWidth}-${result.tiers.length}-${result.tiers[0]?.cables.length}`;

        if (i === 0) checksum = currentChecksum;
        if (currentChecksum !== checksum) {
            console.error(`[Agent ${agentId}] MISMATCH at iter ${i}: ${currentChecksum} != ${checksum}`);
            failureCount++;
        }
    }

    const duration = performance.now() - startTime;
    console.log(`[Agent ${agentId}] Completed. Avg Time: ${(duration / iterations).toFixed(2)}ms. Failures: ${failureCount}`);
    return { agentId, checksum, failureCount };
};

console.log("=== MULTI-AGENT STRESS TEST: TRAY STACKING PHYSICS ===");
console.log("Configuration: 5 Agents, 10 Repetitions each.");

const results = [];
for (let i = 1; i <= 5; i++) {
    results.push(runAgentSimulation(i, 10));
}

// Verify Consensus
const firstChecksum = results[0].checksum;
const allAgreed = results.every(r => r.checksum === firstChecksum && r.failureCount === 0);

console.log("\n=== CONSENSUS REPORT ===");
if (allAgreed) {
    console.log("✅ SUCCESS: All 5 Agents agreed on the physics calculation across 10 runs.");
    console.log(`   Consensus Result: Width ${firstChecksum.split('-')[0]}mm, Tiers ${firstChecksum.split('-')[1]}, Cables Placed ${firstChecksum.split('-')[2]}`);
} else {
    console.error("❌ FAILURE: Non-deterministic behavior detected.");
}
