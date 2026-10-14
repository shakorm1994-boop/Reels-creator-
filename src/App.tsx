import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { ClipsManager } from './components/ClipsManager';
import { CaptionsEditor } from './components/CaptionsEditor';
import { StylePanel } from './components/StylePanel';
import { TimelineSequencer } from './components/TimelineSequencer';
import { ExportModal } from './components/ExportModal';
import { BottomTabs } from './components/BottomTabs';

import {
  VideoClip,
  CaptionSegment,
  CaptionStyle,
  ExportSettings,
  ExportProgress,
  EditorTab,
  WatermarkSettings,
} from './types/editor';

import { compute15SecondSchedule, export15SecondMP4, TARGET_DURATION } from './utils/videoMuxer';
import { generateDemoVideo } from './utils/sampleMedia';
import { DEFAULT_SEGMENT_TIMES, SAMPLE_CAPTIONS } from './utils/textSplitter';

export default function App() {
  // --- Video Clips State ---
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // Derived 15-second schedule (loops < 15s, trims > 15s)
  const schedule = useMemo(() => {
    return compute15SecondSchedule(clips);
  }, [clips]);

  // --- Captions State (Default 5 Segments with Arabic Greeting Sample and Secondary Translation) ---
  const [captions, setCaptions] = useState<CaptionSegment[]>(() => {
    const arSamples = SAMPLE_CAPTIONS.ar;
    const enSamples = SAMPLE_CAPTIONS.en;
    return DEFAULT_SEGMENT_TIMES.map((time, idx) => ({
      id: idx + 1,
      startTime: time.start,
      endTime: time.end,
      text: arSamples[idx] || '',
      translationText: enSamples[idx] || '',
    }));
  });

  // --- Caption Style State (Original Primary Captions) ---
  const [style, setStyle] = useState<CaptionStyle>({
    fontFamily: 'Cairo',
    fontSize: 38,
    textColor: '#FFFFFF',
    bgColor: 'rgba(0, 0, 0, 0.78)',
    bgStyle: 'box',
    position: 'top', // Default upper caption area
    alignment: 'center',
    direction: 'auto',
    shadow: true,
    strokeColor: '#000000',
    strokeWidth: 4,
  });

  // --- Translation Caption Style State (Independent Secondary Layer) ---
  const [secondaryStyle, setSecondaryStyle] = useState<CaptionStyle>({
    fontFamily: 'Inter',
    fontSize: 32,
    textColor: '#FACC15', // TikTok yellow for crisp contrast against white original
    bgColor: 'rgba(0, 0, 0, 0.78)',
    bgStyle: 'box',
    position: 'bottom', // Default lower caption area
    alignment: 'center',
    direction: 'auto',
    shadow: true,
    strokeColor: '#000000',
    strokeWidth: 4,
  });

  // Independent toggle for secondary translation caption layer
  const [showSecondaryCaptions, setShowSecondaryCaptions] = useState(true);

  // --- Watermark & Branding State ---
  const [watermark, setWatermark] = useState<WatermarkSettings>({
    type: 'none',
    text: '@reelstudio',
    textColor: '#FFFFFF',
    textSize: 28,
    opacity: 0.85,
    position: 'top-right',
    logoSize: 72,
  });

  const handleChangeWatermark = useCallback((newWatermark: Partial<WatermarkSettings>) => {
    setWatermark((prev) => ({ ...prev, ...newWatermark }));
  }, []);

  // --- Playback State ---
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Navigation & Modal State ---
  const [activeTab, setActiveTab] = useState<EditorTab>('captions');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // --- Export Settings & Progress ---
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    width: 720,
    height: 1280,
    fps: 30,
    duration: 15,
    format: 'mp4',
    includeAudio: true,
    fitMode: 'cover',
  });

  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    status: 'idle',
    currentFrame: 0,
    totalFrames: 450,
    percentage: 0,
    message: '',
  });

  const exportCancelSignalRef = useRef({ cancelled: false });
  const hiddenUploadInputRef = useRef<HTMLInputElement>(null);

  // Playhead controls
  const handleSeek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(TARGET_DURATION, time)));
  }, []);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  // Upload Video handler (handles single or multiple files with auto-transcode for unsupported formats)
  const handleAddClips = useCallback(async (files: FileList | File[]) => {
    const newClips: VideoClip[] = [];

    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      if (!file) continue;
      const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|3gp|flv)$/i.test(file.name);
      if (!isVideo) continue;

      let url = URL.createObjectURL(file);

      // Measure metadata duration & dimensions
      let vid = document.createElement('video');
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = 'metadata';

      let hasFormatError = false;

      await new Promise<void>((resolve) => {
        let done = false;
        const onDone = () => {
          if (!done) {
            done = true;
            cleanup();
            resolve();
          }
        };
        const onError = () => {
          if (!done) {
            done = true;
            hasFormatError = true;
            cleanup();
            resolve();
          }
        };
        const cleanup = () => {
          vid.removeEventListener('loadedmetadata', onDone);
          vid.removeEventListener('loadeddata', onDone);
          vid.removeEventListener('error', onError);
        };

        vid.addEventListener('loadedmetadata', onDone);
        vid.addEventListener('loadeddata', onDone);
        vid.addEventListener('error', onError);

        vid.src = url;
        vid.load();

        if (vid.readyState >= 1) {
          onDone();
        } else {
          setTimeout(onDone, 3000); // safety fallback
        }
      });

      // If format error occurred or browser could not parse video dimensions/duration (e.g. HEVC/H.265)
      if (hasFormatError || !Number.isFinite(vid.duration) || vid.videoWidth === 0) {
        console.warn(`File ${file.name} format not natively playable in browser. Auto-transcoding via FFmpeg...`);
        try {
          const transRes = await fetch(`/api/transcode?filename=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: file,
          });
          if (transRes.ok) {
            const transcodedBlob = await transRes.blob();
            url = URL.createObjectURL(transcodedBlob);
            file = new File([transcodedBlob], file.name, { type: 'video/mp4' });

            const checkVid = document.createElement('video');
            checkVid.muted = true;
            checkVid.playsInline = true;
            checkVid.src = url;
            checkVid.load();
            await new Promise<void>((res) => {
              checkVid.onloadedmetadata = () => res();
              checkVid.onerror = () => res();
              setTimeout(res, 2500);
            });
            vid = checkVid;
          }
        } catch (tErr) {
          console.error(`Failed to transcode ${file.name} on upload:`, tErr);
        }
      }

      const duration = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 6.0;
      const width = vid.videoWidth || 720;
      const height = vid.videoHeight || 1280;

      newClips.push({
        id: 'clip_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 6),
        name: file.name,
        url,
        file,
        duration,
        width,
        height,
      });
    }

    if (newClips.length > 0) {
      setClips((prev) => [...prev, ...newClips]);
      setCurrentTime(0);
      setIsPlaying(true);
    }
  }, []);

  const handleRemoveClip = useCallback((id: string) => {
    setClips((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target?.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((c) => c.id !== id);
    });
    setCurrentTime(0);
  }, []);

  const handleMoveClip = useCallback((index: number, direction: 'up' | 'down') => {
    setClips((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const [moved] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setCurrentTime(0);
  }, []);

  const handleClearClips = useCallback(() => {
    clips.forEach((c) => {
      if (c.url.startsWith('blob:')) URL.revokeObjectURL(c.url);
    });
    setClips([]);
    setCurrentTime(0);
    setIsPlaying(false);
  }, [clips]);

  // Demo generator handler
  const handleLoadDemo = useCallback(async (duration = 6, label = 'Demo 6s Clip') => {
    setIsLoadingDemo(true);
    try {
      const demoClip = await generateDemoVideo(duration, label);
      setClips((prev) => [...prev, demoClip]);
      setCurrentTime(0);
      setIsPlaying(true);
    } catch (err) {
      console.error('Failed to generate demo clip:', err);
    } finally {
      setIsLoadingDemo(false);
    }
  }, []);

  // Caption Segment update
  const handleUpdateSegmentText = useCallback((id: number, text: string) => {
    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, text } : c))
    );
  }, []);

  // Secondary Translation Caption Segment update
  const handleUpdateSegmentTranslation = useCallback((id: number, translationText: string) => {
    setCaptions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, translationText } : c))
    );
  }, []);

  const handleUpdateAllSegments = useCallback((newSegments: CaptionSegment[]) => {
    setCaptions(newSegments);
  }, []);

  // Caption Styling update (Primary)
  const handleChangeStyle = useCallback((newStyle: Partial<CaptionStyle>) => {
    setStyle((prev) => ({ ...prev, ...newStyle }));
  }, []);

  // Caption Styling update (Secondary Translation Layer)
  const handleChangeSecondaryStyle = useCallback((newStyle: Partial<CaptionStyle>) => {
    setSecondaryStyle((prev) => ({ ...prev, ...newStyle }));
  }, []);

  // Export Settings update
  const handleChangeExportSettings = useCallback((newSettings: Partial<ExportSettings>) => {
    setExportSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Start Real MP4 Export
  const handleStartExport = useCallback(async () => {
    if (clips.length === 0) return;

    exportCancelSignalRef.current.cancelled = false;
    setExportProgress({
      status: 'rendering',
      currentFrame: 0,
      totalFrames: 450,
      percentage: 0,
      message: 'Preparing 720p vertical video frames...',
    });

    try {
      const blob = await export15SecondMP4(
        clips,
        captions,
        style,
        {
          ...exportSettings,
          watermark,
          secondaryStyle,
          showSecondaryCaptions,
        },
        (p) => setExportProgress((prev) => ({ ...prev, ...p })),
        exportCancelSignalRef.current
      );

      const blobUrl = URL.createObjectURL(blob);
      setExportProgress((prev) => ({
        ...prev,
        status: 'complete',
        percentage: 100,
        outputBlobUrl: blobUrl,
      }));
    } catch (err) {
      console.error('Export error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown encoding failure';
      setExportProgress((prev) => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
    }
  }, [clips, captions, style, secondaryStyle, showSecondaryCaptions, exportSettings, watermark]);

  const handleCancelExport = useCallback(() => {
    exportCancelSignalRef.current.cancelled = true;
    setExportProgress({
      status: 'idle',
      currentFrame: 0,
      totalFrames: 450,
      percentage: 0,
      message: 'Export cancelled.',
    });
  }, []);

  // Open Export Modal
  const handleOpenExport = useCallback(() => {
    setIsPlaying(false);
    setExportProgress({
      status: 'idle',
      currentFrame: 0,
      totalFrames: 450,
      percentage: 0,
      message: '',
    });
    setIsExportModalOpen(true);
  }, []);

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    return () => {
      clips.forEach((c) => {
        if (c.url.startsWith('blob:')) URL.revokeObjectURL(c.url);
      });
      if (exportProgress.outputBlobUrl) {
        URL.revokeObjectURL(exportProgress.outputBlobUrl);
      }
    };
  }, []);

  // Non-empty captions count for badge
  const activeCaptionCount = useMemo(() => {
    return captions.filter((c) => c.text.trim().length > 0).length;
  }, [captions]);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 selection:bg-amber-500 selection:text-black">
      {/* Hidden Global File Input for fast upload trigger anywhere */}
      <input
        ref={hiddenUploadInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleAddClips(e.target.files);
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Top Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 flex flex-col md:flex-row gap-5 items-center md:items-start justify-center">
        {/* Left Column: 9:16 Video Player Preview */}
        <div className="w-full md:w-auto flex justify-center shrink-0">
          <VideoPlayer
            clips={clips}
            schedule={schedule}
            captions={captions}
            style={style}
            secondaryStyle={secondaryStyle}
            showSecondaryCaptions={showSecondaryCaptions}
            watermark={watermark}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTimeUpdate={setCurrentTime}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onLoadDemo={handleLoadDemo}
            isLoadingDemo={isLoadingDemo}
            onUploadClick={() => hiddenUploadInputRef.current?.click()}
          />
        </div>

        {/* Right Column: Active Tab Editor Tools */}
        <div className="w-full flex-1 max-w-md md:max-w-none">
          {activeTab === 'clips' && (
            <ClipsManager
              clips={clips}
              schedule={schedule}
              onAddClips={handleAddClips}
              onRemoveClip={handleRemoveClip}
              onMoveClip={handleMoveClip}
              onLoadDemo={handleLoadDemo}
              isLoadingDemo={isLoadingDemo}
              onClearClips={handleClearClips}
            />
          )}

          {activeTab === 'captions' && (
            <CaptionsEditor
              captions={captions}
              currentTime={currentTime}
              showSecondaryCaptions={showSecondaryCaptions}
              onToggleSecondaryCaptions={setShowSecondaryCaptions}
              onUpdateSegmentText={handleUpdateSegmentText}
              onUpdateSegmentTranslation={handleUpdateSegmentTranslation}
              onUpdateAllSegments={handleUpdateAllSegments}
              onSeekToSegment={handleSeek}
            />
          )}

          {activeTab === 'style' && (
            <StylePanel
              style={style}
              onChangeStyle={handleChangeStyle}
              secondaryStyle={secondaryStyle}
              onChangeSecondaryStyle={handleChangeSecondaryStyle}
              showSecondaryCaptions={showSecondaryCaptions}
              onToggleSecondaryCaptions={setShowSecondaryCaptions}
              watermark={watermark}
              onChangeWatermark={handleChangeWatermark}
            />
          )}

          {activeTab === 'timeline' && (
            <TimelineSequencer
              schedule={schedule}
              captions={captions}
              showSecondaryCaptions={showSecondaryCaptions}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              onTogglePlay={handleTogglePlay}
            />
          )}

          {activeTab === 'export' && (
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
              <div>
                <h3 className="font-bold text-sm text-white">Export 15s MP4 Video</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Ready to export your vertical reel with exact 15.00s precision and hardcoded multilingual captions.
                </p>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-300">
                  <span>Selected Clips:</span>
                  <span className="font-bold text-amber-400">{clips.length} clip(s)</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>Active Captions:</span>
                  <span className="font-bold text-amber-400">{activeCaptionCount} of 5 segments</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>Target Dimensions:</span>
                  <span className="font-mono text-neutral-200">720 × 1280 (9:16)</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>Video Encoding:</span>
                  <span className="font-mono text-neutral-200">H.264 (AVC) @ 30 FPS</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span>Duration:</span>
                  <span className="font-mono text-emerald-400 font-bold">Exactly 15.00s</span>
                </div>
              </div>

              <button
                onClick={handleOpenExport}
                disabled={clips.length === 0}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-40"
              >
                Open Export Dialog & Download
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Mobile-First Bottom Navigation Bar */}
      <BottomTabs
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        clipCount={clips.length}
        captionCount={activeCaptionCount}
      />

      {/* Export Modal & Progress Dialog */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        settings={exportSettings}
        onChangeSettings={handleChangeExportSettings}
        onStartExport={handleStartExport}
        onCancelExport={handleCancelExport}
        progress={exportProgress}
      />
    </div>
  );
}
