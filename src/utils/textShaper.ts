/**
 * Utilities for RTL detection, Arabic/Persian shaping and Canvas text rendering.
 */

// Arabic & Persian / Dari Unicode ranges
const RTL_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const PERSIAN_SPECIFIC_REGEX = /[\u067E\u0686\u0698\u06AF\u06CC]/; // پ چ ژ گ ی
const TURKISH_SPECIFIC_REGEX = /[ğĞıİöÖşŞüÜçÇ]/;

export function isRtlText(text: string): boolean {
  if (!text) return false;
  // Test first strong directional character
  return RTL_REGEX.test(text);
}

export function detectLanguage(text: string): 'ar' | 'fa' | 'tr' | 'en' {
  if (!text) return 'en';
  if (PERSIAN_SPECIFIC_REGEX.test(text)) return 'fa';
  if (RTL_REGEX.test(text)) return 'ar';
  if (TURKISH_SPECIFIC_REGEX.test(text)) return 'tr';
  return 'en';
}

/**
 * Line wrapping for Canvas 2D contexts that preserves word boundaries.
 * In modern browsers, canvas handles bidi/RTL shaping natively when ctx.direction = 'rtl'.
 */
export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text || text.trim().length === 0) return [];

  // Split by explicit line breaks first
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (para.trim().length === 0) {
      continue;
    }

    const words = para.trim().split(/\s+/);
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const testLine = `${currentLine} ${word}`;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}
