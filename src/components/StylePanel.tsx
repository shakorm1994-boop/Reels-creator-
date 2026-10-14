import React, { useRef, useState } from 'react';
import { Palette, AlignLeft, AlignCenter, AlignRight, Sliders, Type, Stamp, Upload, Trash2, Image as ImageIcon, Languages, Eye, EyeOff } from 'lucide-react';
import { CaptionStyle, CaptionPosition, TextAlignment, CaptionBgStyle, TextDirection, WatermarkSettings, WatermarkPosition, WatermarkType } from '../types/editor';

interface StylePanelProps {
  style: CaptionStyle;
  onChangeStyle: (newStyle: Partial<CaptionStyle>) => void;
  secondaryStyle: CaptionStyle;
  onChangeSecondaryStyle: (newStyle: Partial<CaptionStyle>) => void;
  showSecondaryCaptions: boolean;
  onToggleSecondaryCaptions: (enabled: boolean) => void;
  watermark: WatermarkSettings;
  onChangeWatermark: (newWatermark: Partial<WatermarkSettings>) => void;
}

const FONTS = [
  { name: 'Cairo', label: 'Cairo (Arabic / All)', class: 'font-cairo' },
  { name: 'Tajawal', label: 'Tajawal (Modern Arabic)', class: 'font-tajawal' },
  { name: 'Vazirmatn', label: 'Vazirmatn (Persian / Dari)', class: 'font-vazirmatn' },
  { name: 'Amiri', label: 'Amiri (Classic Arabic)', class: 'font-amiri' },
  { name: 'Inter', label: 'Inter (English / Turkish)', class: 'font-inter' },
  { name: 'Montserrat', label: 'Montserrat (Bold Reel)', class: 'font-sans' },
];

const COLORS = [
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#FACC15', name: 'TikTok Yellow' },
  { hex: '#38BDF8', name: 'Sky Cyan' },
  { hex: '#4ADE80', name: 'Neon Green' },
  { hex: '#FB7185', name: 'Coral Rose' },
  { hex: '#000000', name: 'Black' },
];

const BG_STYLES: { id: CaptionBgStyle; label: string; desc: string }[] = [
  { id: 'box', label: 'Dark Box', desc: 'High-contrast rounded box' },
  { id: 'pill', label: 'Capsule Pill', desc: 'Chic rounded pill' },
  { id: 'banner', label: 'Cinema Banner', desc: 'Translucent bar backdrop' },
  { id: 'outline', label: 'Heavy Stroke', desc: 'Clean outline without box' },
  { id: 'none', label: 'Clean Shadow', desc: 'Pure text with drop shadow' },
];

export const StylePanel: React.FC<StylePanelProps> = ({
  style,
  onChangeStyle,
  secondaryStyle,
  onChangeSecondaryStyle,
  showSecondaryCaptions,
  onToggleSecondaryCaptions,
  watermark,
  onChangeWatermark,
}) => {
  const [activeLayer, setActiveLayer] = useState<'original' | 'translation'>('original');
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Active layer styling targets
  const currentStyle = activeLayer === 'original' ? style : secondaryStyle;
  const handleChangeCurrentStyle = activeLayer === 'original' ? onChangeStyle : onChangeSecondaryStyle;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const logoUrl = URL.createObjectURL(file);
      onChangeWatermark({
        logoUrl,
        logoFile: file,
        type: watermark.type === 'none' ? 'logo' : watermark.type,
      });
      e.target.value = '';
    }
  };

  const handleRemoveLogo = () => {
    if (watermark.logoUrl && watermark.logoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(watermark.logoUrl);
    }
    onChangeWatermark({
      logoUrl: undefined,
      logoFile: undefined,
      type: watermark.type === 'both' ? 'text' : 'none',
    });
  };

  return (
    <div className="space-y-5">
      {/* CAPTION STYLING SECTION */}
      <div className="space-y-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between pb-1 border-b border-neutral-800">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-amber-400" />
            <span>Caption Typography & Style</span>
          </h3>
          <span className="text-[11px] text-neutral-400">Independent Layers</span>
        </div>

        {/* Layer Switcher Tabs: Original vs Secondary Translation */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
            <button
              onClick={() => setActiveLayer('original')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center ${
                activeLayer === 'original'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Original Captions</span>
              <span className="text-[10px] font-normal opacity-75">
                Pos: {style.position} • {style.fontSize}px
              </span>
            </button>

            <button
              onClick={() => setActiveLayer('translation')}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center ${
                activeLayer === 'translation'
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1">
                <Languages className="w-3.5 h-3.5" />
                <span>Translation Layer</span>
              </div>
              <span className="text-[10px] font-normal opacity-75">
                Pos: {secondaryStyle.position} • {secondaryStyle.fontSize}px
              </span>
            </button>
          </div>

          {/* Translation Layer Visibility Toggle when editing translation layer */}
          {activeLayer === 'translation' && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
              <span className="text-neutral-300">
                Layer Visibility:{' '}
                <strong className={showSecondaryCaptions ? 'text-emerald-400 font-bold' : 'text-neutral-500'}>
                  {showSecondaryCaptions ? 'Active in Video' : 'Hidden / Disabled'}
                </strong>
              </span>
              <button
                onClick={() => onToggleSecondaryCaptions(!showSecondaryCaptions)}
                className={`px-3 py-1 rounded text-xs font-bold transition ${
                  showSecondaryCaptions
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {showSecondaryCaptions ? 'Hide Layer' : 'Show Layer'}
              </button>
            </div>
          )}
        </div>

        {/* Font Family Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
            <span>Font Family ({activeLayer === 'original' ? 'Original' : 'Translation'})</span>
            <span className="text-[10px] text-amber-400 font-mono">{currentStyle.fontFamily}</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FONTS.map((font) => (
              <button
                key={font.name}
                onClick={() => handleChangeCurrentStyle({ fontFamily: font.name })}
                className={`p-2.5 rounded-lg text-left text-xs transition border ${
                  currentStyle.fontFamily === font.name
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="truncate font-semibold">{font.name}</div>
                <div className="text-[10px] text-neutral-500 truncate mt-0.5">
                  {font.label.split('(')[1]?.replace(')', '') || ''}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="font-semibold text-neutral-300">
              Font Size ({activeLayer === 'original' ? 'Original' : 'Translation'})
            </label>
            <span className="font-mono text-amber-400 font-bold">{currentStyle.fontSize}px</span>
          </div>
          <input
            type="range"
            min={20}
            max={64}
            step={2}
            value={currentStyle.fontSize}
            onChange={(e) => handleChangeCurrentStyle({ fontSize: parseInt(e.target.value) })}
            className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        {/* Text Color Swatches */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300">
            Text Color ({activeLayer === 'original' ? 'Original' : 'Translation'})
          </label>
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => handleChangeCurrentStyle({ textColor: c.hex })}
                className={`w-8 h-8 rounded-full border-2 transition transform active:scale-90 flex items-center justify-center ${
                  currentStyle.textColor.toLowerCase() === c.hex.toLowerCase()
                    ? 'border-amber-400 scale-110 shadow-md shadow-amber-500/30'
                    : 'border-neutral-700 hover:scale-105'
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
            <input
              type="color"
              value={currentStyle.textColor}
              onChange={(e) => handleChangeCurrentStyle({ textColor: e.target.value })}
              className="w-8 h-8 rounded-full bg-neutral-950 border border-neutral-700 cursor-pointer p-0 overflow-hidden"
              title="Custom color"
            />
          </div>
        </div>

        {/* Position and Alignment Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Caption Vertical Position */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">
              Position ({activeLayer === 'original' ? 'Original' : 'Translation'})
            </label>
            <div className="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
              {(['top', 'center', 'bottom'] as CaptionPosition[]).map((pos) => (
                <button
                  key={pos}
                  onClick={() => handleChangeCurrentStyle({ position: pos })}
                  className={`flex-1 py-1.5 text-xs font-bold capitalize rounded transition ${
                    currentStyle.position === pos
                      ? 'bg-amber-500 text-neutral-950 shadow-sm'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {pos === 'bottom' ? 'Lower 1/3' : pos}
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-300">Alignment</label>
            <div className="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
              <button
                onClick={() => handleChangeCurrentStyle({ alignment: 'left' })}
                className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center transition ${
                  currentStyle.alignment === 'left' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                }`}
                title="Align Left"
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleChangeCurrentStyle({ alignment: 'center' })}
                className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center transition ${
                  currentStyle.alignment === 'center' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                }`}
                title="Align Center"
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleChangeCurrentStyle({ alignment: 'right' })}
                className={`flex-1 py-1.5 text-xs font-bold rounded flex items-center justify-center transition ${
                  currentStyle.alignment === 'right' ? 'bg-amber-500 text-neutral-950' : 'text-neutral-400 hover:text-white'
                }`}
                title="Align Right"
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Direction Selection */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-neutral-300">Text Direction (BiDi)</label>
          <div className="flex rounded-lg bg-neutral-950 p-1 border border-neutral-800">
            {(['auto', 'rtl', 'ltr'] as TextDirection[]).map((dir) => (
              <button
                key={dir}
                onClick={() => handleChangeCurrentStyle({ direction: dir })}
                className={`flex-1 py-1.5 text-xs font-bold uppercase rounded transition ${
                  currentStyle.direction === dir
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {dir === 'auto' ? 'Auto Detect' : dir}
              </button>
            ))}
          </div>
        </div>

        {/* Background & Outline Style Presets */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-neutral-300">Visual Preset / Backdrop</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BG_STYLES.map((bg) => (
              <button
                key={bg.id}
                onClick={() => handleChangeCurrentStyle({ bgStyle: bg.id })}
                className={`p-2.5 rounded-lg text-left text-xs transition border ${
                  currentStyle.bgStyle === bg.id
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <div className="font-semibold">{bg.label}</div>
                <div className="text-[10px] text-neutral-500 truncate mt-0.5">{bg.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* WATERMARK & BRANDING SECTION */}
      <div className="space-y-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Stamp className="w-4 h-4 text-amber-400" />
            <span>Logo & Account Watermark</span>
          </h3>
          <span className="text-[11px] text-neutral-400">Burned into exported MP4</span>
        </div>

        {/* Hidden Logo File Input */}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleLogoUpload}
          className="hidden"
        />

        {/* Watermark Type Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-300">Watermark Type</label>
          <div className="grid grid-cols-4 gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
            {[
              { id: 'none', label: 'None' },
              { id: 'text', label: 'Text' },
              { id: 'logo', label: 'Logo' },
              { id: 'both', label: 'Both' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onChangeWatermark({ type: item.id as WatermarkType })}
                className={`py-1.5 text-xs font-bold rounded transition ${
                  watermark.type === item.id
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {watermark.type !== 'none' && (
          <div className="space-y-3.5 pt-1 border-t border-neutral-800/80">
            {/* Watermark Position Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Position</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[11px] font-semibold">
                {[
                  { id: 'top-left', label: 'Top-L' },
                  { id: 'top-right', label: 'Top-R' },
                  { id: 'center', label: 'Center' },
                  { id: 'bottom-left', label: 'Btm-L' },
                  { id: 'bottom-right', label: 'Btm-R' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => onChangeWatermark({ position: pos.id as WatermarkPosition })}
                    className={`py-1.5 rounded transition ${
                      watermark.position === pos.id
                        ? 'bg-amber-500 text-neutral-950 font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-neutral-300">Opacity</label>
                <span className="font-mono text-amber-400 font-bold">
                  {Math.round((watermark.opacity ?? 0.85) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.05}
                value={watermark.opacity ?? 0.85}
                onChange={(e) => onChangeWatermark({ opacity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-neutral-950 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Text Watermark Controls */}
            {(watermark.type === 'text' || watermark.type === 'both') && (
              <div className="space-y-2.5 p-3 rounded-lg bg-neutral-950/70 border border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200">Account / Brand Text</label>
                  <span className="text-[10px] text-neutral-500">e.g. @myaccount</span>
                </div>
                <input
                  type="text"
                  value={watermark.text}
                  onChange={(e) => onChangeWatermark({ text: e.target.value })}
                  placeholder="@yourbrand"
                  className="w-full bg-neutral-900 text-neutral-100 placeholder-neutral-600 rounded-lg p-2 text-xs border border-neutral-800 focus:outline-none focus:border-amber-500"
                />

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-neutral-400">Text Size</span>
                      <span className="text-amber-400 font-mono font-bold">{watermark.textSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={48}
                      step={2}
                      value={watermark.textSize}
                      onChange={(e) => onChangeWatermark({ textSize: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-neutral-400 block mb-1">Text Color</span>
                    <div className="flex items-center gap-1.5">
                      {['#FFFFFF', '#FACC15', '#000000'].map((c) => (
                        <button
                          key={c}
                          onClick={() => onChangeWatermark({ textColor: c })}
                          className={`w-5 h-5 rounded-full border ${
                            watermark.textColor.toLowerCase() === c.toLowerCase()
                              ? 'border-amber-400 ring-1 ring-amber-400 scale-110'
                              : 'border-neutral-700'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={watermark.textColor}
                        onChange={(e) => onChangeWatermark({ textColor: e.target.value })}
                        className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-700 cursor-pointer p-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Logo Watermark Controls */}
            {(watermark.type === 'logo' || watermark.type === 'both') && (
              <div className="space-y-2.5 p-3 rounded-lg bg-neutral-950/70 border border-neutral-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-200">Logo Image (PNG, JPG, WebP)</label>
                  <span className="text-[10px] text-neutral-500">Transparent PNG supported</span>
                </div>

                {watermark.logoUrl ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-neutral-950 border border-neutral-800 p-1 flex items-center justify-center overflow-hidden">
                        <img
                          src={watermark.logoUrl}
                          alt="Logo Preview"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white truncate max-w-[150px]">
                          {watermark.logoFile?.name || 'Uploaded Logo'}
                        </div>
                        <div className="text-[10px] text-neutral-500">Aspect ratio preserved</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => logoInputRef.current?.click()}
                        className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium"
                        title="Replace logo"
                      >
                        Replace
                      </button>
                      <button
                        onClick={handleRemoveLogo}
                        className="p-1.5 rounded-md bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 text-xs"
                        title="Remove logo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="w-full py-3 px-4 border border-dashed border-neutral-700 hover:border-amber-500/60 rounded-lg bg-neutral-900/60 text-xs font-semibold text-neutral-300 flex items-center justify-center gap-2 transition hover:text-white"
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Upload Logo (e.g. Transparent PNG)</span>
                  </button>
                )}

                {/* Logo Size Slider */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-neutral-400">Logo Width</span>
                    <span className="text-amber-400 font-mono font-bold">{watermark.logoSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={36}
                    max={160}
                    step={4}
                    value={watermark.logoSize}
                    onChange={(e) => onChangeWatermark({ logoSize: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-neutral-900 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
