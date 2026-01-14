
import fs from 'fs';
import path from 'path';

console.log("?? [Agent 5: Consensus] Aggregating Results...");
const dir = path.join(process.cwd(), 'test_reports/swarm_cycle_5');
const agents = ['Physics', 'Compliance', 'Geometry', 'Stress'];

const check = () => {
    let passCount = 0;
    agents.forEach(a => {
        const p = path.join(dir, `Agent_${a}_Log.txt`);
        if (fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes('✅')) passCount++;
    });
    if (passCount === 4) {
        console.log("??? ALL AGENTS PASSED. FINAL SIGN-OFF. ???");
        process.exit(0);
    } else {
        setTimeout(check, 1000);
    }
};
check();
