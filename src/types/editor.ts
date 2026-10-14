export interface VideoClip {
  id: string;
  name: string;
  url: string;
  file?: File;
  duration: number; // in seconds
  width: number;
  height: number;
}

export interface ScheduledClip {
  clip: VideoClip;
  startTime: number; // in seconds on timeline (0 - 15)
  endTime: number;   // in seconds on timeline (0 - 15)
  clipOffset: number; // offset within the original clip
  loopIndex: number;
}

export interface CaptionSegment {
  id: number; // 1 to 5
  startTime: number; // in seconds
  endTime: number;   // in seconds
  text: string;
  translationText?: string; // independent secondary translation text
}

export type TextDirection = 'auto' | 'rtl' | 'ltr';
export type TextAlignment = 'left' | 'center' | 'right';
export type CaptionPosition = 'top' | 'center' | 'bottom';
export type CaptionBgStyle = 'none' | 'box' | 'banner' | 'outline' | 'pill';

export type LanguagePreset = 'ar' | 'fa' | 'en' | 'tr';

export interface CaptionStyle {
  fontFamily: string;
  fontSize: number; // pixels on 720x1280 canvas
  textColor: string;
  bgColor: string;
  bgStyle: CaptionBgStyle;
  position: CaptionPosition;
  alignment: TextAlignment;
  direction: TextDirection;
  shadow: boolean;
  strokeColor: string;
  strokeWidth: number;
}

export type WatermarkType = 'none' | 'text' | 'logo' | 'both';
export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface WatermarkSettings {
  type: WatermarkType;
  text: string;
  textColor: string;
  textSize: number; // pixels on 720x1280 canvas (e.g. 24 to 56)
  opacity: number;  // 0.1 to 1.0
  position: WatermarkPosition;
  logoUrl?: string;
  logoFile?: File;
  logoSize: number; // width in pixels on 720x1280 canvas (e.g. 40 to 180)
}

export interface ExportSettings {
  width: number;
  height: number;
  fps: number;
  duration: number; // exactly 15s
  format: 'mp4';
  includeAudio: boolean;
  fitMode: 'cover' | 'contain';
  watermark?: WatermarkSettings;
  secondaryStyle?: CaptionStyle;
  showSecondaryCaptions?: boolean;
}

export interface ExportProgress {
  status: 'idle' | 'rendering' | 'muxing' | 'complete' | 'error';
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  message: string;
  error?: string;
  outputBlobUrl?: string;
  outputSizeMb?: number;
}

export type EditorTab = 'clips' | 'captions' | 'style' | 'timeline' | 'export';
