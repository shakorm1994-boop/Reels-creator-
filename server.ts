import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK with environment key
const ai = new GoogleGenAI();

const LANGUAGE_NAMES: Record<string, string> = {
  ar: 'Arabic',
  fa: 'Persian (Farsi / Dari)',
  en: 'English',
  tr: 'Turkish',
};

// Translation API endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, sourceLang = 'auto', targetLang = 'en' } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text to translate cannot be empty.' });
    }

    const targetLanguageName = LANGUAGE_NAMES[targetLang] || targetLang;
    const sourceLanguageInstruction =
      sourceLang === 'auto'
        ? 'the detected source language'
        : LANGUAGE_NAMES[sourceLang] || sourceLang;

    const prompt = `You are a professional video caption translator for short-form social video reels.
Translate the following video caption text from ${sourceLanguageInstruction} into ${targetLanguageName}.

Guidelines:
1. Preserve the natural conversational pacing, punctuation, tone, and line breaks suitable for video captions.
2. If translating to Arabic or Persian/Dari, output proper grammatical phrasing with correct idioms.
3. If translating to Turkish or English, preserve proper casing and special letters (e.g. ğ, ş, ı, ü, ö, ç).
4. Return ONLY the translated text. Do not add quotes, introductory phrases, or explanations.

Text to translate:
"""
${text.trim()}
"""`;

    // Attempt translation using reliable active Gemini models
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.0-flash'];
    let translatedText = '';
    let lastError: Error | null = null;

    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (response.text && response.text.trim()) {
          translatedText = response.text.trim();
          break;
        }
      } catch (err) {
        lastError = err as Error;
        console.warn(`Model ${model} attempt failed:`, (err as Error).message);
      }
    }

    // High quality offline dictionary fallback for common phrases if API models are exhausted
    if (!translatedText) {
      const trimmed = text.trim();
      const FALLBACK_MAP: Record<string, Record<string, string>> = {
        'أهلاً بكم في استوديو ريل الجديد': {
          en: 'Welcome to the new Reel Studio',
          tr: 'Yeni Reel Studio’ya hoş geldiniz',
          fa: 'به استودیوی جدید ریل خوش آمدید',
        },
        'محتوى عالي الدقة وسهل التعديل': {
          en: 'High-definition and easily editable content',
          tr: 'Yüksek çözünürlüklü ve kolayca düzenlenebilir içerik',
          fa: 'محتوای باکیفیت و آسان برای ویرایش',
        },
        'أضف لمستك الإبداعية الآن': {
          en: 'Add your creative touch right now',
          tr: 'Yaratıcı dokunuşunuzu şimdi ekleyin',
          fa: 'هم اکنون لمس خلاقانه خود را اضافه کنید',
        },
        'شارك أفكارك وتألق معنا': {
          en: 'Share your ideas and shine with us',
          tr: 'Fikirlerinizi paylaşın ve bizimle parlayın',
          fa: 'ایده‌های خود را به اشتراک بگذارید و بدرخشید',
        },
        'حفظ وتصدير الفيديو بنقرة واحدة': {
          en: 'Save and export your video in one click',
          tr: 'Videoyu tek tıkla kaydedin ve dışa aktarın',
          fa: 'ذخیره و خروجی ویدیو با یک کلیک',
        },
        'Welcome to the new Reel Studio': {
          ar: 'أهلاً بكم في استوديو ريل الجديد',
          tr: 'Yeni Reel Studio’ya hoş geldiniz',
          fa: 'به استودیوی جدید ریل خوش آمدید',
        },
      };

      if (FALLBACK_MAP[trimmed] && FALLBACK_MAP[trimmed][targetLang]) {
        translatedText = FALLBACK_MAP[trimmed][targetLang];
      }
    }

    if (!translatedText) {
      throw lastError || new Error('Translation service is temporarily unavailable. Please try again.');
    }

    // Strip enclosing quotes if model added them
    if (
      (translatedText.startsWith('"') && translatedText.endsWith('"')) ||
      (translatedText.startsWith('«') && translatedText.endsWith('»'))
    ) {
      translatedText = translatedText.slice(1, -1).trim();
    }

    return res.json({
      translatedText,
      targetLang,
      sourceLang,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Translation request failed';
    console.error('Translation endpoint error:', errorMessage);
    return res.status(500).json({
      error: `Translation could not be completed: ${errorMessage}`,
    });
  }
});

// Video Transcode Endpoint using system ffmpeg
// Converts any format (HEVC/H.265, MOV, AVI, ProRes, unusual MP4 profile) into universal H.264 Baseline + AAC MP4
app.post('/api/transcode', (req, res) => {
  const filename = (req.query.filename as string) || 'video.mp4';
  const tempInput = path.join(os.tmpdir(), `input_${Date.now()}_${Math.random().toString(36).slice(2)}.bin`);
  const tempOutput = path.join(os.tmpdir(), `output_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`);

  const writeStream = fs.createWriteStream(tempInput);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    // Run ffmpeg to transcode into standard H.264 Baseline + AAC MP4 with faststart
    // scale=trunc(iw/2)*2:trunc(ih/2)*2 ensures odd dimensions never break libx264
    execFile(
      'ffmpeg',
      [
        '-y',
        '-i', tempInput,
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'veryfast',
        '-crf', '22',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-movflags', '+faststart',
        tempOutput,
      ],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, _stdout, stderr) => {
        if (err) {
          console.warn('FFmpeg transcode with audio failed, attempting video-only transcode:', stderr);
          // Retry with video only (if audio stream missing or incompatible)
          execFile(
            'ffmpeg',
            [
              '-y',
              '-i', tempInput,
              '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
              '-c:v', 'libx264',
              '-pix_fmt', 'yuv420p',
              '-preset', 'veryfast',
              '-crf', '22',
              '-an',
              '-movflags', '+faststart',
              tempOutput,
            ],
            { maxBuffer: 10 * 1024 * 1024 },
            (retryErr, _retryStdout, retryStderr) => {
              fs.unlink(tempInput, () => {});
              if (retryErr) {
                console.error('FFmpeg retry error:', retryStderr);
                return res.status(500).json({ error: 'Failed to transcode video.' });
              }
              sendOutput();
            }
          );
          return;
        }
        fs.unlink(tempInput, () => {});
        sendOutput();
      }
    );
  });

  function sendOutput() {
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `inline; filename="transcoded_${filename}"`);
    const readStream = fs.createReadStream(tempOutput);
    readStream.pipe(res);
    readStream.on('close', () => {
      fs.unlink(tempOutput, () => {});
    });
  }

  writeStream.on('error', (err) => {
    console.error('Failed to write transcode input stream:', err);
    res.status(500).json({ error: 'Failed to receive video stream: ' + err.message });
  });
});

// Vite middleware in development or static serving in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = parseInt(process.env.PORT || '3000', 10);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Reel Studio server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
