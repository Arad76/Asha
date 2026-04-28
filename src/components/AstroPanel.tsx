/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PlanetaryPosition } from '../types';
import { Sparkles, Moon, Sun, Zap, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  planets: PlanetaryPosition[];
}

export function AstroPanel({ planets }: Props) {
  return (
    <div className="bg-transparent h-full">
      <div className="grid grid-cols-1 divide-y divide-white/5">
        {planets.map((p) => (
          <motion.div 
            key={p.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between p-3 group hover:bg-white/[0.02] transition-colors cursor-default"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-white/5 border border-white/5 flex items-center justify-center text-oil-gold group-hover:border-oil-gold/30 transition-all">
                {p.name === 'Sun' ? <Sun size={14} /> : p.name === 'Moon' ? <Moon size={14} /> : <Zap size={14} />}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] uppercase text-gray-500 font-black tracking-tighter">{p.name}</span>
                  {p.retrograde && (
                    <span className="text-[7px] text-red-500 font-black border border-red-500/20 px-1 rounded animate-pulse">R</span>
                  )}
                </div>
                <div className="text-xs font-mono font-bold text-white flex items-center gap-1.5 mt-0.5">
                  {p.degree}°{p.minute}' <span className="text-[10px] text-oil-gold font-normal">{p.sign}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[7px] text-gray-600 uppercase font-mono leading-none">Matrix</div>
                <div className="text-[11px] font-black text-oil-gold leading-none mt-1 shadow-oil-gold">
                  {p.numerology}
                </div>
              </div>
              <div className="w-1 h-1 bg-oil-gold/20 rounded-full group-hover:bg-oil-gold animate-pulse transition-colors" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
