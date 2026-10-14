import React from 'react';
import { Film, Type, Palette, Clock, Download } from 'lucide-react';
import { EditorTab } from '../types/editor';

interface BottomTabsProps {
  activeTab: EditorTab;
  onChangeTab: (tab: EditorTab) => void;
  clipCount: number;
  captionCount: number;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({
  activeTab,
  onChangeTab,
  clipCount,
  captionCount,
}) => {
  const tabs: { id: EditorTab; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'clips',
      label: 'Clips',
      icon: <Film className="w-4 h-4" />,
      badge: clipCount > 0 ? clipCount : undefined,
    },
    {
      id: 'captions',
      label: 'Captions',
      icon: <Type className="w-4 h-4" />,
      badge: captionCount > 0 ? captionCount : undefined,
    },
    {
      id: 'style',
      label: 'Style',
      icon: <Palette className="w-4 h-4" />,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: <Clock className="w-4 h-4" />,
      badge: '15s',
    },
    {
      id: 'export',
      label: 'Export',
      icon: <Download className="w-4 h-4" />,
    },
  ];

  return (
    <nav className="sticky bottom-0 z-30 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 px-2 py-1.5 shadow-2xl">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition relative ${
                isActive
                  ? 'bg-amber-500/15 text-amber-400 font-bold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 py-0.2 min-w-[14px] text-[8px] font-bold rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center leading-none">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
