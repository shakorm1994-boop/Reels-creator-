import React, { useRef } from 'react';
import { Clock, Film, MessageSquare, Play, Pause } from 'lucide-react';
import { ScheduledClip, CaptionSegment } from '../types/editor';
import { TARGET_DURATION } from '../utils/videoMuxer';
import { formatTime } from '../utils/timeFormat';

interface TimelineSequencerProps {
  schedule: ScheduledClip[];
  captions: CaptionSegment[];
  showSecondaryCaptions?: boolean;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  onTogglePlay: () => void;
}

export const TimelineSequencer: React.FC<TimelineSequencerProps> = ({
  schedule,
  captions,
  showSecondaryCaptions = false,
  currentTime,
  isPlaying,
  onSeek,
  onTogglePlay,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = ratio * TARGET_DURATION;
    onSeek(newTime);
  };

  const playheadPercent = (currentTime / TARGET_DURATION) * 100;

  // Generate 1-second interval tick marks (0 to 15)
  const ticks = Array.from({ length: 16 }, (_, i) => i);

  return (
    <div className="bg-neutral-900 p-4 rounded-xl border border-neutral-800 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="font-bold text-sm text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Timeline Sequencer (15s Precision)</span>
        </h3>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-amber-400 font-bold bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            {formatTime(currentTime, true)} / 00:15.0
          </span>
          <button
            onClick={onTogglePlay}
            className="w-7 h-7 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition active:scale-95"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />}
          </button>
        </div>
      </div>

      {/* Main Interactive Timeline Area */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        className="relative bg-neutral-950 rounded-xl border border-neutral-800 p-3 pt-6 cursor-pointer select-none overflow-hidden"
      >
        {/* Time Ruler Ticks */}
        <div className="absolute top-1.5 left-3 right-3 flex justify-between text-[10px] text-neutral-500 font-mono pointer-events-none">
          {ticks.map((s) => (
            <span key={s} className="relative -translate-x-1/2">
              {s % 3 === 0 ? `${s}s` : '·'}
            </span>
          ))}
        </div>

        {/* Video Track */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            <Film className="w-3 h-3 text-amber-400" />
            <span>Video Track (15.0s)</span>
          </div>

          <div className="relative h-11 bg-neutral-900/80 rounded-lg overflow-hidden border border-neutral-800 flex">
            {schedule.length > 0 ? (
              schedule.map((item, idx) => {
                const widthPct = ((item.endTime - item.startTime) / TARGET_DURATION) * 100;
                const colors = [
                  'bg-blue-600/30 border-blue-500/50 text-blue-200',
                  'bg-purple-600/30 border-purple-500/50 text-purple-200',
                  'bg-emerald-600/30 border-emerald-500/50 text-emerald-200',
                  'bg-orange-600/30 border-orange-500/50 text-orange-200',
                ];
                const colorClass = colors[idx % colors.length];

                return (
                  <div
                    key={idx}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full border-r border-y first:rounded-l-lg last:rounded-r-lg p-1.5 flex flex-col justify-between overflow-hidden text-[10px] transition hover:brightness-110 ${colorClass}`}
                  >
                    <div className="font-bold truncate leading-tight">
                      {item.clip.name}
                      {item.loopIndex > 0 && ` (L${item.loopIndex + 1})`}
                    </div>
                    <div className="font-mono text-[9px] opacity-80 truncate">
                      {(item.endTime - item.startTime).toFixed(1)}s
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full flex items-center justify-center text-xs text-neutral-600 font-medium">
                No Video Clips Added
              </div>
            )}
          </div>
        </div>

        {/* Caption Track (5 Segments) */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            <MessageSquare className="w-3 h-3 text-amber-400" />
            <span>Caption Track (5 Segments)</span>
          </div>

          <div className="grid grid-cols-5 gap-1 min-h-12 py-0.5">
            {captions.map((seg) => {
              const isCurrent = currentTime >= seg.startTime && currentTime < seg.endTime;
              const hasTrans = showSecondaryCaptions && Boolean(seg.translationText?.trim());
              return (
                <div
                  key={seg.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(seg.startTime);
                  }}
                  className={`rounded-lg p-1.5 flex flex-col justify-between text-[10px] transition cursor-pointer overflow-hidden border ${
                    isCurrent
                      ? 'bg-amber-500/25 border-amber-500 ring-1 ring-amber-500/40 text-amber-200 font-bold'
                      : seg.text.trim() || hasTrans
                      ? 'bg-neutral-900 border-neutral-700/80 text-neutral-300 hover:border-neutral-600'
                      : 'bg-neutral-950/60 border-dashed border-neutral-800 text-neutral-600'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[9px] mb-0.5">
                    <span>S{seg.id}</span>
                    <span className="opacity-70">{seg.startTime}s</span>
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="truncate text-[10px] font-medium leading-tight">
                      {seg.text || <em className="opacity-40">empty</em>}
                    </div>
                    {hasTrans && (
                      <div className="truncate text-[8px] font-mono text-amber-300/80 leading-tight">
                        ↳ {seg.translationText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Draggable / Synced Vertical Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none z-10 shadow-[0_0_10px_rgba(245,158,11,0.8)]"
          style={{ left: `calc(${playheadPercent}% * (1 - 24px / 100%) + 12px)` }}
        >
          <div className="w-3 h-3.5 -translate-x-[5px] -translate-y-0.5 bg-amber-400 rounded-sm shadow-md flex items-center justify-center">
            <div className="w-1 h-2 bg-neutral-950 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
