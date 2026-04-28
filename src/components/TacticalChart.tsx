/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, memo } from 'react';
import { GannCycle } from '../lib/gannService';

interface TacticalChartProps {
  symbol?: string;
  interval?: string;
  height?: string | number;
  indicators?: string[];
  cycles?: GannCycle[];
}

function TacticalChart({ 
  symbol = "TVC:USOIL", 
  interval = "1", 
  height = 240, 
  indicators = [
    "STD;Pivot_Points_Standard",
    "STD;Fibonacci_Retracement",
    "STD;Bollinger_Bands",
    "STD;EMA;20",
    "STD;EMA;50"
  ],
  cycles = []
}: TacticalChartProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const containerRef = container.current;
    if (!containerRef) return;
    
    const widgetId = `tv-tactical-${Math.random().toString(36).substr(2, 9)}`;
    containerRef.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.id = widgetId;
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    
    widgetContainer.appendChild(widgetDiv);
    containerRef.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    
    const scriptConfig = {
      "autosize": true,
      "symbol": symbol,
      "interval": interval,
      "timezone": "Etc/UTC",
      "theme": "dark",
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": false,
      "calendar": false,
      "support_host": "https://www.tradingview.com",
      "container_id": widgetId,
      "studies": indicators,
      "hide_top_toolbar": true,
      "hide_side_toolbar": true,
      "hide_legend": true,
      "save_image": false,
      "backgroundColor": "rgba(0, 0, 0, 1)",
      "gridColor": "rgba(255, 255, 255, 0.05)",
      "withdateranges": true,
      "range": "1D"
    };

    script.innerHTML = JSON.stringify(scriptConfig);

    const timeoutId = setTimeout(() => {
      if (widgetContainer) {
        widgetContainer.appendChild(script);
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (containerRef) {
        containerRef.innerHTML = "";
      }
    };
  }, [symbol, interval, indicators]);

  return (
    <div className="flex flex-col gap-1">
      {/* Gann Cycle Ribbon */}
      <div className="h-6 flex items-center px-2 bg-black/40 rounded border border-white/5 relative overflow-hidden">
        <div className="text-[7px] text-gray-500 font-mono absolute left-2 uppercase">Gann Cycles T-Scale</div>
        <div className="flex-1 h-full flex items-center justify-around relative ml-20">
          {cycles.map((cycle, i) => {
            const next = new Date(cycle.nextDate);
            const now = new Date();
            const diffDays = Math.max(0.1, (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            // Rough mapped position for 1D range (30 days max visibility on ribbon)
            const left = Math.min(95, (diffDays / 30) * 100);
            
            return (
              <div 
                key={i} 
                className="absolute flex flex-col items-center group cursor-help transition-all hover:scale-110"
                style={{ left: `${left}%` }}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  cycle.significance === 'High' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                  cycle.significance === 'Medium' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 
                  'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                }`} />
                {/* Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 bg-black/90 border border-white/10 p-1.5 rounded text-[8px] whitespace-nowrap z-50 pointer-events-none transition-opacity">
                  <div className="font-bold text-oil-gold">{cycle.name}</div>
                  <div className="text-white">T-{Math.round(diffDays)} Days</div>
                </div>
              </div>
            );
          })}
          {/* Subtle grid lines for the ribbon */}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map(p => (
            <div key={p} className="h-2 w-[1px] bg-white/5 absolute" style={{ left: `${p}%` }} />
          ))}
        </div>
      </div>

      <div 
        className="w-full border border-white/5 rounded-lg overflow-hidden bg-black shadow-lg" 
        style={{ height }}
        ref={container} 
      />
    </div>
  );
}

export default memo(TacticalChart);
