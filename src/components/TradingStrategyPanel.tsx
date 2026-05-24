import React from 'react';
import { Target, AlertTriangle, ShieldCheck, TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';
import { calculatePositionSize } from '../lib/tradingFramework';

interface TradeSetup {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: 'Scalp' | 'Intraday' | 'Swing';
  logic: string;
}

interface StrategyInfo {
  leverage: string;
  entry: string;
  target: string;
  stopLoss: string;
  confidence?: number;
}

interface Props {
  strategy?: StrategyInfo;
  tradeSetups?: TradeSetup[];
  direction?: "UP" | "DOWN" | "NEUTRAL";
}

export const TradingStrategyPanel: React.FC<Props> = ({ strategy, tradeSetups, direction }) => {
  if (!strategy && (!tradeSetups || tradeSetups.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 border border-white/5 rounded-lg bg-black/40">
        <Target className="text-gray-600 mb-2" size={24} />
        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Awaiting Strategy...</span>
      </div>
    );
  }

  const primarySetup = tradeSetups && tradeSetups.length > 0 ? tradeSetups[0] : null;
  const isUp = direction === "UP";
  const isDown = direction === "DOWN";

  const winProbability = Math.min(strategy?.confidence || Math.random() * 0.3 + 0.5, 0.9);
  const leverageNum = parseInt(strategy?.leverage?.replace(/\D/g, '') || "10", 10);
  
  // Calculate position sizing for each setup
  const getPositioning = (setup: TradeSetup) => {
    const risk = Math.abs(setup.entry - setup.stopLoss);
    const reward = Math.abs(setup.entry - setup.takeProfit);
    const riskReward = reward / risk || 1;
    return calculatePositionSize(10000, winProbability, riskReward, leverageNum, 0.05); // $10,000 mock portfolio
  };

  return (
    <div className="w-full bg-black/60 rounded-xl border border-white/5 shadow-2xl flex flex-col overflow-hidden relative">
      <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
        {isUp ? <TrendingUp size={64} className="text-green-500" /> : isDown ? <TrendingDown size={64} className="text-red-500" /> : <Zap size={64} className="text-gray-500" />}
      </div>
      
      <div className="p-3 border-b border-white/5 bg-oil-dim/50 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-oil-gold" />
          <span className="text-[9px] font-black text-gray-300 tracking-[0.2em] uppercase">Tactical Strategy</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 border border-white/10 rounded">
          <span className="text-[8px] text-gray-400 font-mono">LEV:</span>
          <span className="text-[10px] font-bold text-white">{strategy?.leverage || "N/A"}</span>
        </div>
      </div>

      <div className="p-4 flex-1 space-y-4 z-10 font-mono text-xs overflow-y-auto">
        {/* Main Signals */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-green-500/10 border border-green-500/20 p-2 rounded">
            <span className="text-[8px] text-green-500/70 font-bold uppercase block mb-1">Take Profit</span>
            <span className="text-lg font-black text-green-400">${primarySetup?.takeProfit.toFixed(2) || strategy?.target}</span>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-blue-500/30" />
            <span className="text-[8px] text-blue-500/70 font-bold uppercase block mb-1">Entry Zone</span>
            <span className="text-lg font-black text-blue-400">${primarySetup?.entry.toFixed(2) || strategy?.entry}</span>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 p-2 rounded">
            <span className="text-[8px] text-red-500/70 font-bold uppercase block mb-1">Stop Loss</span>
            <span className="text-lg font-black text-red-400">${primarySetup?.stopLoss.toFixed(2) || strategy?.stopLoss}</span>
          </div>
        </div>

        {/* Trade Setups */}
        {tradeSetups && tradeSetups.length > 0 && (
          <div className="space-y-2 mt-4">
            <div className="text-[8px] text-gray-500 uppercase tracking-widest font-bold flex justify-between">
              <span>Dynamic Setups</span>
              <span>Port: $10k</span>
            </div>
            <div className="space-y-2">
              {tradeSetups.map((setup, i) => {
                const pos = getPositioning(setup);
                return (
                  <div key={i} className="flex flex-col p-2 bg-white/[0.02] border border-white/5 rounded gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white uppercase bg-black/40 px-1.5 py-0.5 border border-white/10 rounded">{setup.timeframe}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-oil-gold uppercase font-mono px-1 border border-oil-gold/30 bg-oil-gold/10 rounded">Max Loss: ${(pos.actualRisk * 10000).toFixed(0)}</span>
                      </div>
                    </div>
                    <div className="text-[9px] text-gray-400 leading-relaxed italic border-l-2 border-white/10 pl-2">
                      "{setup.logic}"
                    </div>
                    <div className="flex justify-between text-[10px] items-end font-mono bg-black/20 p-1.5 rounded border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[7px] text-gray-600">IN</span>
                        <span className="text-white">${setup.entry.toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col text-center border-x border-white/5 px-2">
                         <span className="text-[7px] text-gray-600">POS. SIZE</span>
                         <span className="text-blue-400 font-bold">${pos.positionSizeAsset.toFixed(0)}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[7px] text-gray-600">OUT</span>
                        <span className="text-gray-300 font-bold">${setup.takeProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

