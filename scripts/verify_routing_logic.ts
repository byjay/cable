import { RoutingService } from '../services/RoutingService';
import { Node } from '../types';

const mockNodes: Node[] = [
    { name: 'A', relation: 'B', linkLength: 10 },
    { name: 'B', relation: 'A, C, D', linkLength: 10 },
    { name: 'C', relation: 'B, E', linkLength: 10 },
    { name: 'D', relation: 'B, E', linkLength: 50 }, // Longer path but initially only option
    { name: 'E', relation: 'C, D', linkLength: 10 }
];

async function testCapacityRouting() {
    const svc = new RoutingService(mockNodes);

    console.log('--- Case 1: Standard Shortest Path ---');
    const route1 = svc.findRoute('A', 'E');
    console.log('Path:', route1.path.join(' -> '), 'Distance:', route1.distance);
    // Expected: A -> B -> C -> E (Distance: 30)

    console.log('\n--- Case 2: Capacity-Aware (C is Crowded) ---');
    // Apply 20x penalty to Node C
    svc.setPenalties({ 'C': 20.0 });
    const route2 = svc.findRoute('A', 'E');
    console.log('Path:', route2.path.join(' -> '), 'Distance:', route2.distance);
    // Expected: A -> B -> D -> E (Distance: 70) 
    // Because Path C (10+10*20+10 = 220) is now much costlier than Path D (10+50+10 = 70)

    if (route2.path.includes('D') && !route2.path.includes('C')) {
        console.log('\n✅ SUCCESS: Routing engine correctly avoided crowded Node C.');
    } else {
        console.log('\n❌ FAILURE: Routing engine did not avoid crowded node.');
        process.exit(1);
    }
}

testCapacityRouting().catch(console.error);
