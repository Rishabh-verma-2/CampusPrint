import { PrintConfig, PriceSnapshot, PriceBreakdown } from '../types';

const PLATFORM_FEE = 2; // ₹ — configurable from Settings in future

/**
 * Parse page ranges like "1-5, 8, 10-12" or "all"
 * Returns total unique page count
 */
export function parsePageRanges(pageRanges: string, totalDocPages: number): number {
  return extractPageNumbers(pageRanges, totalDocPages).length;
}

/**
 * Extract sorted unique 1-indexed page numbers from a range string
 */
export function extractPageNumbers(pageRanges: string, totalDocPages: number): number[] {
  if (!pageRanges || pageRanges.trim().toLowerCase() === 'all') {
    return Array.from({ length: totalDocPages }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  const parts = pageRanges.split(',').map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (isNaN(start) || isNaN(end)) throw new Error(`Invalid page range: ${part}`);
      if (start < 1 || end > totalDocPages || start > end) {
        throw new Error(`Page range ${part} is out of bounds (doc has ${totalDocPages} pages)`);
      }
      for (let p = start; p <= end; p++) {
        pages.add(p);
      }
    } else {
      const p = Number(part);
      if (isNaN(p) || p < 1 || p > totalDocPages) {
        throw new Error(`Page ${part} is out of bounds (doc has ${totalDocPages} pages)`);
      }
      pages.add(p);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Calculate effective pages printed per copy.
 * Double-sided means fewer physical pages (sheets).
 */
function effectivePages(pages: number, sides: 'SINGLE' | 'DOUBLE'): number {
  if (sides === 'DOUBLE') {
    return Math.ceil(pages / 2);
  }
  return pages;
}

/**
 * Backend price calculation — single source of truth.
 * Frontend can show an estimate but this is authoritative.
 */
export class PricingService {
  static calculate(
    config: PrintConfig,
    snapshot: PriceSnapshot,
    docTotalPages: number,
    platformFee: number = PLATFORM_FEE
  ): PriceBreakdown {
    const selectedPages = parsePageRanges(config.pageRanges, docTotalPages);
    const pagesPerCopy = effectivePages(selectedPages, config.sides);
    const totalSheets = pagesPerCopy * config.copies;

    const pricePerSheet =
      config.colorMode === 'COLOR' ? snapshot.colorPerPage : snapshot.bwPerPage;

    const subtotal = totalSheets * pricePerSheet;
    const tax = 0; // configurable in future
    const total = subtotal + platformFee + tax;
    const vendorAmount = subtotal;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      platformFee,
      tax,
      total: Math.round(total * 100) / 100,
      vendorAmount: Math.round(vendorAmount * 100) / 100,
    };
  }
}
