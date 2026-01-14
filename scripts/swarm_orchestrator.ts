
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const agents = ['physics', 'geometry', 'compliance', 'stress', 'consensus'];
const reportDir = 'test_reports/swarm_cycle_6';

if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

async function runSwarmCycle(cycle: number) {
    console.log(`\n?? [SWARM] Starting Infinite Loop Cycle ${cycle}...`);

    // Run agents 1-4 in parallel (simulated)
    const runAgent = (name: string) => {
        const logPath = path.join(reportDir, `Agent_${name}_Log.txt`);
        console.log(`?? Deploying Agent: ${name}...`);
        try {
            execSync(`npx tsx scripts/agent_${name}.ts > ${logPath} 2>&1`);
            return true;
        } catch (e) {
            return false;
        }
    };

    const results = agents.slice(0, 4).map(a => ({ name: a, success: runAgent(a) }));

    // Run Agent 5 (Consensus) to consolidate
    console.log("?? Deploying Agent: Consensus...");
    runAgent('consensus');

    const consensusLog = fs.readFileSync(path.join(reportDir, `Agent_consensus_Log.txt`), 'utf8');
    if (consensusLog.includes('PASSED')) {
        console.log(`✅ [CYCLE ${cycle}] ALL SYSTEMS STABLE. CONSENSUS ACHIEVED.`);
    } else {
        console.log(`⚠️ [CYCLE ${cycle}] DISAGREEMENT DETECTED. RE-TRIGGERING THINKING LOOP...`);
    }

    // Pause for visibility
    await new Promise(r => setTimeout(r, 2000));

    // Recurse (Infinite Loop per User Request)
    runSwarmCycle(cycle + 1);
}

runSwarmCycle(1);
