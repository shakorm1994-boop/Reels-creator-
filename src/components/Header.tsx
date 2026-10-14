import React from 'react';
import { Film } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-30 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-2.5 sm:py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        {/* Logo Icon */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 shrink-0">
          <Film className="w-5 h-5 stroke-[2.5]" />
        </div>

        {/* Brand Title & Subtitle */}
        <div className="min-w-0 flex flex-col justify-center">
          <h1 className="font-extrabold text-base tracking-tight text-white leading-tight">
            REEL STUDIO
          </h1>
          <p className="text-[11px] text-neutral-400 leading-normal truncate">
            Mobile Reel Editor & Multilingual Captions
          </p>
        </div>
      </div>
    </header>
  );
};
