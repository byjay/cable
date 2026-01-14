
import { Cable, CableType } from '../types';

/**
 * Service to calculate tray fill ratios and capacity
 */
export class TrayCapacityService {

    // Default max width for a standard tray (mm)
    private static DEFAULT_TRAY_WIDTH = 600;

    // Default max fill ratio (e.g. 60% per regulations)
    private static MAX_FILL_RATIO = 0.60;

    /**
     * Calculate fill ratio for a given set of cables
     * Formula: Sum(Cable OD^2 * 0.785) / (TrayWidth * TrayHeight * factor) ? 
     * Simplified: Sum(Cable OD) / Tray Width per layer logic
     */
    static calculateFillRatio(cables: Cable[], trayWidth: number = this.DEFAULT_TRAY_WIDTH): {
        totalOD: number;
        fillRatio: number;
        isOverfilled: boolean;
        cableCount: number;
    } {
        if (!cables || cables.length === 0) {
            return { totalOD: 0, fillRatio: 0, isOverfilled: false, cableCount: 0 };
        }

        // Simple 1-Layer Sum Calculation for now (Linear OD sum)
        const totalOD = cables.reduce((sum, cable) => sum + (cable.od || 0), 0);

        // Ratio against single layer width
        const fillRatio = (totalOD / trayWidth) * 100;

        return {
            totalOD,
            fillRatio,
            isOverfilled: totalOD > (trayWidth * 0.9), // Warning at 90%
            cableCount: cables.length
        };
    }

    /**
     * Analyze critical sections in the current route
     */
    static analyzeCriticalSections(nodes: any[], allCables: Cable[]): any[] {
        // Mock implementation for Agent Logic
        return nodes.map(node => {
            const cablesInNode = allCables.filter(c =>
                c.path?.includes(node.name) || c.route?.includes(node.name)
            );
            return {
                node: node.name,
                analysis: this.calculateFillRatio(cablesInNode)
            };
        }).filter(res => res.analysis.cableCount > 0)
            .sort((a, b) => b.analysis.fillRatio - a.analysis.fillRatio)
            .slice(0, 10); // Top 10 congested nodes
    }
}
