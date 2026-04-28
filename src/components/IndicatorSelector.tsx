/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layers, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const COMMON_INDICATORS = [
  { id: 'STD;MACD', label: 'MACD' },
  { id: 'STD;Stochastic_RSI', label: 'Stoch RSI' },
  { id: 'STD;EMA;20', label: 'EMA 20' },
  { id: 'STD;EMA;50', label: 'EMA 50' },
  { id: 'STD;EMA;200', label: 'EMA 200' },
  { id: 'STD;Bollinger_Bands', label: 'Bollinger Bands' },
  { id: 'STD;RSI', label: 'RSI' },
  { id: 'STD;Pivot_Points_Standard', label: 'Pivot Points' },
  { id: 'STD;Fibonacci_Retracement', label: 'Fibonacci Retracement' },
  { id: 'STD;Gann_Box', label: 'Gann Box' },
  { id: 'STD;Gann_Fan', label: 'Gann Fan' },
];

interface IndicatorSelectorProps {
  selectedIndicators: string[];
  onToggle: (id: string) => void;
}

export function IndicatorSelector({ selectedIndicators, onToggle }: IndicatorSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-all text-gray-400 hover:text-white"
        title="Technical Indicators"
      >
        <Layers size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Studies</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 bottom-full mb-2 w-48 bg-oil-dim border border-white/10 rounded-lg shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-2 border-b border-white/5 bg-black/20">
                <span className="text-[9px] font-black text-oil-gold uppercase tracking-[0.2em]">Overlay Matrix</span>
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {COMMON_INDICATORS.map((indicator) => {
                  const isSelected = selectedIndicators.includes(indicator.id);
                  return (
                    <button
                      key={indicator.id}
                      onClick={() => onToggle(indicator.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-left hover:bg-white/5 transition-colors text-gray-300 hover:text-white group"
                    >
                      <span className={isSelected ? 'text-oil-gold font-bold' : ''}>{indicator.label}</span>
                      {isSelected && <Check size={12} className="text-oil-gold" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
