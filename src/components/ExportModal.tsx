import React, { useState } from 'react';
import { X, Download, AlertCircle, CheckCircle2, Film, Volume2, VolumeX, RefreshCw, Smartphone } from 'lucide-react';
import { ExportSettings, ExportProgress } from '../types/editor';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ExportSettings;
  onChangeSettings: (newSettings: Partial<ExportSettings>) => void;
  onStartExport: () => void;
  onCancelExport: () => void;
  progress: ExportProgress;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  settings,
  onChangeSettings,
  onStartExport,
  onCancelExport,
  progress,
}) => {
  if (!isOpen) return null;

  const isProcessing = progress.status === 'rendering' || progress.status === 'muxing';
  const isComplete = progress.status === 'complete';
  const isError = progress.status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Export 15s MP4 Reel</h3>
              <p className="text-[11px] text-neutral-400">720×1280 Vertical H.264 Video</p>
            </div>
          </div>

          {!isProcessing && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {isProcessing ? (
            /* Progress State */
            <div className="py-6 space-y-4 text-center">
              <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-neutral-800"
                    fill="transparent"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-amber-500 transition-all duration-200"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - progress.percentage / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute font-mono font-bold text-lg text-white">
                  {progress.percentage}%
                </div>
              </div>

              <div>
                <p className="font-bold text-sm text-white">{progress.message}</p>
                <p className="text-xs text-neutral-400 mt-1 font-mono">
                  Frame {progress.currentFrame} / {progress.totalFrames} (30 fps)
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onCancelExport}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold border border-neutral-700 transition"
                >
                  Cancel Export
                </button>
              </div>
            </div>
          ) : isComplete ? (
            /* Complete State */
            <div className="py-2 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="font-bold text-base text-white">Export Ready!</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Genuine 15.0s H.264 MP4 with burned-in captions ({progress.outputSizeMb} MB)
                </p>
              </div>

              {/* Video Player Preview of Exported File */}
              {progress.outputBlobUrl && (
                <div className="relative max-w-[200px] aspect-[9/16] mx-auto rounded-xl overflow-hidden border border-neutral-800 shadow-xl bg-black">
                  <video
                    src={progress.outputBlobUrl}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                {progress.outputBlobUrl && (
                  <a
                    href={progress.outputBlobUrl}
                    download="reel_studio_export_15s.mp4"
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition active:scale-95"
                  >
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download MP4 Video</span>
                  </a>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition"
                >
                  Back to Editor
                </button>
              </div>
            </div>
          ) : isError ? (
            /* Error State */
            <div className="py-4 space-y-3 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Export Failed</h4>
                <p className="text-xs text-red-400 mt-1 max-w-xs mx-auto">
                  {progress.error || 'An unexpected error occurred during encoding.'}
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
                >
                  Close
                </button>
                <button
                  onClick={onStartExport}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Export</span>
                </button>
              </div>
            </div>
          ) : (
            /* Idle Settings State */
            <>
              {/* Quick Spec Chips */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-[10px] text-neutral-500">FORMAT</div>
                    <div className="font-bold text-neutral-200">720 × 1280 (9:16)</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-2">
                  <Film className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-[10px] text-neutral-500">DURATION & CODEC</div>
                    <div className="font-bold text-neutral-200">15.00s • H.264</div>
                  </div>
                </div>
              </div>

              {/* Fit Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Aspect Ratio Crop</label>
                <div className="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
                  <button
                    onClick={() => onChangeSettings({ fitMode: 'cover' })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded transition ${
                      settings.fitMode === 'cover'
                        ? 'bg-amber-500 text-neutral-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Smart Cover (No Bars)
                  </button>
                  <button
                    onClick={() => onChangeSettings({ fitMode: 'contain' })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded transition ${
                      settings.fitMode === 'contain'
                        ? 'bg-amber-500 text-neutral-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Contain (Letterbox)
                  </button>
                </div>
              </div>

              {/* Audio Toggle */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Audio Track</label>
                <div className="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
                  <button
                    onClick={() => onChangeSettings({ includeAudio: true })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition ${
                      settings.includeAudio
                        ? 'bg-amber-500 text-neutral-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Preserve Audio</span>
                  </button>
                  <button
                    onClick={() => onChangeSettings({ includeAudio: false })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center gap-1.5 transition ${
                      !settings.includeAudio
                        ? 'bg-amber-500 text-neutral-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Mute Audio</span>
                  </button>
                </div>
              </div>

              {/* Export Info Notice */}
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <div className="font-semibold text-neutral-300 flex items-center gap-1">
                  <span>✓ 100% Genuine MP4 Encoding</span>
                </div>
                <p>
                  Video is encoded with H.264 video codec and AAC audio inside an ISO MP4 container.
                  Compatible with Instagram Reels, TikTok, YouTube Shorts, iOS, and Android.
                </p>
              </div>

              {/* Start Button */}
              <div className="pt-2">
                <button
                  onClick={onStartExport}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition active:scale-95"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Start 15s MP4 Export</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
