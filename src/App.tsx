/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import TradingViewWidget from './components/TradingViewWidget';
import LivePriceTape from './components/LivePriceTape';
import SingleQuoteWidget from './components/SingleQuoteWidget';
import { AstroPanel } from './components/AstroPanel';
import { AstroWheel } from './components/AstroWheel';
import { AstroSeekWidget } from './components/AstroSeekWidget';
import { PredictionTerminal } from './components/PredictionTerminal';
import { HistoricalLog } from './components/HistoricalLog';
import { IndicatorSelector } from './components/IndicatorSelector';
import { VolatilityHeatmap } from './components/VolatilityHeatmap';
import { getPLANETARY_DATA } from './lib/astrology';
import { getDayNumerology } from './lib/numerology';
import { AstroData, NumerologyData } from './types';
import { Activity, Globe, Compass, BarChart3, Database } from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [astroData, setAstroData] = useState<AstroData>({
    timestamp: new Date().toISOString(),
    planets: getPLANETARY_DATA(new Date())
  });
  const [numerology, setNumerology] = useState<NumerologyData>(getDayNumerology(new Date()));
  const [chartInterval, setChartInterval] = useState("1");
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([
    "STD;Pivot_Points_Standard",
    "STD;Fibonacci_Retracement",
    "STD;Bollinger_Bands",
    "STD;RSI"
  ]);

  const toggleIndicator = (id: string) => {
    setSelectedIndicators(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      setAstroData({
        timestamp: now.toISOString(),
        planets: getPLANETARY_DATA(now)
      });
      setNumerology(getDayNumerology(now));
    }, 1000); // Changed from 60000 to 1000 for per-second tick

    return () => clearInterval(timer);
  }, []);

  const intervals = [
    { label: "1M", value: "1", description: "Minute Sync" },
    { label: "1H", value: "60", description: "Hourly Orbit" },
    { label: "1D", value: "D", description: "Daily Cycle" },
    { label: "1W", value: "W", description: "Weekly Portal" },
    { label: "1M", value: "M", description: "Monthly Eon" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-oil-black text-gray-200 relative overflow-hidden">
      {/* HUD Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.05),transparent_70%)]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Dynamic Header */}
      <header className="h-14 border-b border-oil-border bg-oil-dim flex items-center justify-between px-6 shrink-0 relative z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-oil-gold rounded-full flex items-center justify-center text-black font-display font-black text-xl italic shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              A
            </div>
            <h1 className="font-display text-lg font-bold tracking-tight text-white hidden sm:block">
              ASTROQUANT <span className="text-oil-gold italic font-extrabold">PROPHET</span>
            </h1>
          </div>
          
          <div className="h-4 w-[1px] bg-oil-border mx-2" />
          
          <div className="flex items-center gap-6 text-[10px] uppercase font-mono tracking-widest text-gray-400">
            <div className="flex items-center gap-1.5">
              <Globe size={12} className="text-oil-amber" />
              <span>SKY SYNC: <span className="text-white">ACTIVE</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart3 size={12} className="text-oil-amber" />
              <span>ASSET: <span className="text-white">WTI CRUDE</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
           <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 font-mono tracking-tighter">COSMIC TIME (UTC)</span>
              <span className="text-sm font-mono text-white tabular-nums">
                {currentTime.toUTCString().split(' ')[4]}
              </span>
           </div>
           
           <div className="h-8 w-[1px] bg-oil-border" />
           
           <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1 rounded">
              <div className="w-2 h-2 rounded-full bg-oil-gold animate-pulse shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
              <div className="flex flex-col">
                <span className="text-[9px] text-gray-500 font-bold uppercase leading-none">Day Vibration</span>
                <span className="text-xs font-mono font-bold text-oil-gold">{numerology.dayNumber} - {numerology.vibration}</span>
              </div>
           </div>
        </div>
      </header>

      {/* Live Ticker Ribbon */}
      <LivePriceTape />

      {/* Top Chart Section */}
      <section className="px-4 py-2 border-b border-oil-border bg-oil-dim/30 hidden md:block relative z-10 shrink-0">
          <div className="grid grid-cols-3 gap-3 h-[180px]">
             <div className="relative group">
                <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold text-oil-gold border border-oil-gold/20 backdrop-blur-sm">WTI CRUDE</div>
                <SingleQuoteWidget symbol="TVC:USOIL" />
             </div>
             <div className="relative group">
                <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold text-blue-400 border border-blue-400/20 backdrop-blur-sm">BITCOIN</div>
                <SingleQuoteWidget symbol="BINANCE:BTCUSDT" />
             </div>
             <div className="relative group">
                <div className="absolute top-2 left-2 z-10 bg-black/60 px-2 py-0.5 rounded text-[8px] font-bold text-yellow-500 border border-yellow-500/20 backdrop-blur-sm">GOLD</div>
                <SingleQuoteWidget symbol="TVC:GOLD" />
             </div>
          </div>
      </section>

      {/* Workspace */}
      <main className="flex-1 flex flex-col md:flex-row gap-0 overflow-hidden">
        
        {/* Left Sidebar: Astro Matrix */}
        <aside className="w-full md:w-80 shrink-0 border-r border-oil-border bg-oil-black overflow-hidden hidden lg:flex flex-col">
          <div className="p-3 border-b border-oil-border flex items-center justify-between text-gray-400">
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
              <Compass size={12} />
              Celestial Navigation
            </div>
            <Database size={12} />
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0 p-4 bg-oil-gold/5 border-b border-white/5 space-y-4">
              <div className="text-[10px] uppercase font-black text-oil-gold tracking-[0.2em] flex items-center gap-2">
                <Globe size={12} className="animate-pulse" />
                Celestial Matrix
              </div>
              <AstroWheel astro={astroData} />
              <AstroSeekWidget />
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <AstroPanel planets={astroData.planets} />
              </div>
              
              <div className="h-48 shrink-0 bg-oil-dim/50 border-t border-oil-border overflow-hidden">
                <HistoricalLog />
              </div>
            </div>
          </div>
        </aside>

        {/* Center: Live Chart */}
        <section className="flex-1 flex flex-col p-4 bg-[#0a0a0a]">
          <div className="flex items-center justify-between mb-3">
             <div className="flex items-center gap-2">
                <Activity size={14} className="text-oil-amber" />
                <span className="text-xs font-mono uppercase text-gray-400">TradingView Real-Time Engine</span>
             </div>
             <div className="flex gap-2">
                {intervals.map((int) => (
                  <button
                    key={int.value}
                    onClick={() => setChartInterval(int.value)}
                    className={`px-3 py-0.5 border rounded text-[10px] font-mono transition-all duration-200 ${
                      chartInterval === int.value 
                        ? 'border-oil-gold text-oil-gold bg-oil-gold/10' 
                        : 'border-oil-border text-gray-500 hover:border-gray-400'
                    }`}
                    title={int.description}
                  >
                    {int.label}
                  </button>
                ))}
                <IndicatorSelector 
                  selectedIndicators={selectedIndicators} 
                  onToggle={toggleIndicator} 
                />
                <div className="px-2 py-0.5 border border-oil-gold/30 rounded text-[10px] font-mono text-oil-gold bg-oil-gold/5 font-bold italic">LIVE</div>
             </div>
          </div>
          
          <div className="flex-1 min-h-0 relative">
            <TradingViewWidget 
              interval={chartInterval} 
              indicators={selectedIndicators}
            />
          </div>
          
          <div className="h-[120px] shrink-0 mt-3">
            <VolatilityHeatmap />
          </div>
        </section>

        {/* Right Sidebar: Prediction Engine */}
        <aside className="w-full md:w-96 shrink-0 border-l border-oil-border bg-oil-dim flex flex-col">
          <div className="flex-1 p-4 overflow-hidden">
             <PredictionTerminal astro={astroData} numerology={numerology} />
          </div>
          
          {/* Numerology Depth */}
          <div className="p-4 border-t border-oil-border bg-oil-black/50">
             <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 flex items-center gap-2">
               <span className="w-1 h-1 bg-oil-amber rounded-full" />
               Current Vibration Meanings
             </div>
             <p className="text-[11px] text-gray-400 italic leading-relaxed">
               "{numerology.meaning}"
             </p>
             <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="flex flex-col border-l border-oil-gold/50 pl-2">
                  <span className="text-[9px] text-gray-500 uppercase">Oil Sign</span>
                  <span className="text-xs font-medium text-white truncate">Scorpio (8)</span>
                </div>
                <div className="flex flex-col border-l border-oil-gold/50 pl-2">
                  <span className="text-[9px] text-gray-500 uppercase">Liquid Sign</span>
                  <span className="text-xs font-medium text-white truncate">Pisces (12)</span>
                </div>
                <div className="flex flex-col border-l border-oil-gold/50 pl-2">
                  <span className="text-[9px] text-gray-500 uppercase">Energy</span>
                  <span className="text-xs font-medium text-white truncate">Mars (0)</span>
                </div>
             </div>
          </div>
        </aside>
      </main>

      {/* Mobile Overlays - simplified for this build */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button className="w-12 h-12 bg-oil-gold rounded-full flex items-center justify-center text-black shadow-xl">
           <Compass size={24} />
        </button>
      </div>
    </div>
  );
}
