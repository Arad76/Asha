/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, memo } from 'react';
import { io } from "socket.io-client";
import { motion, AnimatePresence } from 'motion/react';
import { FuturesContract } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

function LivePriceTape() {
  const [futures, setFutures] = useState<FuturesContract[]>([]);

  useEffect(() => {
    const socket = io(window.location.origin);
    
    socket.on("market-update", (data: { futures: FuturesContract[] }) => {
      if (data.futures) {
        setFutures(data.futures);
      }
    });

    // Initial fetch
    fetch('/api/quote')
      .then(res => {
        if (!res.ok) throw new Error('API down or CORS issue');
        return res.json();
      })
      .then(data => {
        if (data.futures) setFutures(data.futures);
      })
      .catch(err => {
        console.warn("Initial tape fetch pending socket connection. Reason:", err.message);
      });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="w-full bg-black/90 border-b border-white/10 overflow-hidden h-10 flex items-center">
      <div className="flex whitespace-nowrap animate-infinite-scroll">
        {[...futures, ...futures].map((item, idx) => (
          <div key={`${item.symbol}-${idx}`} className="flex items-center space-x-4 px-8 border-r border-white/5 last:border-0 h-full">
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{item.name}</span>
            <span className="text-xs font-mono font-bold text-white">${item.price.toFixed(2)}</span>
            <div className={`flex items-center text-[10px] font-bold ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {item.change >= 0 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
              {Math.abs(item.changePercent).toFixed(2)}%
            </div>
          </div>
        ))}
        {futures.length === 0 && (
          <div className="px-8 text-[10px] text-gray-600 font-mono flex items-center italic">
            <div className="w-2 h-2 rounded-full bg-oil-gold animate-pulse mr-2" />
            SYNCHRONIZING WITH QUANTUM EXCHANGE NODES...
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(LivePriceTape);
