
import fs from 'fs';
import path from 'path';

console.log("[Agent 2] Verifying UI/UX Design Standards (Glassmorphism)...");

const filePath = path.join(process.cwd(), 'components/TrayAnalysis.tsx');
if (!fs.existsSync(filePath)) {
    console.error("❌ TrayAnalysis.tsx not found");
    process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf-8');
let score = 0;

// Check for Glassmorphism
if (content.includes('backdrop-blur') && content.includes('bg-white/')) {
    console.log("✅ Glassmorphism Base (backdrop-blur) Detected");
    score++;
}

if (content.includes('shadow-md') || content.includes('shadow-lg')) {
    console.log("✅ Depth/Shadow applied");
    score++;
}

// Check for refined inputs
if (content.includes('rounded-full') || content.includes('rounded-lg')) {
    console.log("✅ Modern Border Radius applied");
    score++;
}

console.log(`[Agent 2] UI Integrity Score: ${score}/3`);

if (score >= 3) {
    console.log("Status: SUCCESS - Design Standards Met");
    process.exit(0);
} else {
    console.error("Status: FAIL - Design Standards Violation");
    process.exit(1);
}
