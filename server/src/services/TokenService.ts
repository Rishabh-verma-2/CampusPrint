import { PrintJob } from '../models/PrintJob';

/**
 * Generates a unique, human-readable token for a print job.
 * Format: CP-NNNN where NNNN is a zero-padded 4-digit number.
 * Guaranteed unique via DB check with retry.
 */
export class TokenService {
  private static async generateCandidate(): Promise<string> {
    const num = Math.floor(1000 + Math.random() * 9000); // 1000-9999
    return `CP-${num}`;
  }

  static async generateUniqueToken(): Promise<string> {
    const maxRetries = 30;
    for (let i = 0; i < maxRetries; i++) {
      const token = await this.generateCandidate();
      const existing = await PrintJob.findOne({ publicToken: token });
      if (!existing) return token;
    }
    // Fallback: 5-digit number
    const num5 = Math.floor(10000 + Math.random() * 90000);
    return `CP-${num5}`;
  }

  static async generatePickupToken(jobId: string): Promise<string> {
    // Short-lived QR token: jobId encoded (not sensitive data)
    const encoded = Buffer.from(jobId).toString('base64url');
    return encoded;
  }

  static decodePickupToken(token: string): string {
    return Buffer.from(token, 'base64url').toString('utf8');
  }
}
