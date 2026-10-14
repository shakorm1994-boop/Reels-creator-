import { CaptionSegment } from '../types/editor';

export const DEFAULT_SEGMENT_TIMES: { start: number; end: number }[] = [
  { start: 0, end: 3 },
  { start: 3, end: 6 },
  { start: 6, end: 9 },
  { start: 9, end: 12 },
  { start: 12, end: 15 },
];

/**
 * Splits input text into 5 balanced segments respecting sentence and word boundaries.
 * If text is short, puts text in early segments and leaves unused segments empty.
 */
export function splitTextInto5Segments(rawText: string): CaptionSegment[] {
  const text = rawText.trim();
  
  // If empty, return 5 empty segments
  if (!text) {
    return DEFAULT_SEGMENT_TIMES.map((time, idx) => ({
      id: idx + 1,
      startTime: time.start,
      endTime: time.end,
      text: '',
    }));
  }

  // Check if text already has 5 newline-separated lines
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (rawLines.length === 5) {
    return DEFAULT_SEGMENT_TIMES.map((time, idx) => ({
      id: idx + 1,
      startTime: time.start,
      endTime: time.end,
      text: rawLines[idx] || '',
    }));
  }

  // Split into sentences using Latin & Arabic/Persian punctuation
  // Arabic question mark ؟ (\u061F), Arabic comma ، (\u060C), period, etc.
  const sentenceDelimiters = /([.!?؟\n]+[\s]*)/;
  const rawParts = text.split(sentenceDelimiters).filter(Boolean);
  
  // Recombine delimiters with sentences
  const sentences: string[] = [];
  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i].trim();
    if (!part) continue;
    if (sentenceDelimiters.test(part) && sentences.length > 0) {
      sentences[sentences.length - 1] += ' ' + part;
    } else {
      sentences.push(part);
    }
  }

  const resultTexts: string[] = ['', '', '', '', ''];

  // If we have between 1 and 5 clean sentences:
  if (sentences.length > 0 && sentences.length <= 5) {
    for (let i = 0; i < sentences.length; i++) {
      resultTexts[i] = sentences[i].trim();
    }
  } else {
    // If we have more than 5 sentences or one long continuous sentence,
    // split by words proportionally across up to 5 segments.
    const words = text.split(/\s+/).filter(Boolean);
    
    // If very short text (<= 5 words), place into early segments
    if (words.length <= 5) {
      for (let i = 0; i < words.length; i++) {
        resultTexts[i] = words[i];
      }
    } else {
      // Distribute words evenly across 5 segments
      const totalWords = words.length;
      const wordsPerSegment = Math.ceil(totalWords / 5);
      
      let wordIdx = 0;
      for (let seg = 0; seg < 5 && wordIdx < totalWords; seg++) {
        // Last segment gets any remaining words
        const take = (seg === 4) ? (totalWords - wordIdx) : Math.min(wordsPerSegment, totalWords - wordIdx);
        resultTexts[seg] = words.slice(wordIdx, wordIdx + take).join(' ');
        wordIdx += take;
      }
    }
  }

  return DEFAULT_SEGMENT_TIMES.map((time, idx) => ({
    id: idx + 1,
    startTime: time.start,
    endTime: time.end,
    text: resultTexts[idx] || '',
  }));
}

/**
 * Default sample captions for demonstration and quick testing
 */
export const SAMPLE_CAPTIONS: Record<string, string[]> = {
  ar: [
    'مرحباً بكم في استوديو ريل!',
    'محرر فيديو احترافي للهواتف الذكية.',
    'يدعم اللغة العربية باتجاه صحيح وخطوط جميلة.',
    'تحكّم دقيق بخمسة مقاطع زمنية متتالية.',
    'تصدير فيديو MP4 حقيقي بدقة 720p خلال ثوانٍ!'
  ],
  fa: [
    'به استودیو ریل خوش آمدید!',
    'ویرایشگر پیشرفته ویدیو برای گوشی‌های هوشمند.',
    'پشتیبانی کامل از زبان فارسی و دری با خط زیبا.',
    'تقسیم خودکار زیرنویس به ۵ بخش دقیق و همگام.',
    'خروجی واقعی MP4 عمودی با کیفیت ۷۲۰p در ۱۵ ثانیه!'
  ],
  en: [
    'Welcome to Reel Studio!',
    'Mobile-first 15-second vertical video editor.',
    'Smart timed captions with RTL & LTR support.',
    'Precision timeline with multi-clip looping.',
    'Export genuine 720p vertical MP4 in seconds!'
  ],
  tr: [
    'Reel Studio\'ya hoş geldiniz!',
    'Mobil uyumlu 15 saniyelik dikey video editörü.',
    'Türkçe karakter desteği ve zamanlı altyazılar.',
    'Hassas zaman çizelgesi ve otomatik döngü.',
    'Saniyeler içinde gerçek 720p dikey MP4 dışa aktarın!'
  ],
};
