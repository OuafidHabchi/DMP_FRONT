declare module 'react-native-html-to-pdf' {
    interface PDFOptions {
        html: string;
        fileName: string;
        directory?: string;
    }

    interface PDFResponse {
        filePath: string;
        base64: string;
    }

    export function convert(options: PDFOptions): Promise<PDFResponse>;
}
