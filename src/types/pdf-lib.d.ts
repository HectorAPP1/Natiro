declare module "pdf-lib" {
  export class PDFDocument {
    static create(): Promise<PDFDocument>;
    addPage(size?: [number, number]): PDFPage;
    embedFont(fontName: string): Promise<PDFFont>;
    embedPng(data: Uint8Array): Promise<PDFImage>;
    save(): Promise<Uint8Array>;
  }

  export type PDFPage = any;
  export type PDFFont = any;
  export type PDFImage = any;

  export const StandardFonts: {
    Helvetica: string;
    HelveticaBold: string;
    [key: string]: string;
  };

  export function rgb(r: number, g: number, b: number): any;
}
