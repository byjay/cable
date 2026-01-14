// Enhanced Agent Script with MD History Logging
// Each agent appends its results to its own persistent MD file

import { solveSystem, validateSystemGravity } from '../services/traySolverEnhanced';
import fs from 'fs';
import path from 'path';

const AGENT_DOCS_DIR = 'docs/agents';

interface AgentResult {
    timestamp: string;
    cycle: number;
    test: string;
    result: 'PASS' | 'FAIL';
    details: string;
}

function appendToAgentLog(agentNumber: number, agentName: string, result: AgentResult) {
    const filePath = path.join(AGENT_DOCS_DIR, `agent_${agentNumber}_${agentName.toLowerCase()}.md`);

    const entry = `
### [${result.timestamp}] Cycle ${result.cycle}
- **테스트**: ${result.test}
- **결과**: ${result.result === 'PASS' ? '✅ PASS' : '❌ FAIL'}
- **상세**: ${result.details}
`;

    // Read existing content
    let content = '';
    if (fs.existsSync(filePath)) {
        content = fs.readFileSync(filePath, 'utf8');
    }

    // Find the "## 작업 히스토리" section and insert after it
    const historyMarker = '## 작업 히스토리';
    const insertIndex = content.indexOf(historyMarker);

    if (insertIndex !== -1) {
        const afterMarker = insertIndex + historyMarker.length;
        const newContent = content.slice(0, afterMarker) + '\n' + entry + content.slice(afterMarker);
        fs.writeFileSync(filePath, newContent);
    } else {
        // Append at the end if marker not found
        fs.appendFileSync(filePath, entry);
    }

    console.log(`📝 [Agent ${agentNumber}] Result logged to ${filePath}`);
}

// Agent 1: Physics
export function runPhysicsAgent(cycle: number) {
    console.log(`🔬 [Agent 1: Physics] Thinking Loop Cycle ${cycle}...`);

    const testCables = Array.from({ length: 10 }, (_, i) => ({
        id: `C${i}`, name: `Cable${i}`, type: 'Power', od: 10 + (i % 5) * 2
    }));

    const result = solveSystem(testCables, 1, 60, 50, 900);
    const passed = result.success && result.tiers.every(t =>
        t.cables.every(c => c.y + c.od / 2 <= 60)
    );

    appendToAgentLog(1, 'physics', {
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        cycle,
        test: '물리 규격 검증 (60mm 제한)',
        result: passed ? 'PASS' : 'FAIL',
        details: `${result.systemWidth}mm, ${result.tiers.length} Tier(s)`
    });

    return passed;
}

// Agent 2: Geometry
export function runGeometryAgent(cycle: number) {
    console.log(`📐 [Agent 2: Geometry] Hard Constraint Cycle ${cycle}...`);

    const testCables = Array.from({ length: 50 }, (_, i) => ({
        id: `C${i}`, name: `Cable${i}`, type: 'Control', od: 15
    }));

    const result = solveSystem(testCables, 1, 60, 50, 300);
    const passed = result.success && result.systemWidth <= 300;

    appendToAgentLog(2, 'geometry', {
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        cycle,
        test: 'Hard Constraint 검증 (300mm 제약)',
        result: passed ? 'PASS' : 'FAIL',
        details: `${result.systemWidth}mm, ${result.tiers.length} Tier(s) - Auto-Tiering: ${result.tiers.length > 1 ? 'YES' : 'NO'}`
    });

    return passed;
}

// Agent 3: Compliance
export function runComplianceAgent(cycle: number) {
    console.log(`📋 [Agent 3: Compliance] Fill Ratio Check Cycle ${cycle}...`);

    const testCables = Array.from({ length: 20 }, (_, i) => ({
        id: `C${i}`, name: `Cable${i}`, type: 'Signal', od: 8
    }));

    const result = solveSystem(testCables, 1, 60, 50, 900);
    const avgFillRatio = result.tiers.reduce((sum, t) => sum + t.fillRatio, 0) / result.tiers.length;
    const passed = result.success && avgFillRatio >= 30 && avgFillRatio <= 70;

    appendToAgentLog(3, 'compliance', {
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        cycle,
        test: 'Fill Ratio 규정 준수',
        result: passed ? 'PASS' : 'FAIL',
        details: `${avgFillRatio.toFixed(1)}% (목표: 50%)`
    });

    return passed;
}

// Agent 4: Stress
export function runStressAgent(cycle: number) {
    console.log(`💪 [Agent 4: Stress] 3000 Cable Load Test Cycle ${cycle}...`);

    const start = Date.now();
    const testCables = Array.from({ length: 3000 }, (_, i) => ({
        id: `C${i}`, name: `Cable${i}`, type: 'Mixed', od: 5 + (i % 20)
    }));

    try {
        const result = solveSystem(testCables, 5, 60, 50, 900);
        const elapsed = Date.now() - start;
        const passed = result.success && elapsed < 30000;

        appendToAgentLog(4, 'stress', {
            timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
            cycle,
            test: '3000 케이블 고부하 테스트',
            result: passed ? 'PASS' : 'FAIL',
            details: `${elapsed}ms 소요 (제한: 30000ms)`
        });

        return passed;
    } catch (e: any) {
        appendToAgentLog(4, 'stress', {
            timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
            cycle,
            test: '3000 케이블 고부하 테스트',
            result: 'FAIL',
            details: `Error: ${e.message}`
        });
        return false;
    }
}

// Agent 5: Consensus
export function runConsensusAgent(cycle: number, results: { [key: string]: boolean }) {
    console.log(`🤝 [Agent 5: Consensus] Aggregating Results Cycle ${cycle}...`);

    const passCount = Object.values(results).filter(r => r).length;
    const totalCount = Object.keys(results).length;
    const corePass = results.physics && results.geometry && results.compliance;
    const approved = corePass;

    appendToAgentLog(5, 'consensus', {
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        cycle,
        test: `전체 통합 검증 (${passCount}/${totalCount})`,
        result: approved ? 'PASS' : 'FAIL',
        details: `Physics:${results.physics ? '✅' : '❌'} Geometry:${results.geometry ? '✅' : '❌'} Compliance:${results.compliance ? '✅' : '❌'} Stress:${results.stress ? '✅' : '❌'} → ${approved ? '배포 승인' : '재검토 필요'}`
    });

    return approved;
}
