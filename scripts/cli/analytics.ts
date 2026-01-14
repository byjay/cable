/**
 * CLI: Analytics/KPI Test
 * Usage: npx tsx scripts/cli/analytics.ts
 * 
 * Tests the KPI calculation engine (static method).
 */

import { AnalyticsService } from '../../services/AnalyticsService';
import { Cable, Node } from '../../types';

// Sample Data
const testCables: Cable[] = [
    { id: '1', name: 'CBL-001', type: 'POWER', od: 35, length: 150, system: 'PWR', fromNode: 'A1', toNode: 'B1', calculatedPath: ['A1', 'T1', 'B1'], calculatedLength: 150, weight: 25 },
    { id: '2', name: 'CBL-002', type: 'POWER', od: 28, length: 200, system: 'PWR', fromNode: 'A2', toNode: 'B2', calculatedPath: ['A2', 'T1', 'B2'], calculatedLength: 200, weight: 18 },
    { id: '3', name: 'CBL-003', type: 'SIGNAL', od: 12, length: 100, system: 'SIG', fromNode: 'C1', toNode: 'D1', calculatedLength: 100, weight: 5 },
    { id: '4', name: 'CBL-004', type: 'COMM', od: 18, length: 80, system: 'COM', fromNode: 'E1', toNode: 'F1', calculatedPath: ['E1', 'T2', 'F1'], calculatedLength: 80, weight: 8 },
];

const testNodes: Node[] = [
    { name: 'T1', relation: 'A1,A2,B1,B2', linkLength: 10, type: 'Tray', maxCable: 300 },
    { name: 'T2', relation: 'E1,F1', linkLength: 8, type: 'Tray', maxCable: 200 },
];

console.log('='.repeat(60));
console.log('📊 ANALYTICS CLI TEST');
console.log('='.repeat(60));

// Static method call
const kpis = AnalyticsService.calculateKPIs(testCables, testNodes);

console.log('\n📈 KPI RESULTS:');
console.log(`   Total Cables: ${kpis.totalCables}`);
console.log(`   Routed Cables: ${kpis.routedCables}`);
console.log(`   Completion Rate: ${kpis.completionRate.toFixed(1)}%`);
console.log(`   Total Length: ${kpis.totalLengthKm.toFixed(2)} km`);
console.log(`   Total Weight: ${kpis.totalWeightMT.toFixed(3)} MT`);
console.log(`   Average Fill Ratio: ${kpis.averageFillRatio.toFixed(1)}%`);
console.log(`   High Risk Trays (>40%): ${kpis.highRiskTrays}`);

console.log('\n📊 OCCUPANCY DISTRIBUTION:');
console.log(`   Safe (0-20%): ${kpis.occupancyDistribution.safe}`);
console.log(`   Moderate (20-40%): ${kpis.occupancyDistribution.moderate}`);
console.log(`   Heavy (40-60%): ${kpis.occupancyDistribution.heavy}`);
console.log(`   Critical (60%+): ${kpis.occupancyDistribution.critical}`);

console.log('\n' + '='.repeat(60));
console.log('✅ ANALYTICS CLI TEST COMPLETE');
console.log('='.repeat(60));
