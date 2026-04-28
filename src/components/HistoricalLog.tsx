/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { History, Milestone, CalendarDays } from 'lucide-react';

export function HistoricalLog() {
  const records = [
    { date: "2026-03-15", price: "$92.40", num: 6, event: "BTC Pivot Inversion Sync", trend: "BULLISH" },
    { date: "2024-09-12", price: "$68.97", num: 1, event: "Mercury Direct Pivot", trend: "BULLISH" },
    { date: "2024-04-20", price: "$83.14", num: 9, event: "Jupiter-Uranus Conjunction", trend: "VOLATILE" },
    { date: "2024-02-14", price: "$76.20", num: 4, event: "XAU Direct Correlation Peak", trend: "DIRECT" },
    { date: "2023-12-13", price: "$69.47", num: 5, event: "Mars-Neptune Square", trend: "BEARISH" },
    { date: "2022-03-08", price: "$123.70", num: 8, event: "Saturn-Sun Opposition", trend: "EXTREME" }
  ];

  return (
    <div className="p-4 bg-oil-black text-xs font-mono">
      <div className="flex items-center gap-2 text-oil-gold mb-3 uppercase tracking-tighter">
        <History size={14} />
        Historical Matrix Peaks
      </div>
      
      <div className="space-y-3">
        {records.map((r, i) => (
          <div key={i} className="flex flex-col border-l border-oil-border pl-3 group hover:border-oil-amber transition-colors">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5 text-gray-500">
                <CalendarDays size={10} />
                {r.date}
              </div>
              <div className={`text-[9px] px-1.5 py-0.5 rounded ${r.trend === 'BULLISH' ? 'bg-green-500/10 text-green-500' : r.trend === 'BEARISH' ? 'bg-red-500/10 text-red-500' : 'bg-oil-gold/10 text-oil-gold'}`}>
                {r.trend}
              </div>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-white text-sm font-bold group-hover:text-oil-amber transition-colors">{r.price}</span>
              <span className="text-gray-600 text-[10px]">VIBE: {r.num}</span>
            </div>
            <div className="text-[9px] text-gray-500 uppercase mt-1 italic italic flex items-center gap-1">
              <Milestone size={10} />
              {r.event}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-2 bg-white/5 rounded text-[9px] text-gray-500 leading-tight">
        * Historical signatures synchronized with lunar regression cycles.
      </div>
    </div>
  );
}
