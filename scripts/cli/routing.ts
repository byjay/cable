/**
 * CLI: Routing Test
 * Usage: npx tsx scripts/cli/routing.ts
 * 
 * Tests the enhanced routing logic (Dijkstra + findRoute).
 */

import { EnhancedRoutingService } from '../../services/EnhancedRoutingService';
import { Node } from '../../types';

// Sample Node Network
const testNodes: Node[] = [
    { name: 'START', relation: 'A1,A2', linkLength: 0 },
    { name: 'A1', relation: 'START,A2,B1', linkLength: 5 },
    { name: 'A2', relation: 'START,A1,B2', linkLength: 5 },
    { name: 'B1', relation: 'A1,B2,END', linkLength: 10 },
    { name: 'B2', relation: 'A2,B1,END', linkLength: 10 },
    { name: 'END', relation: 'B1,B2', linkLength: 0 },
];

console.log('='.repeat(60));
console.log('🛣️  ROUTING CLI TEST');
console.log('='.repeat(60));

const routingService = new EnhancedRoutingService(testNodes);

// Test 1: Simple Route
console.log('\n🚀 TEST 1: Simple Route (START → END)');
const route1 = routingService.findRoute('START', 'END');
console.log(`   Path: ${route1.path.join(' → ')}`);
console.log(`   Distance: ${route1.distance}`);
console.log(`   Status: ${route1.error ? '❌ ' + route1.error : '✅ SUCCESS'}`);

// Test 2: Route with Waypoint (Check Node)
console.log('\n🚀 TEST 2: Route with Waypoint (START → B1 → END)');
const route2 = routingService.findRoute('START', 'END', 'B1');
console.log(`   Path: ${route2.path.join(' → ')}`);
console.log(`   Distance: ${route2.distance}`);
console.log(`   Status: ${route2.error ? '❌ ' + route2.error : '✅ SUCCESS'}`);

// Test 3: Invalid Route
console.log('\n🚀 TEST 3: Invalid Route (START → UNKNOWN)');
const route3 = routingService.findRoute('START', 'UNKNOWN');
console.log(`   Path: ${route3.path.length > 0 ? route3.path.join(' → ') : 'N/A'}`);
console.log(`   Status: ${route3.error ? '❌ ' + route3.error : '✅ SUCCESS'}`);

console.log('\n' + '='.repeat(60));
console.log('✅ ROUTING CLI TEST COMPLETE');
console.log('='.repeat(60));
