
import fs from 'fs';
import path from 'path';

console.log("[Agent 5] Consensus Watchdog Starting...");

const REPORT_DIR = path.join(process.cwd(), 'test_reports/tray_perfection');
const AGENTS = ['Physics', 'Compliance', 'Geometry', 'Stress'];

// Poll for logs
const checkLogs = () => {
    let allPassed = true;
    let pending = false;

    console.log("--- Polling Agent Status ---");

    for (const agent of AGENTS) {
        const logPath = path.join(REPORT_DIR, `Agent_${agent}_Log.txt`);
        if (fs.existsSync(logPath)) {
            const content = fs.readFileSync(logPath, 'utf8');
            if (content.includes("Status: SUCCESS")) {
                console.log(`✅ Agent ${agent}: PASSED`);
            } else if (content.includes("Status: FAIL")) {
                console.log(`❌ Agent ${agent}: FAILED`);
                allPassed = false;
            } else {
                console.log(`⏳ Agent ${agent}: RUNNING/UNKNOWN`);
                pending = true;
            }
        } else {
            console.log(`⏳ Agent ${agent}: PENDING`);
            pending = true;
        }
    }

    if (!pending) {
        if (allPassed) {
            console.log("\n??? ALL SYSTEMS GO. LOGIC PERFECT. ???");
            console.log("Status: SUCCESS");
            process.exit(0);
        } else {
            console.error("\n??? SYSTEM FAILURE DETECTED. ???");
            console.log("Status: FAIL");
            process.exit(1);
        }
    } else {
        // Keep polling
        setTimeout(checkLogs, 1000);
    }
};

// Start Polling
checkLogs();
