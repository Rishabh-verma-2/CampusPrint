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
export declare class TokenService {
    /**
     * Generate the next sequential token for a vendor today.
     * Counts existing jobs for this vendor today (all non-cancelled/non-failed statuses)
     * and returns the next number in the sequence.
     *
     * NOT strictly atomic for very high concurrency, but safe for typical campus print volumes.
     * In the rare case of a tie, the unique index on publicToken will catch duplicates and retry.
     */
    static generateDailyToken(vendorId: string): Promise<string>;
    /**
     * Format a sequence number as a token string.
     * 1 → "CP-01", 9 → "CP-09", 10 → "CP-10", 99 → "CP-99", 100 → "CP-100"
     */
    static formatToken(n: number): string;
    /**
     * Legacy alias — kept for backward compatibility.
     * Use generateDailyToken(vendorId) for new jobs.
     */
    static generateUniqueToken(vendorId?: string): Promise<string>;
    /**
     * Decode a token typed by a student (handles with or without CP- prefix, case-insensitive).
     * Input: "cp-03", "CP-03", "03", "3" → returns the canonical stored form
     */
    static normalizeInputToken(input: string): string[];
}
//# sourceMappingURL=TokenService.d.ts.map