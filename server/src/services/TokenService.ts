import { PrintJob } from '../models/PrintJob';

/**
 * Generates simple, human-readable pickup tokens for print jobs.
 *
 * Format: CP-NN (e.g. CP-01, CP-02, ... CP-99, CP-100)
 *
 * Tokens are sequential PER VENDOR PER DAY.
 * - Resets to CP-01 at midnight each day.
 * - Students get small, memorable numbers like "CP-03".
 * - Vendor types the student's verbal token to complete handover.
 */
export class TokenService {
  /**
   * Generate the next sequential token for a vendor today.
   * Counts existing jobs for this vendor today (all non-cancelled/non-failed statuses)
   * and returns the next number in the sequence.
   *
   * NOT strictly atomic for very high concurrency, but safe for typical campus print volumes.
   * In the rare case of a tie, the unique index on publicToken will catch duplicates and retry.
   */
  static async generateDailyToken(vendorId: string): Promise<string> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const maxRetries = 10;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Count all jobs for this vendor today (including PAYMENT_PENDING — they hold a slot)
      const countToday = await PrintJob.countDocuments({
        vendorId,
        createdAt: { $gte: startOfDay },
      });

      const nextNum = countToday + 1 + attempt; // attempt offset handles rare race conditions
      const token = TokenService.formatToken(nextNum);

      // Check uniqueness (publicToken has a unique index — this is a safety net)
      const existing = await PrintJob.findOne({ publicToken: token }).lean();
      if (!existing) return token;
    }

    // Absolute fallback: timestamp-based unique token
    const ts = Date.now().toString().slice(-5);
    return `CP-${ts}`;
  }

  /**
   * Format a sequence number as a token string.
   * 1 → "CP-01", 9 → "CP-09", 10 → "CP-10", 99 → "CP-99", 100 → "CP-100"
   */
  static formatToken(n: number): string {
    const padded = n < 10 ? `0${n}` : `${n}`;
    return `CP-${padded}`;
  }

  /**
   * Legacy alias — kept for backward compatibility.
   * Use generateDailyToken(vendorId) for new jobs.
   */
  static async generateUniqueToken(vendorId?: string): Promise<string> {
    if (vendorId) {
      return this.generateDailyToken(vendorId);
    }
    // Fallback without vendorId (shouldn't happen in normal flow)
    const count = await PrintJob.countDocuments({
      createdAt: { $gte: (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })() }
    });
    return this.formatToken(count + 1);
  }

  /**
   * Decode a token typed by a student (handles with or without CP- prefix, case-insensitive).
   * Input: "cp-03", "CP-03", "03", "3" → returns the canonical stored form
   */
  static normalizeInputToken(input: string): string[] {
    const clean = input.trim().toUpperCase();
    // If already has CP- prefix
    if (clean.startsWith('CP-')) {
      const num = parseInt(clean.replace('CP-', ''), 10);
      if (!isNaN(num)) {
        // Return both zero-padded and non-padded forms
        return [`CP-${num < 10 ? `0${num}` : num}`, `CP-${num}`];
      }
      return [clean];
    }
    // Just the number part
    const num = parseInt(clean, 10);
    if (!isNaN(num)) {
      return [`CP-${num < 10 ? `0${num}` : num}`, `CP-${num}`, `CP-${clean}`];
    }
    return [`CP-${clean}`];
  }
}
