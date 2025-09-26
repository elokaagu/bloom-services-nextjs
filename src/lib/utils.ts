import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Document chunking utility for RAG
export interface DocumentChunk {
  chunk_no: number;
  text: string;
}

export function simpleChunk(text: string, chunkSize: number = 1000, overlap: number = 200): DocumentChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean the text
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  if (cleanedText.length <= chunkSize) {
    return [{ chunk_no: 1, text: cleanedText }];
  }

  const chunks: DocumentChunk[] = [];
  let start = 0;
  let chunkNo = 1;

  while (start < cleanedText.length) {
    let end = start + chunkSize;
    
    // Try to break at sentence boundaries
    if (end < cleanedText.length) {
      const lastPeriod = cleanedText.lastIndexOf('.', end);
      const lastNewline = cleanedText.lastIndexOf('\n', end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      
      if (breakPoint > start + chunkSize * 0.5) {
        end = breakPoint + 1;
      }
    }

    const chunkText = cleanedText.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({
        chunk_no: chunkNo,
        text: chunkText
      });
      chunkNo++;
    }

    // Move start position with overlap
    start = end - overlap;
    if (start >= cleanedText.length) break;
  }

  return chunks;
}
