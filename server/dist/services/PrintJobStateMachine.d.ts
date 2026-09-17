import { PrintJobStatus } from '../types';
export declare class PrintJobStateMachine {
    static canTransition(from: PrintJobStatus, to: PrintJobStatus): boolean;
    static assertTransition(from: PrintJobStatus, to: PrintJobStatus): void;
    static getAllowedTransitions(from: PrintJobStatus): PrintJobStatus[];
    static isTerminal(status: PrintJobStatus): boolean;
}
//# sourceMappingURL=PrintJobStateMachine.d.ts.map