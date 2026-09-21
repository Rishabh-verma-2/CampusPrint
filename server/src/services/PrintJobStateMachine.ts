import { PrintJobStatus } from '../types';

/**
 * Server-authoritative state machine for PrintJob.
 * Only allowed transitions are defined here.
 */
const VALID_TRANSITIONS: Record<PrintJobStatus, PrintJobStatus[]> = {
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['QUEUED'],
  QUEUED: ['ACCEPTED', 'PRINTING', 'CANCELLED'],
  ACCEPTED: ['PRINTING', 'CANCELLED'],
  PRINTING: ['READY', 'FAILED'],
  READY: ['COLLECTED'],
  COLLECTED: [],
  CANCELLED: [],
  FAILED: ['PRINTING'], // reprinting
  REFUNDED: [],
};

export class PrintJobStateMachine {
  static canTransition(from: PrintJobStatus, to: PrintJobStatus): boolean {
    const allowed = VALID_TRANSITIONS[from] ?? [];
    return allowed.includes(to);
  }

  static assertTransition(from: PrintJobStatus, to: PrintJobStatus): void {
    if (!this.canTransition(from, to)) {
      throw new Error(
        `Invalid state transition: ${from} → ${to}. Allowed from ${from}: [${VALID_TRANSITIONS[from]?.join(', ') || 'none'}]`
      );
    }
  }

  static getAllowedTransitions(from: PrintJobStatus): PrintJobStatus[] {
    return VALID_TRANSITIONS[from] ?? [];
  }

  static isTerminal(status: PrintJobStatus): boolean {
    return ['COLLECTED', 'CANCELLED', 'REFUNDED'].includes(status);
  }
}
