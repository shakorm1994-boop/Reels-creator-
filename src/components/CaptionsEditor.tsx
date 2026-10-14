import React, { useState } from 'react';
import { Type, Split, Play, Sparkles, Check, Languages, Loader2, AlertCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { CaptionSegment, LanguagePreset } from '../types/editor';
import { formatTimeRange } from '../utils/timeFormat';
import { isRtlText } from '../utils/textShaper';
import { splitTextInto5Segments, SAMPLE_CAPTIONS } from '../utils/textSplitter';

interface CaptionsEditorProps {
  captions: CaptionSegment[];
  currentTime: number;
  showSecondaryCaptions: boolean;
  onToggleSecondaryCaptions: (enabled: boolean) => void;
  onUpdateSegmentText: (id: number, text: string) => void;
  onUpdateSegmentTranslation: (id: number, translationText: string) => void;
  onUpdateAllSegments: (newSegments: CaptionSegment[]) => void;
  onSeekToSegment: (startTime: number) => void;
}

export const CaptionsEditor: React.FC<CaptionsEditorProps> = ({
  captions,
  currentTime,
  showSecondaryCaptions,
  onToggleSecondaryCaptions,
  onUpdateSegmentText,
  onUpdateSegmentTranslation,
  onUpdateAllSegments,
  onSeekToSegment,
}) => {
  const [mode, setMode] = useState<'manual' | 'auto_split' | 'translate'>('manual');
  const [autoSplitInput, setAutoSplitInput] = useState('');
  const [previewSegments, setPreviewSegments] = useState<CaptionSegment[] | null>(null);

  // Translation State
  const [sourceText, setSourceText] = useState('');
  const [sourceLang, setSourceLang] = useState<'auto' | 'ar' | 'fa' | 'en' | 'tr'>('auto');
  const [targetLang, setTargetLang] = useState<'ar' | 'fa' | 'en' | 'tr'>('en');
  const [translatedResult, setTranslatedResult] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [targetScope, setTargetScope] = useState<'all' | number>('all');

  // Quick preset loader (updates original text only)
  const handleApplySampleLanguage = (lang: LanguagePreset) => {
    const sample = SAMPLE_CAPTIONS[lang];
    if (sample && sample.length === 5) {
      const updated = captions.map((seg, i) => ({
        ...seg,
        text: sample[i] || '',
      }));
      onUpdateAllSegments(updated);
    }
  };

  const handleRunAutoSplit = () => {
    const split = splitTextInto5Segments(autoSplitInput);
    setPreviewSegments(split);
  };

  const handleApplyAutoSplit = () => {
    if (previewSegments) {
      // Preserve existing translationText while updating original text
      const updated = previewSegments.map((newSeg, idx) => ({
        ...newSeg,
        translationText: captions[idx]?.translationText || '',
      }));
      onUpdateAllSegments(updated);
      setPreviewSegments(null);
      setMode('manual');
    }
  };

  // Pre-load all or single segment into translation
  const handleLoadCaptionsForTranslation = (segmentId: 'all' | number = 'all') => {
    setTargetScope(segmentId);
    setTranslationError(null);
    setTranslatedResult('');

    if (segmentId === 'all') {
      const combined = captions
        .map((c) => c.text.trim())
        .filter(Boolean)
        .join('\n');
      setSourceText(combined);
    } else {
      const targetSeg = captions.find((c) => c.id === segmentId);
      setSourceText(targetSeg?.text || '');
    }
    setMode('translate');
  };

  // Perform translation via /api/translate with client-side fallback for static GitHub Pages
  const handleExecuteTranslation = async () => {
    if (!sourceText.trim() || isTranslating) return;

    setIsTranslating(true);
    setTranslationError(null);

    try {
      let result = '';

      // 1. Try local/server translation endpoint
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sourceText.trim(),
            sourceLang,
            targetLang,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.translatedText) {
            result = data.translatedText;
          }
        }
      } catch {
        // Server endpoint not reachable (e.g. static GitHub Pages)
      }

      // 2. Client-side fallback if server endpoint unavailable
      if (!result) {
        const trimmed = sourceText.trim();
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
            tr: 'Videoyu tek tıkla kaydedin و dışa aktarın',
            fa: 'ذخیره و خروجی ویدیو با یک کلیک',
          },
          'Welcome to the new Reel Studio': {
            ar: 'أهلاً بكم في استوديو ريل الجديد',
            tr: 'Yeni Reel Studio’ya hoş geldiniz',
            fa: 'به استودیوی جدید ریل خوش آمدید',
          },
        };

        if (FALLBACK_MAP[trimmed]?.[targetLang]) {
          result = FALLBACK_MAP[trimmed][targetLang];
        } else {
          // Public translation API fallback for static browser deployment
          try {
            const sPair = sourceLang === 'auto' ? 'auto' : sourceLang;
            const apiRes = await fetch(
              `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${sPair}|${targetLang}`
            );
            if (apiRes.ok) {
              const resData = await apiRes.json();
              if (resData?.responseData?.translatedText) {
                result = resData.responseData.translatedText;
              }
            }
          } catch {
            // ignore network fallback failure
          }
        }
      }

      if (!result) {
        throw new Error('Could not translate text. Please enter the translation manually.');
      }

      setTranslatedResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Translation failed. Please try again.';
      setTranslationError(msg);
    } finally {
      setIsTranslating(false);
    }
  };

  // Apply translated text ONLY to the secondary translation layer
  // (Original captions are 100% preserved and untouched!)
  const handleApplyTranslationToSecondaryLayer = () => {
    if (!translatedResult.trim()) return;

    if (targetScope === 'all') {
      // Distribute translated text across 5 segments for the secondary layer
      const splitTranslations = splitTextInto5Segments(translatedResult);
      const updated = captions.map((seg, idx) => ({
        ...seg,
        translationText: splitTranslations[idx]?.text || '',
      }));
      onUpdateAllSegments(updated);
    } else {
      // Update individual segment's translation layer only
      onUpdateSegmentTranslation(targetScope, translatedResult.trim());
    }

    // Automatically ensure secondary translation layer is visible
    onToggleSecondaryCaptions(true);
    setMode('manual');
    setTranslatedResult('');
  };

  // Clear all secondary translations without deleting original text
  const handleClearAllTranslations = () => {
    const updated = captions.map((seg) => ({
      ...seg,
      translationText: '',
    }));
    onUpdateAllSegments(updated);
  };

  return (
    <div className="space-y-4">
      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-900 p-2 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
          <button
            onClick={() => setMode('manual')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition ${
              mode === 'manual'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Manual</span>
          </button>

          <button
            onClick={() => setMode('auto_split')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition ${
              mode === 'auto_split'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Auto Split</span>
          </button>

          <button
            onClick={() => {
              if (mode !== 'translate') {
                handleLoadCaptionsForTranslation('all');
              } else {
                setMode('translate');
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold transition ${
              mode === 'translate'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Translate</span>
          </button>
        </div>

        {/* Quick Language Sample Dropdown / Pills */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-neutral-500 hidden sm:inline mr-1">Presets:</span>
          {(['ar', 'fa', 'en', 'tr'] as LanguagePreset[]).map((lang) => (
            <button
              key={lang}
              onClick={() => handleApplySampleLanguage(lang)}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-[10px] font-bold text-neutral-300 border border-neutral-700 transition active:scale-95 uppercase"
              title={`Load sample ${lang} captions`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* SECONDARY TRANSLATION LAYER CONTROLS BANNER */}
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Languages className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-xs text-white">Translation Caption / Secondary Text</h4>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                showSecondaryCaptions ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400'
              }`}>
                {showSecondaryCaptions ? 'Active on Screen' : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Displays independent translated captions simultaneously with original captions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onToggleSecondaryCaptions(!showSecondaryCaptions)}
            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition active:scale-95 ${
              showSecondaryCaptions
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
            }`}
          >
            {showSecondaryCaptions ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showSecondaryCaptions ? 'Enabled' : 'Enable'}</span>
          </button>

          <button
            onClick={() => handleLoadCaptionsForTranslation('all')}
            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-neutral-700 transition active:scale-95"
            title="Open Translation Assistant"
          >
            <Languages className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Translate</span>
          </button>

          {captions.some((c) => !!c.translationText?.trim()) && (
            <button
              onClick={handleClearAllTranslations}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition"
              title="Clear all secondary translations (preserves original text)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {mode === 'manual' ? (
        /* Manual 5 Segments View */
        <div className="space-y-3">
          {captions.map((seg) => {
            const isActive = currentTime >= seg.startTime && currentTime < seg.endTime;
            const isOrigRtl = isRtlText(seg.text);
            const isTransRtl = isRtlText(seg.translationText || '');

            return (
              <div
                key={seg.id}
                className={`p-3.5 rounded-xl bg-neutral-900 border transition-all space-y-2.5 ${
                  isActive
                    ? 'border-amber-500 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Segment Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center font-mono ${
                        isActive
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                      }`}
                    >
                      {seg.id}
                    </span>

                    <span className="font-mono text-xs font-semibold text-neutral-300 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                      {formatTimeRange(seg.startTime, seg.endTime)}
                    </span>

                    {isActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                        PLAYING
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleLoadCaptionsForTranslation(seg.id)}
                      className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-amber-400 px-2 py-0.5 rounded hover:bg-neutral-800 transition"
                      title="Translate this segment to secondary layer"
                    >
                      <Languages className="w-3 h-3" />
                      <span>Translate</span>
                    </button>

                    <button
                      onClick={() => onSeekToSegment(seg.startTime)}
                      className="flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-amber-400 px-2 py-0.5 rounded hover:bg-neutral-800 transition"
                      title="Jump to this segment"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Jump</span>
                    </button>
                  </div>
                </div>

                {/* 1. Original Caption Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-neutral-400">Original Caption</span>
                    {isOrigRtl && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                        RTL
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    value={seg.text}
                    onChange={(e) => onUpdateSegmentText(seg.id, e.target.value)}
                    dir={isOrigRtl ? 'rtl' : 'ltr'}
                    placeholder={`Enter original caption for Segment ${seg.id}...`}
                    className={`w-full bg-neutral-950 text-neutral-100 placeholder-neutral-600 rounded-lg p-2.5 text-xs sm:text-sm border border-neutral-800 focus:outline-none focus:border-amber-500 transition resize-none ${
                      isOrigRtl ? 'font-cairo text-right' : 'font-inter'
                    }`}
                  />
                </div>

                {/* 2. Secondary Translation Layer Field */}
                {showSecondaryCaptions && (
                  <div className="space-y-1 pt-1 border-t border-neutral-800/60">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-amber-400 flex items-center gap-1">
                        <Languages className="w-3 h-3" />
                        <span>Secondary Translation Layer</span>
                      </span>
                      {isTransRtl && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                          RTL
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={2}
                      value={seg.translationText || ''}
                      onChange={(e) => onUpdateSegmentTranslation(seg.id, e.target.value)}
                      dir={isTransRtl ? 'rtl' : 'ltr'}
                      placeholder={`Enter or translate secondary text for Segment ${seg.id}...`}
                      className={`w-full bg-neutral-950/80 text-amber-200 placeholder-neutral-700 rounded-lg p-2.5 text-xs sm:text-sm border border-amber-500/30 focus:outline-none focus:border-amber-400 transition resize-none ${
                        isTransRtl ? 'font-cairo text-right' : 'font-inter'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : mode === 'auto_split' ? (
        /* Auto Split Mode View */
        <div className="space-y-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Smart Narrative Auto-Splitter</span>
            </h4>
            <p className="text-xs text-neutral-400 mt-1">
              Paste your continuous script or text. It will be intelligently distributed across 5 balanced segments preserving sentences and word boundaries.
            </p>
          </div>

          <textarea
            rows={5}
            value={autoSplitInput}
            onChange={(e) => setAutoSplitInput(e.target.value)}
            placeholder="Paste or type full narrative in Arabic, Persian, English, or Turkish here..."
            className="w-full bg-neutral-950 text-neutral-100 placeholder-neutral-600 rounded-lg p-3 text-sm border border-neutral-800 focus:outline-none focus:border-amber-500 transition"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">
              {autoSplitInput.trim().split(/\s+/).filter(Boolean).length} words
            </span>

            <button
              onClick={handleRunAutoSplit}
              disabled={!autoSplitInput.trim()}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition active:scale-95 disabled:opacity-40"
            >
              Analyze & Split into 5 Segments
            </button>
          </div>

          {/* Split Preview */}
          {previewSegments && (
            <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
              <h5 className="font-bold text-xs text-neutral-200">Generated 5-Segment Preview:</h5>
              <div className="space-y-2">
                {previewSegments.map((seg) => (
                  <div
                    key={seg.id}
                    className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs flex items-start gap-2.5"
                  >
                    <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                      Seg {seg.id} ({formatTimeRange(seg.startTime, seg.endTime)})
                    </span>
                    <span
                      dir={isRtlText(seg.text) ? 'rtl' : 'ltr'}
                      className={`text-neutral-200 ${
                        isRtlText(seg.text) ? 'font-cairo text-right ml-auto' : 'font-inter'
                      }`}
                    >
                      {seg.text || <em className="text-neutral-600">(empty)</em>}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setPreviewSegments(null)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyAutoSplit}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Apply to Timeline</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Multilingual Translation View */
        <div className="space-y-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Languages className="w-4 h-4 text-amber-400" />
                <span>Translate into Secondary Caption Layer</span>
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {targetScope === 'all' ? 'Scope: All Segments' : `Scope: Segment ${targetScope}`}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Translates captions into the secondary caption layer. Your original captions remain completely intact and untouched.
            </p>
          </div>

          {/* Scope Selector */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-neutral-400 text-[11px] mr-1">Source:</span>
            <button
              onClick={() => handleLoadCaptionsForTranslation('all')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition border ${
                targetScope === 'all'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              All 5 Segments
            </button>
            {captions.map((c) => (
              <button
                key={c.id}
                onClick={() => handleLoadCaptionsForTranslation(c.id)}
                className={`px-2 py-1 rounded text-xs font-semibold transition border ${
                  targetScope === c.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Seg {c.id}
              </button>
            ))}
          </div>

          {/* Language Pair Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                Source Language
              </label>
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value as any)}
                className="w-full bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="auto">Auto Detect Language</option>
                <option value="ar">Arabic (العربية)</option>
                <option value="en">English</option>
                <option value="fa">Persian / Dari (فارسی / دری)</option>
                <option value="tr">Turkish (Türkçe)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                Target Language
              </label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value as any)}
                className="w-full bg-neutral-900 text-neutral-200 border border-neutral-800 rounded-lg p-2 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="en">English</option>
                <option value="ar">Arabic (العربية)</option>
                <option value="fa">Persian / Dari (فارسی / دری)</option>
                <option value="tr">Turkish (Türkçe)</option>
              </select>
            </div>
          </div>

          {/* Original Text Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-neutral-300">Original Caption Text</label>
              <span className="text-[11px] text-neutral-500">
                {sourceText.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={3}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter or load text to translate..."
              className="w-full bg-neutral-950 text-neutral-100 placeholder-neutral-600 rounded-lg p-2.5 text-sm border border-neutral-800 focus:outline-none focus:border-amber-500 transition resize-none"
            />
          </div>

          {/* Translate Action Button */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-400">
              Original captions are never modified.
            </span>

            <button
              onClick={handleExecuteTranslation}
              disabled={!sourceText.trim() || isTranslating}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-2 transition active:scale-95 disabled:opacity-40"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Languages className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Translate</span>
                </>
              )}
            </button>
          </div>

          {/* Error Message */}
          {translationError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{translationError}</span>
            </div>
          )}

          {/* Editable Translation Result */}
          {translatedResult && (
            <div className="pt-3 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Secondary Translation Result (Review & Edit)</span>
                </label>
                <span className="text-[10px] text-neutral-500">Edit before applying</span>
              </div>

              <textarea
                rows={4}
                value={translatedResult}
                onChange={(e) => setTranslatedResult(e.target.value)}
                dir={isRtlText(translatedResult) ? 'rtl' : 'ltr'}
                className={`w-full bg-neutral-950 text-neutral-100 rounded-lg p-3 text-sm border border-emerald-500/50 focus:outline-none focus:border-emerald-400 transition ${
                  isRtlText(translatedResult) ? 'font-cairo text-right' : 'font-inter'
                }`}
              />

              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setTranslatedResult('')}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
                >
                  Discard
                </button>

                <button
                  onClick={handleApplyTranslationToSecondaryLayer}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition active:scale-95 flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>
                    {targetScope === 'all'
                      ? 'Apply to Secondary Layer (All 5 Segments)'
                      : `Apply to Secondary Layer (Segment ${targetScope})`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
