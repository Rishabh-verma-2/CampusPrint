import { PDFDocument } from 'pdf-lib';

export class PdfService {
  /**
   * Slice specific pages from a source PDF and return the new PDF buffer.
   * @param srcBuffer Buffer or Uint8Array of the source PDF
   * @param pageNumbers Array of 1-indexed page numbers to extract e.g. [1, 2, 4]
   */
  static async extractPages(srcBuffer: Buffer | Uint8Array, pageNumbers: number[]): Promise<Buffer> {
    if (!pageNumbers || pageNumbers.length === 0) {
      throw new Error('At least one page number must be specified for extraction');
    }

    const srcPdf = await PDFDocument.load(srcBuffer);
    const totalPages = srcPdf.getPageCount();

    // Validate page numbers
    for (const pageNum of pageNumbers) {
      if (pageNum < 1 || pageNum > totalPages) {
        throw new Error(`Page number ${pageNum} is out of bounds (document has ${totalPages} pages)`);
      }
    }

    const newPdf = await PDFDocument.create();

    // pdf-lib copyPages takes 0-indexed indices
    const pageIndices = pageNumbers.map((p) => p - 1);
    const copiedPages = await newPdf.copyPages(srcPdf, pageIndices);
    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    return Buffer.from(pdfBytes);
  }
}
