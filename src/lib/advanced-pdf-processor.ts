import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import sharp from "sharp";
import { createCanvas } from "canvas";

// Configure PDF.js worker for server environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface AdvancedPDFResult {
  text: string;
  formattedText: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    formattedText: string;
    imageData?: string; // Base64 image for visual display
  }>;
  metadata: {
    totalPages: number;
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
    modificationDate?: string;
  };
}

export class AdvancedPDFProcessor {
  private worker: any = null;

  async initializeOCR() {
    if (!this.worker) {
      this.worker = await createWorker("eng");
    }
  }

  async terminateOCR() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }

  async processPDF(buffer: Buffer): Promise<AdvancedPDFResult> {
    try {
      console.log("Starting advanced PDF processing...");

      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;

      console.log(`PDF loaded: ${pdf.numPages} pages`);

      const result: AdvancedPDFResult = {
        text: "",
        formattedText: "",
        pages: [],
        metadata: {
          totalPages: pdf.numPages,
        },
      };

      // Get metadata
      const metadata = await pdf.getMetadata();
      if (metadata.info) {
        result.metadata = {
          ...result.metadata,
          title: metadata.info.Title,
          author: metadata.info.Author,
          subject: metadata.info.Subject,
          creator: metadata.info.Creator,
          producer: metadata.info.Producer,
          creationDate: metadata.info.CreationDate?.toString(),
          modificationDate: metadata.info.ModDate?.toString(),
        };
      }

      // Initialize OCR worker
      await this.initializeOCR();

      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Processing page ${pageNum}/${pdf.numPages}...`);

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR

        // Render page to canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext("2d");
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        // Convert canvas to image buffer
        const imageBuffer = Buffer.from(
          canvas.toDataURL("image/png").split(",")[1],
          "base64"
        );

        // Extract text using PDF.js text layer
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        // Perform OCR on the image for additional text extraction
        let ocrText = "";
        try {
          const {
            data: { text },
          } = await this.worker.recognize(imageBuffer);
          ocrText = text.replace(/\s+/g, " ").trim();
        } catch (ocrError) {
          console.warn(`OCR failed for page ${pageNum}:`, ocrError);
        }

        // Combine PDF text extraction and OCR
        const combinedText = this.combineTexts(pageText, ocrText);
        const formattedText = this.formatText(combinedText);

        // Convert image to base64 for display
        const imageData = canvas.toDataURL("image/png");

        result.pages.push({
          pageNumber: pageNum,
          text: combinedText,
          formattedText: formattedText,
          imageData: imageData,
        });

        result.text += combinedText + "\n\n";
        result.formattedText += formattedText + "\n\n";
      }

      console.log("Advanced PDF processing completed");
      return result;
    } catch (error) {
      console.error("Advanced PDF processing failed:", error);
      throw error;
    } finally {
      await this.terminateOCR();
    }
  }

  private combineTexts(pdfText: string, ocrText: string): string {
    // If PDF text extraction worked well, use it as primary
    if (pdfText.length > ocrText.length * 0.8) {
      return pdfText;
    }

    // If OCR found more text, use it as primary
    if (ocrText.length > pdfText.length * 0.8) {
      return ocrText;
    }

    // If both are similar, combine them intelligently
    const pdfWords = pdfText.split(/\s+/);
    const ocrWords = ocrText.split(/\s+/);

    // Use the longer text as base and fill in gaps with the other
    const baseText = pdfWords.length > ocrWords.length ? pdfText : ocrText;
    const fillText = pdfWords.length > ocrWords.length ? ocrText : pdfText;

    return baseText + " " + fillText;
  }

  private formatText(text: string): string {
    // Preserve paragraph structure
    let formatted = text
      // Fix common OCR issues
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between camelCase
      .replace(/([.!?])([A-Z])/g, "$1\n\n$2") // New paragraph after sentences
      .replace(/([a-z])([0-9])/g, "$1 $2") // Space between letters and numbers
      .replace(/([0-9])([A-Z])/g, "$1 $2") // Space between numbers and letters
      // Clean up multiple spaces and newlines
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim();

    // Add proper paragraph breaks
    const sentences = formatted.split(/(?<=[.!?])\s+/);
    const paragraphs: string[] = [];
    let currentParagraph = "";

    for (const sentence of sentences) {
      if (currentParagraph.length + sentence.length > 200) {
        if (currentParagraph.trim()) {
          paragraphs.push(currentParagraph.trim());
        }
        currentParagraph = sentence;
      } else {
        currentParagraph += (currentParagraph ? " " : "") + sentence;
      }
    }

    if (currentParagraph.trim()) {
      paragraphs.push(currentParagraph.trim());
    }

    return paragraphs.join("\n\n");
  }
}

// Export singleton instance
export const advancedPDFProcessor = new AdvancedPDFProcessor();
