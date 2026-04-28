
import React from 'react';
import { ExternalLink } from 'lucide-react';

export const AstroSeekWidget: React.FC = () => {
  return (
    <div className="w-full bg-black/40 rounded-xl border border-white/5 overflow-hidden shadow-2xl group">
      <div className="px-3 py-2 border-b border-white/5 bg-white/5 flex items-center justify-between">
        <a 
          href="https://www.astro-seek.com" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase hover:text-oil-gold transition-colors flex items-center gap-1"
        >
          AstroSeek Engine
          <ExternalLink className="w-2 h-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      </div>
      <div className="relative aspect-square w-full">
        <iframe 
          src="https://horoscopes.astro-seek.com/current-planets-astrology-chart-online?embed=1" 
          className="absolute inset-0 w-full h-full border-0 grayscale brightness-75 contrast-125"
          style={{ filter: 'invert(1) hue-rotate(180deg) brightness(0.8) contrast(1.2)' }}
          title="AstroSeek Current Sky"
        />
        {/* Overlay to catch clicks and prevent deep navigation into iframe */}
        <div className="absolute inset-0 bg-transparent pointer-events-none" />
      </div>
    </div>
  );
};
