/**
 * CLI: Tray Solver Test
 * Usage: npx tsx scripts/cli/solver.ts
 * 
 * Tests the enhanced tray stacking logic with sample data.
 */

import { solveSystem, solveSingleTier } from '../../services/traySolverEnhanced';
import { CableData } from '../../types';

// Sample Test Data
const testCables: CableData[] = [
    { id: '1', name: 'POWER-001', type: 'POWER', od: 35, system: 'PWR', fromNode: 'A1' },
    { id: '2', name: 'POWER-002', type: 'POWER', od: 28, system: 'PWR', fromNode: 'A2' },
    { id: '3', name: 'SIGNAL-001', type: 'SIGNAL', od: 12, system: 'SIG', fromNode: 'B1' },
    { id: '4', name: 'SIGNAL-002', type: 'SIGNAL', od: 10, system: 'SIG', fromNode: 'B2' },
    { id: '5', name: 'COMM-001', type: 'COMM', od: 18, system: 'COM', fromNode: 'C1' },
    { id: '6', name: 'POWER-003', type: 'POWER', od: 45, system: 'PWR', fromNode: 'A3' },
    { id: '7', name: 'SIGNAL-003', type: 'SIGNAL', od: 8, system: 'SIG', fromNode: 'B3' },
    { id: '8', name: 'COMM-002', type: 'COMM', od: 22, system: 'COM', fromNode: 'C2' },
];

console.log('='.repeat(60));
console.log('🔧 TRAY SOLVER CLI TEST');
console.log('='.repeat(60));

// Test 1: Single Tier Auto
console.log('\n📦 TEST 1: Single Tier (Auto Width)');
const result1 = solveSingleTier(testCables, 0, 60, 40);
console.log(`   Width: ${result1.width}mm`);
console.log(`   Fill Ratio: ${result1.fillRatio.toFixed(1)}%`);
console.log(`   Max Stack Height: ${result1.maxStackHeight.toFixed(1)}mm`);
console.log(`   Cables Placed: ${result1.cables.length}/${testCables.length}`);
console.log(`   Status: ${result1.success ? '✅ SUCCESS' : '❌ FAILED'}`);

// Test 2: Multi Tier (2 Tiers)
console.log('\n📦 TEST 2: System (2 Tiers, Auto Width)');
const result2 = solveSystem(testCables, 2, 60, 40);
console.log(`   System Width: ${result2.systemWidth}mm`);
console.log(`   Tiers: ${result2.tiers.length}`);
result2.tiers.forEach((t, i) => {
    console.log(`   ├─ Tier ${i + 1}: ${t.cables.length} cables, Fill: ${t.fillRatio.toFixed(1)}%, H: ${t.maxStackHeight.toFixed(1)}mm`);
});
console.log(`   Status: ${result2.success ? '✅ SUCCESS' : '❌ FAILED'}`);

// Test 3: Fixed Width
console.log('\n📦 TEST 3: Fixed Width (300mm)');
const result3 = solveSingleTier(testCables, 0, 60, 40, 300);
console.log(`   Width: ${result3.width}mm (Fixed)`);
console.log(`   Fill Ratio: ${result3.fillRatio.toFixed(1)}%`);
console.log(`   Max Stack Height: ${result3.maxStackHeight.toFixed(1)}mm`);
console.log(`   Status: ${result3.success ? '✅ SUCCESS' : '❌ FAILED'}`);

console.log('\n' + '='.repeat(60));
console.log('✅ SOLVER CLI TEST COMPLETE');
console.log('='.repeat(60));
