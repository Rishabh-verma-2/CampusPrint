import { PrintConfig, PriceSnapshot, PriceBreakdown } from '../types';
/**
 * Parse page ranges like "1-5, 8, 10-12" or "all"
 * Returns total unique page count
 */
export declare function parsePageRanges(pageRanges: string, totalDocPages: number): number;
/**
 * Backend price calculation — single source of truth.
 * Frontend can show an estimate but this is authoritative.
 */
export declare class PricingService {
    static calculate(config: PrintConfig, snapshot: PriceSnapshot, docTotalPages: number, platformFee?: number): PriceBreakdown;
}
//# sourceMappingURL=PricingService.d.ts.map