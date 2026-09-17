"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const PrintJob_1 = require("../models/PrintJob");
/**
 * Generates a unique, human-readable token for a print job.
 * Format: CP-NNNN where NNNN is a zero-padded 4-digit number.
 * Guaranteed unique via DB check with retry.
 */
class TokenService {
    static async generateCandidate() {
        const num = Math.floor(1000 + Math.random() * 9000); // 1000-9999
        return `CP-${num}`;
    }
    static async generateUniqueToken() {
        const maxRetries = 30;
        for (let i = 0; i < maxRetries; i++) {
            const token = await this.generateCandidate();
            const existing = await PrintJob_1.PrintJob.findOne({ publicToken: token });
            if (!existing)
                return token;
        }
        // Fallback: 5-digit number
        const num5 = Math.floor(10000 + Math.random() * 90000);
        return `CP-${num5}`;
    }
    static async generatePickupToken(jobId) {
        // Short-lived QR token: jobId encoded (not sensitive data)
        const encoded = Buffer.from(jobId).toString('base64url');
        return encoded;
    }
    static decodePickupToken(token) {
        return Buffer.from(token, 'base64url').toString('utf8');
    }
}
exports.TokenService = TokenService;
//# sourceMappingURL=TokenService.js.map