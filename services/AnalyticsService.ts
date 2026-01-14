import { Cable, Node, SingleTrayResult, SystemResult } from '../types';

export interface KPIStats {
    totalCables: number;
    routedCables: number;
    completionRate: number;
    totalLengthKm: number;
    totalWeightMT: number;
    averageFillRatio: number;
    highRiskTrays: number; // Trays with Fill Ratio > 40%
    occupancyDistribution: {
        safe: number;      // 0-20%
        moderate: number;  // 20-40%
        heavy: number;     // 40-60%
        critical: number;  // 60%+
    };
}

export class AnalyticsService {
    static calculateKPIs(cables: Cable[], nodes: Node[]): KPIStats {
        const totalCables = cables.length;
        const routedCables = cables.filter(c => c.calculatedPath && c.calculatedPath.length > 0).length;
        const completionRate = totalCables > 0 ? (routedCables / totalCables) * 100 : 0;

        let totalLengthM = 0;
        let totalWeightKg = 0;

        cables.forEach(c => {
            totalLengthM += c.calculatedLength || 0;
            // Assuming weight is per km or total per cable. 
            // Most ship cable lists provide weight as kg/m or total.
            // Let's assume 'weight' in types.ts is total weight of that cable instance.
            totalWeightKg += c.weight || 0;
        });

        const nodeOccupancy = new Map<string, number>();
        cables.forEach(c => {
            if (c.calculatedPath) {
                c.calculatedPath.forEach(nodeName => {
                    nodeOccupancy.set(nodeName, (nodeOccupancy.get(nodeName) || 0) + (c.od || 10));
                });
            }
        });

        let highRiskTrays = 0;
        const distribution = { safe: 0, moderate: 0, heavy: 0, critical: 0 };
        const trayNodes = nodes.filter(n => n.type === 'Tray' || (n.name.startsWith('T') && n.relation));

        trayNodes.forEach(node => {
            const currentOD = nodeOccupancy.get(node.name) || 0;
            const capacity = node.maxCable || 300;
            const ratio = (currentOD / capacity) * 100;

            if (ratio > 40) highRiskTrays++;

            if (ratio <= 20) distribution.safe++;
            else if (ratio <= 40) distribution.moderate++;
            else if (ratio <= 60) distribution.heavy++;
            else distribution.critical++;
        });

        const avgFill = trayNodes.length > 0
            ? trayNodes.reduce((acc, n) => acc + ((nodeOccupancy.get(n.name) || 0) / (n.maxCable || 300)), 0) / trayNodes.length * 100
            : 0;

        return {
            totalCables,
            routedCables,
            completionRate,
            totalLengthKm: totalLengthM / 1000,
            totalWeightMT: totalWeightKg / 1000,
            averageFillRatio: avgFill,
            highRiskTrays,
            occupancyDistribution: distribution
        };
    }
}
