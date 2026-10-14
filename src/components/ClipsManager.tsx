import React, { useRef } from 'react';
import { Upload, Plus, Trash2, ArrowUp, ArrowDown, Sparkles, AlertCircle, CheckCircle2, Film } from 'lucide-react';
import { VideoClip, ScheduledClip } from '../types/editor';
import { formatTime } from '../utils/timeFormat';
import { TARGET_DURATION } from '../utils/videoMuxer';

interface ClipsManagerProps {
  clips: VideoClip[];
  schedule: ScheduledClip[];
  onAddClips: (files: FileList | File[]) => void;
  onRemoveClip: (id: string) => void;
  onMoveClip: (index: number, direction: 'up' | 'down') => void;
  onLoadDemo: (duration?: number, label?: string) => void;
  isLoadingDemo: boolean;
  onClearClips: () => void;
}

export const ClipsManager: React.FC<ClipsManagerProps> = ({
  clips,
  schedule,
  onAddClips,
  onRemoveClip,
  onMoveClip,
  onLoadDemo,
  isLoadingDemo,
  onClearClips,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddClips(e.target.files);
      e.target.value = '';
    }
  };

  const totalSourceDuration = clips.reduce((acc, c) => acc + c.duration, 0);

  // Compute description of the 15s logic
  const logicExplanation = () => {
    if (clips.length === 0) return null;
    if (clips.length === 1) {
      const dur = clips[0].duration;
      if (dur > TARGET_DURATION) {
        return `Single clip (${dur.toFixed(1)}s) is longer than 15s → Trimmed to the first 15.00 seconds.`;
      } else if (dur < TARGET_DURATION) {
        const repeats = Math.ceil(TARGET_DURATION / dur);
        return `Single clip (${dur.toFixed(1)}s) is shorter than 15s → Repeated ${repeats}× and trimmed at 15.00s.`;
      }
      return `Clip is exactly 15.00s.`;
    } else {
      if (totalSourceDuration >= TARGET_DURATION) {
        return `Multiple clips total ${totalSourceDuration.toFixed(1)}s → Joined sequentially and trimmed at 15.00s.`;
      } else {
        return `Multiple clips total ${totalSourceDuration.toFixed(1)}s → Sequence is repeated until 15.00s is reached.`;
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload & Add Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-900 p-3 rounded-xl border border-neutral-800">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
            <Film className="w-4 h-4 text-amber-400" />
            <span>Clips Editor</span>
            <span className="text-xs font-normal text-neutral-400">
              ({clips.length} {clips.length === 1 ? 'clip' : 'clips'})
            </span>
          </h3>
          <p className="text-xs text-neutral-400">
            Target duration: <strong className="text-amber-400">15.00s vertical reel</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition active:scale-95 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Upload Video</span>
          </button>

          <button
            onClick={() => onLoadDemo(10, `Clip ${clips.length + 1} (10s)`)}
            disabled={isLoadingDemo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition active:scale-95"
            title="Generate a demo clip"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">+ Demo</span> 10s
          </button>
        </div>
      </div>

      {/* 15-Second Sequencer Rule Banner */}
      {clips.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-start gap-2 text-neutral-200">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-amber-400">Exact 15-Second Output Rule Active</div>
            <p className="text-neutral-300">{logicExplanation()}</p>
          </div>
        </div>
      )}

      {/* Empty State Dropzone */}
      {clips.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-neutral-800 hover:border-amber-500/60 bg-neutral-900/40 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 group"
        >
          <div className="w-12 h-12 rounded-full bg-neutral-800 group-hover:bg-amber-500/20 text-neutral-400 group-hover:text-amber-400 flex items-center justify-center transition">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold text-sm text-white group-hover:text-amber-400 transition">
              Select or Drop Video Files
            </p>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm">
              Upload MP4, WebM, or MOV. Multiple clips are automatically stitched and tailored to 15s.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap gap-2 justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadDemo(6, 'Demo 6s Clip');
              }}
              disabled={isLoadingDemo}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load 6s Clip (Tests Looping)</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLoadDemo(20, 'Demo 20s Clip');
              }}
              disabled={isLoadingDemo}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold border border-neutral-700 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load 20s Clip (Tests Trimming)</span>
            </button>
          </div>
        </div>
      ) : (
        /* Clips List */
        <div className="space-y-2">
          {clips.map((clip, idx) => (
            <div
              key={clip.id}
              className="flex items-center justify-between p-3 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-white truncate max-w-[180px] sm:max-w-xs">
                    {clip.name}
                  </p>
                  <p className="text-[11px] text-neutral-400">
                    Duration: <span className="text-neutral-200 font-mono">{clip.duration.toFixed(1)}s</span>
                    {' • '}
                    {clip.width}×{clip.height}
                  </p>
                </div>
              </div>

              {/* Actions: Move Up / Down, Delete */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onMoveClip(idx, 'up')}
                  disabled={idx === 0}
                  className="w-7 h-7 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center disabled:opacity-30 transition"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onMoveClip(idx, 'down')}
                  disabled={idx === clips.length - 1}
                  className="w-7 h-7 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center disabled:opacity-30 transition"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onRemoveClip(clip.id)}
                  className="w-7 h-7 rounded-md bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 flex items-center justify-center transition"
                  title="Delete Clip"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Schedule Sequence Breakdown */}
          <div className="mt-4 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-neutral-300 font-semibold">
              <span>Sequence Timeline Mapping</span>
              <button
                onClick={onClearClips}
                className="text-[11px] text-red-400 hover:text-red-300 transition"
              >
                Clear all
              </button>
            </div>
            <div className="space-y-1.5">
              {schedule.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-[11px] bg-neutral-950/60 px-2.5 py-1.5 rounded-lg border border-neutral-800/80"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[9px] flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-neutral-300 truncate font-medium">
                      {item.clip.name}
                      {item.loopIndex > 0 && (
                        <span className="text-amber-400/90 ml-1.5">
                          (Loop {item.loopIndex + 1})
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="font-mono text-neutral-400 shrink-0 ml-2">
                    {formatTime(item.startTime)} → {formatTime(item.endTime)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
