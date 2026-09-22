export declare class PdfService {
    /**
     * Slice specific pages from a source PDF and return the new PDF buffer.
     * @param srcBuffer Buffer or Uint8Array of the source PDF
     * @param pageNumbers Array of 1-indexed page numbers to extract e.g. [1, 2, 4]
     */
    static extractPages(srcBuffer: Buffer | Uint8Array, pageNumbers: number[]): Promise<Buffer>;
}
//# sourceMappingURL=PdfService.d.ts.map