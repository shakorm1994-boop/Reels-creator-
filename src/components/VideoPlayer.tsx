import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Upload } from 'lucide-react';
import { VideoClip, ScheduledClip, CaptionSegment, CaptionStyle, WatermarkSettings } from '../types/editor';
import { TARGET_DURATION, getActiveClipAtTime } from '../utils/videoMuxer';
import { formatTime } from '../utils/timeFormat';
import { isRtlText } from '../utils/textShaper';

interface VideoPlayerProps {
  clips: VideoClip[];
  schedule: ScheduledClip[];
  captions: CaptionSegment[];
  style: CaptionStyle;
  secondaryStyle?: CaptionStyle;
  showSecondaryCaptions?: boolean;
  watermark?: WatermarkSettings;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onLoadDemo: (duration?: number, label?: string) => void;
  isLoadingDemo: boolean;
  onUploadClick: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  clips,
  schedule,
  captions,
  style,
  secondaryStyle,
  showSecondaryCaptions,
  watermark,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onTogglePlay,
  onSeek,
  onLoadDemo,
  isLoadingDemo,
  onUploadClick,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Active scheduled clip at current time
  const activeClipInfo = useMemo(() => {
    return getActiveClipAtTime(schedule, currentTime);
  }, [schedule, currentTime]);

  // Active caption segment at current time
  const activeCaption = useMemo(() => {
    return captions.find(
      (c) => currentTime >= c.startTime && currentTime < c.endTime && c.text.trim().length > 0
    ) || null;
  }, [captions, currentTime]);

  // Keep video element synced with active scheduled clip
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClipInfo) return;

    const currentUrl = video.src;
    const targetUrl = activeClipInfo.scheduled.clip.url;

    // Switch video source if different clip
    if (!currentUrl.includes(targetUrl)) {
      video.src = targetUrl;
      video.load();
    }
  }, [activeClipInfo]);

  // Sync video element time and playback state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeClipInfo) return;

    const targetOffset = Math.min(activeClipInfo.offsetTime, activeClipInfo.scheduled.clip.duration - 0.05);

    // If drift is significant (> 0.25s), correct the video position
    if (Math.abs(video.currentTime - targetOffset) > 0.25) {
      video.currentTime = targetOffset;
    }

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [currentTime, isPlaying, activeClipInfo]);

  // Playback timer loop (30 fps precision ticker for 15s sequence)
  useEffect(() => {
    if (!isPlaying) return;

    let lastTimestamp = performance.now();
    let animationFrameId: number;

    const tick = (now: number) => {
      const deltaSec = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      const nextTime = currentTime + deltaSec;
      if (nextTime >= TARGET_DURATION) {
        // Loop back to 0 at 15.00s
        onTimeUpdate(0);
      } else {
        onTimeUpdate(nextTime);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, currentTime, onTimeUpdate]);

  // Determine text direction for live overlay
  const isRtl = useMemo(() => {
    if (!activeCaption?.text) return false;
    if (style.direction === 'rtl') return true;
    if (style.direction === 'ltr') return false;
    return isRtlText(activeCaption.text);
  }, [activeCaption, style.direction]);

  // Scrubber drag handler
  const handleScrubberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onSeek(val);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* 9:16 Vertical Video Frame Container */}
      <div
        ref={containerRef}
        onClick={clips.length > 0 ? onTogglePlay : undefined}
        className="relative w-full max-w-[270px] sm:max-w-[310px] aspect-[9/16] bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-neutral-800 flex items-center justify-center select-none group cursor-pointer"
      >
        {clips.length > 0 ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted={isMuted}
              onLoadedData={() => setIsVideoLoaded(true)}
              onError={(e) => {
                console.warn('Live player video format warning:', e);
              }}
              className="w-full h-full object-cover pointer-events-none"
            />

            {/* Subtle Gradient Overlays for Video Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

            {/* Live Caption Overlay */}
            {activeCaption && activeCaption.text.trim().length > 0 && (
              <div
                className={`absolute left-0 right-0 px-5 flex pointer-events-none transition-all duration-100 ${
                  showSecondaryCaptions && secondaryStyle && activeCaption.translationText?.trim() && style.position === secondaryStyle.position
                    ? style.position === 'top'
                      ? 'top-[10%]'
                      : style.position === 'center'
                      ? 'top-[42%] -translate-y-1/2'
                      : 'bottom-[23%]'
                    : style.position === 'top'
                    ? 'top-[14%]'
                    : style.position === 'center'
                    ? 'top-1/2 -translate-y-1/2'
                    : 'bottom-[14%]'
                } ${
                  style.alignment === 'left'
                    ? 'justify-start text-left'
                    : style.alignment === 'right'
                    ? 'justify-end text-right'
                    : 'justify-center text-center'
                }`}
                style={{ direction: isRtl ? 'rtl' : 'ltr' }}
              >
                <div
                  className={`inline-block max-w-[90%] font-bold leading-snug tracking-wide ${
                    style.bgStyle === 'box'
                      ? 'rounded-xl px-4 py-2'
                      : style.bgStyle === 'pill'
                      ? 'rounded-full px-5 py-2'
                      : style.bgStyle === 'banner'
                      ? 'w-full py-2 px-4'
                      : ''
                  }`}
                  style={{
                    fontFamily: `${style.fontFamily}, Cairo, Vazirmatn, Tajawal, Inter, sans-serif`,
                    fontSize: `${Math.round(style.fontSize * 0.42)}px`, // scaled for preview viewport
                    color: style.textColor,
                    backgroundColor:
                      style.bgStyle === 'box' || style.bgStyle === 'pill' || style.bgStyle === 'banner'
                        ? style.bgColor
                        : 'transparent',
                    textShadow: style.shadow
                      ? '0 2px 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)'
                      : style.bgStyle === 'outline'
                      ? `-2px -2px 0 ${style.strokeColor}, 2px -2px 0 ${style.strokeColor}, -2px 2px 0 ${style.strokeColor}, 2px 2px 0 ${style.strokeColor}`
                      : 'none',
                    WebkitTextStroke:
                      style.bgStyle === 'outline' && style.strokeWidth > 0
                        ? `${Math.max(1, Math.round(style.strokeWidth * 0.4))}px ${style.strokeColor}`
                        : 'none',
                  }}
                >
                  {activeCaption.text}
                </div>
              </div>
            )}

            {/* Live Secondary Translation Caption Overlay */}
            {showSecondaryCaptions && secondaryStyle && activeCaption && activeCaption.translationText && activeCaption.translationText.trim().length > 0 && (
              <div
                className={`absolute left-0 right-0 px-5 flex pointer-events-none transition-all duration-100 ${
                  activeCaption.text.trim() && style.position === secondaryStyle.position
                    ? secondaryStyle.position === 'top'
                      ? 'top-[23%]'
                      : secondaryStyle.position === 'center'
                      ? 'top-[58%] -translate-y-1/2'
                      : 'bottom-[9%]'
                    : secondaryStyle.position === 'top'
                    ? 'top-[14%]'
                    : secondaryStyle.position === 'center'
                    ? 'top-1/2 -translate-y-1/2'
                    : 'bottom-[14%]'
                } ${
                  secondaryStyle.alignment === 'left'
                    ? 'justify-start text-left'
                    : secondaryStyle.alignment === 'right'
                    ? 'justify-end text-right'
                    : 'justify-center text-center'
                }`}
                style={{
                  direction:
                    secondaryStyle.direction === 'rtl' ||
                    (secondaryStyle.direction === 'auto' && isRtlText(activeCaption.translationText))
                      ? 'rtl'
                      : 'ltr',
                }}
              >
                <div
                  className={`inline-block max-w-[90%] font-bold leading-snug tracking-wide ${
                    secondaryStyle.bgStyle === 'box'
                      ? 'rounded-xl px-4 py-2'
                      : secondaryStyle.bgStyle === 'pill'
                      ? 'rounded-full px-5 py-2'
                      : secondaryStyle.bgStyle === 'banner'
                      ? 'w-full py-2 px-4'
                      : ''
                  }`}
                  style={{
                    fontFamily: `${secondaryStyle.fontFamily}, Inter, Cairo, Vazirmatn, Tajawal, sans-serif`,
                    fontSize: `${Math.round(secondaryStyle.fontSize * 0.42)}px`,
                    color: secondaryStyle.textColor,
                    backgroundColor:
                      secondaryStyle.bgStyle === 'box' || secondaryStyle.bgStyle === 'pill' || secondaryStyle.bgStyle === 'banner'
                        ? secondaryStyle.bgColor
                        : 'transparent',
                    textShadow: secondaryStyle.shadow
                      ? '0 2px 6px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)'
                      : secondaryStyle.bgStyle === 'outline'
                      ? `-2px -2px 0 ${secondaryStyle.strokeColor}, 2px -2px 0 ${secondaryStyle.strokeColor}, -2px 2px 0 ${secondaryStyle.strokeColor}, 2px 2px 0 ${secondaryStyle.strokeColor}`
                      : 'none',
                    WebkitTextStroke:
                      secondaryStyle.bgStyle === 'outline' && secondaryStyle.strokeWidth > 0
                        ? `${Math.max(1, Math.round(secondaryStyle.strokeWidth * 0.4))}px ${secondaryStyle.strokeColor}`
                        : 'none',
                  }}
                >
                  {activeCaption.translationText}
                </div>
              </div>
            )}

            {/* Loop & Clip Status Chip (Top-Left) */}
            {activeClipInfo && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-neutral-300 border border-white/10 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>
                  {activeClipInfo.scheduled.loopIndex > 0
                    ? `Loop ${activeClipInfo.scheduled.loopIndex + 1}`
                    : activeClipInfo.scheduled.clip.name.slice(0, 14)}
                </span>
              </div>
            )}

            {/* Live Watermark Overlay (Text, Logo, or Both) */}
            {watermark && watermark.type !== 'none' && (
              <div
                className={`absolute z-20 flex items-center pointer-events-none transition-all duration-100 ${
                  watermark.position === 'top-left'
                    ? 'top-3 left-3'
                    : watermark.position === 'top-right'
                    ? 'top-3 right-3'
                    : watermark.position === 'bottom-left'
                    ? 'bottom-3 left-3'
                    : watermark.position === 'bottom-right'
                    ? 'bottom-3 right-3'
                    : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
                }`}
                style={{ opacity: watermark.opacity ?? 0.85 }}
              >
                <div className="flex items-center gap-1.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                  {(watermark.type === 'logo' || watermark.type === 'both') && watermark.logoUrl && (
                    <img
                      src={watermark.logoUrl}
                      alt="Watermark Logo"
                      className="object-contain"
                      style={{
                        width: `${Math.round((watermark.logoSize || 72) * 0.42)}px`,
                        maxHeight: `${Math.round((watermark.logoSize || 72) * 0.42)}px`,
                      }}
                    />
                  )}
                  {(watermark.type === 'text' || watermark.type === 'both') && watermark.text?.trim() && (
                    <span
                      className="font-bold tracking-tight select-none leading-none"
                      style={{
                        color: watermark.textColor || '#FFFFFF',
                        fontSize: `${Math.round((watermark.textSize || 30) * 0.42)}px`,
                        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                      }}
                    >
                      {watermark.text.trim()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Big Center Play/Pause button on Hover or Paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
                <div className="w-14 h-14 rounded-full bg-amber-500/90 hover:bg-amber-400 text-neutral-950 flex items-center justify-center shadow-xl shadow-amber-500/30 transition transform scale-100 hover:scale-105 active:scale-95">
                  <Play className="w-7 h-7 fill-current translate-x-0.5" />
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State Placeholder */
          <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-center shadow-inner">
              <Upload className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Upload Video to Begin</p>
              <p className="text-xs text-neutral-400 mt-1 max-w-[200px]">
                Supports MP4, WebM, MOV. Auto-trimmed or looped to exact 15s.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadClick();
                }}
                className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition active:scale-95"
              >
                Choose Local Video
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoadDemo(6, 'Demo Reel 1');
                }}
                disabled={isLoadingDemo}
                className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs border border-neutral-700 flex items-center justify-center gap-1.5 transition active:scale-95"
              >
                {isLoadingDemo ? (
                  <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Load 6s Demo Clip</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Playback Controls & Precision Scrub Bar */}
      <div className="w-full max-w-[270px] sm:max-w-[310px] mt-3 space-y-2">
        {/* Scrubber Range */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={TARGET_DURATION}
            step={0.05}
            value={currentTime}
            onChange={handleScrubberChange}
            disabled={clips.length === 0}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none disabled:opacity-30"
          />
        </div>

        {/* Buttons and Time Display */}
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              disabled={clips.length === 0}
              className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition active:scale-90 disabled:opacity-40"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />
              )}
            </button>

            <button
              onClick={() => onSeek(0)}
              disabled={clips.length === 0}
              className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition active:scale-90 disabled:opacity-40"
              title="Restart 00:00"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              disabled={clips.length === 0}
              className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition active:scale-90 disabled:opacity-40"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <div className="font-mono text-neutral-400 font-semibold tracking-wider text-[11px]">
            <span className="text-amber-400 font-bold">{formatTime(currentTime, true)}</span>
            <span className="text-neutral-600 mx-1">/</span>
            <span>00:15.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
