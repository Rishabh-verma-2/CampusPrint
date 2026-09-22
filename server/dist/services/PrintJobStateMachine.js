"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrintJobStateMachine = void 0;
/**
 * Server-authoritative state machine for PrintJob.
 * Only allowed transitions are defined here.
 */
const VALID_TRANSITIONS = {
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
class PrintJobStateMachine {
    static canTransition(from, to) {
        const allowed = VALID_TRANSITIONS[from] ?? [];
        return allowed.includes(to);
    }
    static assertTransition(from, to) {
        if (!this.canTransition(from, to)) {
            throw new Error(`Invalid state transition: ${from} → ${to}. Allowed from ${from}: [${VALID_TRANSITIONS[from]?.join(', ') || 'none'}]`);
        }
    }
    static getAllowedTransitions(from) {
        return VALID_TRANSITIONS[from] ?? [];
    }
    static isTerminal(status) {
        return ['COLLECTED', 'CANCELLED', 'REFUNDED'].includes(status);
    }
}
exports.PrintJobStateMachine = PrintJobStateMachine;
//# sourceMappingURL=PrintJobStateMachine.js.map