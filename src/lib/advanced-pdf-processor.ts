// Server-compatible PDF processor using pdf-parse
import { simpleChunk } from "@/lib/utils";

export interface AdvancedPDFResult {
  text: string;
  formattedText: string;
  pages: Array<{
    pageNumber: number;
    imageData: string;
    text: string;
    formattedText: string;
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

class AdvancedPDFProcessor {
  async processPDF(buffer: Buffer): Promise<AdvancedPDFResult> {
    try {
      console.log("Starting server-compatible PDF processing...");

      // Use pdf-parse for server-side PDF processing
      const pdf = (await import("pdf-parse")).default;
      const parsed = await pdf(buffer);

      console.log(`PDF parsed: ${parsed.numpages} pages`);
      console.log("Extracted text length:", parsed.text.length);

      // Format text with better paragraph breaks
      const formattedText = this.formatText(parsed.text);

      // Create page data (simplified for server environment)
      const pages = [];
      const textPerPage = Math.ceil(parsed.text.length / parsed.numpages);

      for (let i = 0; i < parsed.numpages; i++) {
        const startIndex = i * textPerPage;
        const endIndex = Math.min((i + 1) * textPerPage, parsed.text.length);
        const pageText = parsed.text.slice(startIndex, endIndex);

        pages.push({
          pageNumber: i + 1,
          imageData: `data:image/svg+xml;base64,${Buffer.from(
            `<svg width="800" height="1000" xmlns="http://www.w3.org/2000/svg">
              <rect width="800" height="1000" fill="white"/>
              <text x="50" y="50" font-family="Arial" font-size="12" fill="black">
                Page ${i + 1} - Text content available
              </text>
            </svg>`
          ).toString("base64")}`,
          text: pageText,
          formattedText: this.formatText(pageText),
        });
      }

      const result: AdvancedPDFResult = {
        text: parsed.text,
        formattedText: formattedText,
        pages: pages,
        metadata: {
          totalPages: parsed.numpages,
          title: parsed.info?.Title,
          author: parsed.info?.Author,
          subject: parsed.info?.Subject,
          creator: parsed.info?.Creator,
          producer: parsed.info?.Producer,
          creationDate: parsed.info?.CreationDate,
          modificationDate: parsed.info?.ModDate,
        },
      };

      console.log("Server-compatible PDF processing completed");
      return result;
    } catch (error) {
      console.error("Server-compatible PDF processing failed:", error);
      throw error;
    }
  }

  private formatText(text: string): string {
    let formatted = text
      // Fix common PDF parsing issues
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between camelCase
      .replace(/([.!?])([A-Z])/g, "$1\n\n$2") // New paragraph after sentences
      .replace(/([a-z])([0-9])/g, "$1 $2") // Space between letters and numbers
      .replace(/([0-9])([A-Z])/g, "$1 $2") // Space between numbers and letters
      // Clean up multiple spaces but preserve newlines
      .replace(/[ \t]+/g, " ") // Replace multiple spaces/tabs with single space
      .replace(/\n\s*\n/g, "\n\n") // Clean up multiple newlines
      .trim();

    // Split into sentences and create proper paragraphs
    const sentences = formatted.split(/(?<=[.!?])\s+/);
    const paragraphs: string[] = [];
    let currentParagraph = "";

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      // Start new paragraph for longer sentences or sentences ending with periods
      if (trimmedSentence.length > 100 || trimmedSentence.endsWith(".")) {
        if (currentParagraph.trim()) {
          paragraphs.push(currentParagraph.trim());
        }
        currentParagraph = trimmedSentence;
      } else {
        currentParagraph += (currentParagraph ? " " : "") + trimmedSentence;
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
