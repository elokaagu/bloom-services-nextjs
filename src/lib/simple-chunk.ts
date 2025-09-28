export interface ChunkOptions {
  maxChunkSize?: number;
  overlap?: number;
  minChunkSize?: number;
}

export function simpleChunk(text: string, options: ChunkOptions = {}): string[] {
  const {
    maxChunkSize = 1000,
    overlap = 200,
    minChunkSize = 100,
  } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // Clean the text
  const cleanedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // If text is shorter than maxChunkSize, return as single chunk
  if (cleanedText.length <= maxChunkSize) {
    return [cleanedText];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < cleanedText.length) {
    let end = Math.min(start + maxChunkSize, cleanedText.length);
    
    // Try to break at a sentence boundary
    if (end < cleanedText.length) {
      const lastPeriod = cleanedText.lastIndexOf('.', end);
      const lastExclamation = cleanedText.lastIndexOf('!', end);
      const lastQuestion = cleanedText.lastIndexOf('?', end);
      
      const lastSentenceEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
      
      // If we found a sentence boundary within reasonable distance, use it
      if (lastSentenceEnd > start + minChunkSize) {
        end = lastSentenceEnd + 1;
      } else {
        // Try to break at a paragraph boundary
        const lastParagraph = cleanedText.lastIndexOf('\n\n', end);
        if (lastParagraph > start + minChunkSize) {
          end = lastParagraph;
        } else {
          // Try to break at a word boundary
          const lastSpace = cleanedText.lastIndexOf(' ', end);
          if (lastSpace > start + minChunkSize) {
            end = lastSpace;
          }
        }
      }
    }

    const chunk = cleanedText.slice(start, end).trim();
    
    if (chunk.length >= minChunkSize) {
      chunks.push(chunk);
    }

    // Move start position with overlap
    start = Math.max(start + 1, end - overlap);
    
    // Prevent infinite loop
    if (start >= cleanedText.length) {
      break;
    }
  }

  // Filter out very small chunks
  return chunks.filter(chunk => chunk.length >= minChunkSize);
}

export default simpleChunk;
