
import fs from 'fs';
import path from 'path';

console.log("[Agent 4] Verifying Build/Code Size Performance...");

const componentsDir = path.join(process.cwd(), 'components');
const servicesDir = path.join(process.cwd(), 'services');

function getDirSize(dirPath: string) {
    let size = 0;
    const files = fs.readdirSync(dirPath);
    for (const i in files) {
        const filePath = path.join(dirPath, files[i]);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
            size += stats.size;
        }
    }
    return size;
}

const compSize = getDirSize(componentsDir);
const servSize = getDirSize(servicesDir);
const totalSizeKB = (compSize + servSize) / 1024;

console.log(`Total Source Size: ${totalSizeKB.toFixed(2)} KB`);

// Arbitrary limit for "Code Bloat" check
if (totalSizeKB < 2000) { // Less than 2MB source
    console.log("✅ Code Size within acceptable limits");
    console.log("Status: SUCCESS");
    process.exit(0);
} else {
    console.error("❌ Code Size EXCEEDS limits (Bloat Detected)");
    console.log("Status: FAIL");
    process.exit(1);
}
