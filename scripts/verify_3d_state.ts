
import fs from 'fs';
import path from 'path';

console.log("[Agent 1] Analyzing 3D Viewer Integration...");

// Paths
const componentsDir = path.join(process.cwd(), 'components');
const threeScenePath = path.join(componentsDir, 'ThreeScene.tsx');
const cableListPath = path.join(componentsDir, 'CableList.tsx');
const appPath = path.join(process.cwd(), 'App.tsx');

// Check Files
if (!fs.existsSync(threeScenePath)) throw new Error("ThreeScene.tsx missing");
if (!fs.existsSync(cableListPath)) throw new Error("CableList.tsx missing");
if (!fs.existsSync(appPath)) throw new Error("App.tsx missing");

// Analyze Content
const threeContent = fs.readFileSync(threeScenePath, 'utf-8');
const listContent = fs.readFileSync(cableListPath, 'utf-8');
const appContent = fs.readFileSync(appPath, 'utf-8');

// Check Prop Handling
let score = 0;

if (threeContent.includes('selectedCableId')) {
    console.log("✅ ThreeScene receives selectedCableId");
    score++;
} else {
    console.error("❌ ThreeScene missing selectedCableId prop");
}

if (listContent.includes('onSelectCable') || listContent.includes('selectedCableId')) {
    console.log("✅ CableList handles selection state");
    score++;
}

// Check if highlighted in 3D
if (threeContent.includes('highlightPath') || threeContent.includes('color')) {
    console.log("✅ ThreeScene implements highlighting logic");
    score++;
}

// CRITICAL FIX CHECK: Does App.tsx handle legacy path strings?
if (appContent.includes('cable.path.split') && appContent.includes('filter(s => s)')) {
    console.log("✅ App.tsx: Robust Path Parsing (Legacy Support) Implementation Found");
    score += 2; // Critical Weight
} else {
    console.error("❌ App.tsx: CRITICAL - Legacy Path Parsing Logic MISSING");
}

console.log(`[Agent 1] Integration Score: ${score}/5`);

if (score >= 5) {
    console.log("[Agent 1] 3D Viewer Integration State: HEALTHY");
    console.log("Status: SUCCESS");
    process.exit(0);
} else {
    console.error("[Agent 1] Integration Issues Detected");
    console.log("Status: FAIL");
    process.exit(1);
}
