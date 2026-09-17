/**
 * Generates a unique, human-readable token for a print job.
 * Format: CP-NNNN where NNNN is a zero-padded 4-digit number.
 * Guaranteed unique via DB check with retry.
 */
export declare class TokenService {
    private static generateCandidate;
    static generateUniqueToken(): Promise<string>;
    static generatePickupToken(jobId: string): Promise<string>;
    static decodePickupToken(token: string): string;
}
//# sourceMappingURL=TokenService.d.ts.map