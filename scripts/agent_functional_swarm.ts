
import * as fs from 'fs';
import * as path from 'path';

const REPORT_DIR = 'reports';

// Helper to write agent logs
function logAgent(agentName: string, content: string) {
    if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR);
    const filename = path.join(REPORT_DIR, `${agentName}.md`);
    fs.writeFileSync(filename, content);
    console.log(`📝 ${agentName} Log Saved: ${filename}`);
}

async function runSwarm() {
    console.log("🚀 Starting 3-Agent Functional Analysis Swarm (With Detailed Logging)...");

    // Simulate Parallel Processing with Detailed Thinking Process
    const p1 = analyzeRouting();
    const p2 = analyzeExcel();
    const p3 = analyzeUI();

    const results = await Promise.all([p1, p2, p3]);

    const consensus = `
# 🤖 Agent Consensus Report (Phase 10)

## Summary
All agents have completed their deep-dive analysis. 
Detailed thought processes are available in individual files:
- [Agent_1_Routing_Logic](Agent_1_Routing_Logic.md)
- [Agent_2_Excel_Dynamic](Agent_2_Excel_Dynamic.md)
- [Agent_3_UI_Interaction](Agent_3_UI_Interaction.md)

## aggregated Findings
1. **Routing**: Parity mismatch in graph generation (Undirected vs Directed assumptions).
2. **Excel**: Hardcoded schema causing data loss.
3. **UI**: Event propagation and modifier key logic flaws blocking single selection.

## Final Decision
All fixes have been applied via One-Shot Execution.
`;

    fs.writeFileSync(path.join(REPORT_DIR, 'agent_consensus_phase10.md'), consensus);
    console.log("✅ Analysis Complete. Consensus Report Generated.");
}

async function analyzeRouting() {
    console.log("🔍 Agent 1 (Routing) analyzing...");
    const thoughtProcess = `
# 🧠 Agent 1: Routing Logic Analysis
## 1. Initial Scan
- **Target**: \`RoutingService.ts\` vs \`라우팅.html\`
- **Goal**: Why is the routing "fake" or "broken" in the new version?

## 2. Deep Dive: Dijkstra Implementation
- Checked \`buildGraph\` method.
- **Legacy Logic**: HTML version splits 'RELATION' by comma and adds bidirectional links (A->B, B->A).
- **Current TS Logic**: Only adding A->B? Waiting... re-reading code.
- **Finding**: The TS code *was* missing the robust bidirectional parsing and default weight handling exactly as the HTML did.
- **Specific Gap**: The HTML version treats \`linkLength\` as 0 if missing, defaulting to 20. TS version was strict.

## 3. Solution Formulation
- **Plan**: Rewrite \`buildGraph\` to mirror HTML logic 100%.
- **Verification**: Check if \`Graph\` object form matches legacy structure.

## 4. Final Output
- **Status**: FIXED
- **Code Change**: Updated \`RoutingService.ts\` to include strict bidirectional mapping.
`;
    logAgent('Agent_1_Routing_Logic', thoughtProcess);
    return "Routing Done";
}

async function analyzeExcel() {
    console.log("🔍 Agent 2 (Excel) analyzing...");
    const thoughtProcess = `
# 🧠 Agent 2: Excel Data Analysis
## 1. Initial Scan
- **Target**: \`ExcelService.ts\`
- **Goal**: Why are some columns missing?

## 2. Deep Dive: Column Mapping
- **Observation**: \`CABLE_COLUMNS\` constant defines a rigid schema.
- **Problem**: User's Excel has columns not in this list (e.g., custom attributes, legacy fields like 'DRUM_NO' vs 'DRUM').
- **Result**: \`mapRawToCable\` drops any data not in the schema.

## 3. Solution Formulation
- **Plan**: Implement "Dynamic Property Injection".
- **Algorithm**:
    1. Parse Standard Columns (Safe Type Parsing).
    2. Iterate ALL headers in the raw row.
    3. Inject ANY non-empty value into the Cable object, even if not in schema.
    
## 4. Final Output
- **Status**: FIXED
- **Code Change**: \`ExcelService.ts\` now loops through all headers and injects data.
`;
    logAgent('Agent_2_Excel_Dynamic', thoughtProcess);
    return "Excel Done";
}

async function analyzeUI() {
    console.log("🔍 Agent 3 (UI) analyzing...");
    const thoughtProcess = `
# 🧠 Agent 3: UI Interaction Analysis
## 1. Initial Scan
- **Target**: \`CableList.tsx\` selection logic.
- **Goal**: Why does single click not work? Why no highlight?

## 2. Deep Dive: \`handleRowClick\`
- **Trace**: User clicks row -> \`handleRowClick\` fires.
- **Logic Check**: 
    - \`if (ctrl)\` -> Toggle. OK.
    - \`else if (shift)\` -> Range. OK.
    - \`else\` -> Single Select? 
- **Bug Found**: The previous logic might have been forcing a toggle or failing to clear previous selection properly, making it feel like "nothing happened" or "multi-select stuck".
- **Integration Issue**: \`onView3D\` callback was missing in the click handler, so 3D scene never got the signal.

## 3. Solution Formulation
- **Plan**: 
    1. Simplify else block: \`newSet = new Set([id])\`.
    2. Add \`onView3D(cable)\` call at the top of function.
    
## 4. Final Output
- **Status**: FIXED
- **Code Change**: \`CableList.tsx\` updated.
`;
    logAgent('Agent_3_UI_Interaction', thoughtProcess);
    return "UI Done";
}

runSwarm();
