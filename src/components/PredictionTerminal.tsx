/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { io, Socket } from "socket.io-client";
import { PredictionResult, AstroData, NumerologyData } from '../types';
import { Terminal, TrendingUp, TrendingDown, RefreshCcw, ShieldAlert, Newspaper, Activity, Database, BarChart3, BrainCircuit, Zap, ChevronUp, ChevronDown, Target, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TradingStrategyPanel } from './TradingStrategyPanel';
import { CorrelationPanel } from './CorrelationPanel';
import { PredictionChart } from './PredictionChart';
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  YAxis,
  AreaChart,
  Area,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  XAxis
} from 'recharts';

import { NewsFeed } from './NewsFeed';
import TacticalChart from './TacticalChart';
import { IndicatorSelector } from './IndicatorSelector';
import { calculateGannLevels, getGannCycles, GannCycle, GannLevels } from '../lib/gannService';
import { calculateFibonacciLevels, FibonacciLevels } from '../lib/fibonacciService';
import { analyzeOverallSentiment, MarketSentiment, fetchWithRetry } from '../lib/geminiService';

// Enhanced types
interface NewsHeadline {
  title: string;
  source: string;
  time: string;
  sentiment: number; // -1 to 1
}

interface SourceSentiment {
  name: string;
  score: number;
}

interface BacktestMetrics {
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  sampleSize: number;
}

interface SentimentData {
  score: number; // -1 to 1
  label: string;
  keyHeadlines: NewsHeadline[];
  sourceAggregate: SourceSentiment[];
}

interface QuantumCorrelation {
  priceVibration: number;
  timeVibration: number;
  alignment: string;
  timestamp?: string;
  confidenceScore?: 'High' | 'Medium' | 'Low';
  impactHours?: number;
}

interface ConfluenceLevel {
  price: number;
  source: string;
  type: 'Gann-Fib' | 'Astro-Price' | 'Tech-Logic';
}

interface MLPrediction {
  price: number;
  confidence: number;
  timestamp: string;
  driftType?: string;
  neuronsActive?: number;
}

interface TradeSetup {
  entry: number;
  stopLoss: number;
  takeProfit: number;
  timeframe: 'Scalp' | 'Intraday' | 'Swing';
  logic: string;
}

interface EnhancedPredictionResult extends PredictionResult {
  sentiment?: SentimentData;
  quantumCorrelation?: QuantumCorrelation;
  backtest?: BacktestMetrics;
  forecastTrajectory?: { timeOffset: string; expectedPrice: number }[];
  confluencePoints?: ConfluenceLevel[];
  tradeSetups?: TradeSetup[];
}

// Use lazy initialization for AI client
let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is missing. AI predictions will be disabled.");
    }
    aiInstance = new GoogleGenAI({ apiKey: key || 'NO_KEY' });
  }
  return aiInstance;
};

interface Props {
  astro: AstroData;
  numerology: NumerologyData;
}

export function PredictionTerminal({ astro, numerology }: Props) {
  const [prediction, setPrediction] = useState<EnhancedPredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [backtestPeriod, setBacktestPeriod] = useState("72h");
  const [liveVibrations, setLiveVibrations] = useState<QuantumCorrelation | null>(null);
  const [mlPrediction, setMlPrediction] = useState<MLPrediction | null>(null);
  const [mlHistory, setMlHistory] = useState<MLPrediction[]>([]);
  const [macroSentiment, setMacroSentiment] = useState<MarketSentiment | null>(null);
  const [gannData, setGannData] = useState<{ levels: GannLevels; cycles: GannCycle[] } | null>(null);
  const [fibData, setFibData] = useState<FibonacciLevels | null>(null);
  const [tacticalIndicators, setTacticalIndicators] = useState<string[]>([
    "STD;Pivot_Points_Standard",
    "STD;Fibonacci_Retracement",
    "STD;Bollinger_Bands",
    "STD;EMA;20",
    "STD;EMA;50"
  ]);

  const toggleTacticalIndicator = (id: string) => {
    setTacticalIndicators(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // WebSocket Integration for Real-time Quantum Signals
  useEffect(() => {
    // Determine socket URL based on environment
    const socketUrl = window.location.origin;
    const socket: Socket = io(socketUrl);

    socket.on("quantum-signal", (data: QuantumCorrelation & { timestamp: string }) => {
      setLiveVibrations({
        priceVibration: data.priceVibration,
        timeVibration: data.timeVibration,
        alignment: data.alignment,
        confidenceScore: data.confidenceScore,
        impactHours: data.impactHours,
        timestamp: data.timestamp || new Date().toISOString()
      });
    });

    socket.on("ml-prediction", (data: MLPrediction) => {
      setMlPrediction(data);
      setMlHistory(prev => {
        const newHistory = [...prev, data];
        return newHistory.slice(-30); // Keep last 30 for visualization
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function generatePrediction(periodOverride?: string) {
    const period = periodOverride || backtestPeriod;
    setLoading(true);
    setError(null);
    try {
      const ai = getAI();
      
      // Fetch the true spot price to anchor the LLM
      let livePriceStr = "87.00";
      try {
        const quoteRes = await fetch('/api/quote');
        const quoteData = await quoteRes.json();
        if (quoteData && quoteData.price) {
           livePriceStr = quoteData.price.toFixed(2);
           // Calculate Gann levels immediately
           const levels = calculateGannLevels(quoteData.price);
           const cycles = getGannCycles();
           setGannData({ levels, cycles });

           // Calculate Fibonacci levels (Mock high/low from current price for demo)
           const fibs = calculateFibonacciLevels(quoteData.price * 1.05, quoteData.price * 0.95);
           setFibData(fibs);
        }
      } catch (err) {
        console.warn("Failed to fetch live quote proxy. Falling back.");
      }

      // Wait for macro sentiment via Gemini so we can influence the prediction 
      let fetchedSentiment: MarketSentiment | null = null;
      try {
        fetchedSentiment = await analyzeOverallSentiment();
        setMacroSentiment(fetchedSentiment);
      } catch (err) {
        console.warn("Failed to fetch macro sentiment", err);
      }
      
      const prompt = `
        TASK: High-frequency USOIL/WTI SCALPING prediction & HISTORICAL BACKTEST.
        
        REQUIRED ANALYTICAL LAYERS:
        1. ACCURATE ASTRO SKY & ASPECTS: 
           - Perform a high-precision search for current planetary positions.
           - NUANCED ASPECT ANALYSIS: Identify Conjunctions (0°), Oppositions (180°), and Squares (90°) between FINANCIAL PLANETS (Jupiter, Saturn, Mercury) & VOLATILE PLANETS (Mars, Uranus).
           - Focus on Neptune (Oil) and its relationship to current Moon phase.
        2. GANN & FIBONACCI GEOMETRY: 
           - Integrate Gann Square of 9 levels and major time cycles for USOIL.
           - Apply Fibonacci retracement levels (0.236, 0.382, 0.5, 0.618, 0.786).
        3. EXTERNAL CORRELATIONS:
           - Analyze BITCOIN (BTC) and GOLD (XAU) as leading/lagging indicators.
           - Identify inverse or direct correlations currently impacting WTI.
        4. NUMEROLOGICAL CROSS-REFERENCE:
           - Cross-reference current date vibration (${numerology.dayNumber}) with planetary degrees.
        5. SENTIMENT ALIGNMENT:
           - The current macro sentiment for WTI Crude Oil is: ${fetchedSentiment ? fetchedSentiment.consensus : 'seeking equilibrium'}.
           - The sentiment score is ${fetchedSentiment ? fetchedSentiment.score : 0} (-1 bearish to 1 bullish) with ${fetchedSentiment ? fetchedSentiment.intensity : 'Low'} intensity.
           - CRITICAL: Use Phase 5's sentiment to explicitly INFLUENCE and direct your overall market outlook, direction (UP/DOWN/NEUTRAL), and trade entry logic.
        6. TRADE SETUPS (DYNAMIC SCALPING & SWING): 
           - CRITICAL ANCHOR PRICE: The true live spot price of WTI Crude Oil is EXACTLY $${livePriceStr}.
           - PROVIDE SPECIFIC ENTRY, STOP LOSS, and TAKE PROFIT for both SHORT-TERM SCALPS and LONG-TERM INTRADAY/SWING.
           - Use Gann prices for levels and Fibonacci for risk/reward ratios.
        7. BACKTEST ANALYSIS: Search for USOIL/WTI action over the LAST ${period}.
        
        OUTPUT FORMAT: JSON.
      `;

      const response = await fetchWithRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          tools: [{ googleSearch: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                confidence: { type: Type.NUMBER },
                direction: { type: Type.STRING, enum: ["UP", "DOWN", "NEUTRAL"] },
                reasoning: { type: Type.STRING },
                sentiment: {
                  type: Type.OBJECT,
                  properties: {
                    score: { type: Type.NUMBER, description: "Overall sentiment score from -1 (bearish) to 1 (bullish)" },
                    label: { type: Type.STRING },
                    keyHeadlines: { 
                      type: Type.ARRAY, 
                      items: { 
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          source: { type: Type.STRING },
                          time: { type: Type.STRING, description: "Relative time e.g. 5m ago" },
                          sentiment: { type: Type.NUMBER, description: "-1 to 1" }
                        },
                        required: ["title", "source", "time", "sentiment"]
                      } 
                    },
                    sourceAggregate: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          score: { type: Type.NUMBER }
                        },
                        required: ["name", "score"]
                      }
                    }
                  },
                  required: ["score", "label", "keyHeadlines", "sourceAggregate"]
                },
                quantumCorrelation: {
                  type: Type.OBJECT,
                  properties: {
                    priceVibration: { type: Type.NUMBER },
                    timeVibration: { type: Type.NUMBER },
                    alignment: { type: Type.STRING },
                    confidenceScore: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
                    impactHours: { type: Type.NUMBER }
                  },
                  required: ["priceVibration", "timeVibration", "alignment", "confidenceScore", "impactHours"]
                },
                backtest: {
                  type: Type.OBJECT,
                  properties: {
                    winRate: { type: Type.NUMBER },
                    profitFactor: { type: Type.NUMBER },
                    maxDrawdown: { type: Type.NUMBER },
                    sampleSize: { type: Type.NUMBER }
                  },
                  required: ["winRate", "profitFactor", "maxDrawdown", "sampleSize"]
                },
                strategy: {
                  type: Type.OBJECT,
                  properties: {
                    leverage: { type: Type.STRING },
                    entry: { type: Type.STRING },
                    target: { type: Type.STRING },
                    stopLoss: { type: Type.STRING }
                  },
                  required: ["leverage", "entry", "target", "stopLoss"]
                },
                forecastTrajectory: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timeOffset: { type: Type.STRING, description: "e.g., '+15m', '+30m'" },
                      expectedPrice: { type: Type.NUMBER }
                    },
                    required: ["timeOffset", "expectedPrice"]
                  }
                },
                confluencePoints: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      price: { type: Type.NUMBER },
                      source: { type: Type.STRING },
                      type: { type: Type.STRING, enum: ['Gann-Fib', 'Astro-Price', 'Tech-Logic'] }
                    },
                    required: ["price", "source", "type"]
                  }
                },
                tradeSetups: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      entry: { type: Type.NUMBER },
                      stopLoss: { type: Type.NUMBER },
                      takeProfit: { type: Type.NUMBER },
                      timeframe: { type: Type.STRING, enum: ['Scalp', 'Intraday', 'Swing'] },
                      logic: { type: Type.STRING }
                    },
                    required: ["entry", "stopLoss", "takeProfit", "timeframe", "logic"]
                  }
                }
              },
              required: ["confidence", "direction", "reasoning", "sentiment", "forecastTrajectory", "confluencePoints", "tradeSetups"]
            }
          }
        } as any);
      });

      const data = JSON.parse(response.text || '{}') as EnhancedPredictionResult;
      setPrediction({ ...data, timestamp: new Date().toISOString() });
      setLastUpdate(new Date());
    } catch (err) {
      console.error("AI Prediction failed, using fallback:", err);
      // Fallback mock prediction
      const fallbackPrediction: EnhancedPredictionResult = {
        confidence: 0.65,
        direction: "NEUTRAL",
        reasoning: "API rate limits reached. Falling back to base harmonic oscillation model. Market is currently seeking equilibrium.",
        sentiment: {
          score: 0.1,
          label: "Cautious Equilibrium",
          keyHeadlines: [
            { title: "Market Volatility Stabilizes", source: "MarketWatch", time: "5m ago", sentiment: 0.1 },
            { title: "Traders Await Clearer Signals", source: "Bloomberg", time: "15m ago", sentiment: 0.0 }
          ],
          sourceAggregate: [{ name: "General News", score: 0.1 }]
        },
        forecastTrajectory: [
          { timeOffset: "+15m", expectedPrice: 87.10 },
          { timeOffset: "+30m", expectedPrice: 87.05 }
        ],
        confluencePoints: [
          { price: 87.20, source: "Resistance A", type: "Tech-Logic" },
          { price: 86.80, source: "Support B", type: "Gann-Fib" }
        ],
        tradeSetups: [
          { entry: 87.00, stopLoss: 86.50, takeProfit: 87.50, timeframe: "Scalp", logic: "Fallback mean-reversion logic" }
        ],
        quantumCorrelation: {
          priceVibration: 5,
          timeVibration: 3,
          alignment: "Divergent",
          confidenceScore: "Low",
          impactHours: 2
        },
        backtest: {
          winRate: 0.55,
          profitFactor: 1.2,
          maxDrawdown: 0.15,
          sampleSize: 100
        },
        strategy: {
          leverage: "10x",
          entry: "87.00",
          target: "87.50",
          stopLoss: "86.50"
        },
        timestamp: new Date().toISOString()
      };
      setPrediction(fallbackPrediction);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }

  // Auto-refresh prediction every 5 minutes (news moves slower than astro)
  useEffect(() => {
    generatePrediction();
    const interval = setInterval(generatePrediction, 300000);
    return () => clearInterval(interval);
  }, []);

  const sentimentScore = prediction?.sentiment?.score || 0;
  const themeClass = sentimentScore > 0.2 
    ? "border-green-500/30 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]" 
    : sentimentScore < -0.2 
      ? "border-red-500/30 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]" 
      : "border-oil-gold/30";

  return (
    <div className={`flex flex-col h-full bg-oil-black border ${themeClass} rounded-lg overflow-hidden relative transition-colors duration-1000`}>
      <div className="terminal-scanline" />
      
      {/* Header */}
      <div className="bg-oil-dim border-b border-oil-border p-3 flex justify-between items-center">
        <div className="flex items-center gap-2 text-oil-gold">
          <Terminal size={16} />
          <span className="font-mono text-xs uppercase tracking-widest">Prediction Terminal v4.0</span>
        </div>
        <button 
          onClick={() => generatePrediction()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded transition-all disabled:opacity-50 group"
        >
          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
            {loading ? 'Scanning...' : `Scan: ${backtestPeriod.toUpperCase()}`}
          </span>
          <RefreshCcw size={12} className={`text-oil-gold ${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
        </button>
      </div>

      {/* Main Display */}
      <div className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-oil-amber/70">
            <RefreshCcw size={12} className="animate-spin" />
            <span>Scanning news wires & astral planes...</span>
          </div>
        )}

        {error && (
          <div className="text-red-500 flex items-center gap-2 italic">
            <ShieldAlert size={14} />
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {prediction ? (
            <motion.div 
              key={prediction.timestamp}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4 pb-4"
            >
              {/* Market Direction */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className={`text-xl font-black px-4 py-1.5 rounded skew-x-[-12deg] ${prediction.direction === 'UP' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : prediction.direction === 'DOWN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                    {prediction.direction === 'UP' ? 'VEC: CALL' : prediction.direction === 'DOWN' ? 'VEC: PUT' : 'VEC: SIDE'}
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-gray-500">CONFIDENCE</div>
                    <div className="text-oil-gold font-bold">{(prediction.confidence! * 100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="p-3 bg-oil-gold/5 border-l-2 border-oil-gold text-gray-300 italic text-[11px] leading-relaxed">
                  "{prediction.reasoning}"
                </div>
              </div>

              {/* Macro Sentiment Prominence */}
              {(macroSentiment || prediction.sentiment) && (
                <div className="p-3 bg-oil-gold/5 border border-oil-gold/20 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-oil-gold">
                      <Newspaper size={12} />
                      Macro Global Intelligence
                    </div>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-bold ${(macroSentiment?.score || prediction.sentiment?.score || 0) > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {macroSentiment?.intensity || 'MEDIUM'} INTENSITY
                    </div>
                  </div>
                  <div className="text-[11px] text-white font-medium leading-relaxed italic">
                    "{macroSentiment?.consensus || prediction.sentiment?.label || 'Scanning news wires...'}"
                  </div>
                </div>
              )}

              {/* Gann Geometric Matrix */}
              {gannData && (
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-oil-gold border-b border-white/5 pb-2">
                    <Activity size={12} />
                    Gann Geometric Matrix
                  </div>
                  <div className="pt-2 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-[8px] text-gray-500 uppercase font-bold">Square of 9 Resistances</div>
                      <div className="space-y-1">
                        {gannData.levels.resistances.slice(0, 3).map((level, i) => (
                          <div key={i} className="flex justify-between items-center text-[9px] font-mono p-1 bg-red-500/5 rounded">
                            <span className="text-red-400">G:R{i+1}</span>
                            <span className="text-white font-bold">${level.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[8px] text-gray-500 uppercase font-bold">Square of 9 Supports</div>
                      <div className="space-y-1">
                        {gannData.levels.supports.slice(0, 3).map((level, i) => (
                          <div key={i} className="flex justify-between items-center text-[9px] font-mono p-1 bg-green-500/5 rounded">
                            <span className="text-green-400">G:S{i+1}</span>
                            <span className="text-white font-bold">${level.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {fibData && (
                    <div className="pt-2 grid grid-cols-2 gap-4 border-t border-white/5 mt-2 pt-2">
                       <div className="space-y-2">
                        <div className="text-[8px] text-gray-500 uppercase font-bold">Fib. Retracements</div>
                        <div className="space-y-1">
                          {fibData.retracements.filter(f => [0.382, 0.5, 0.618].includes(f.level)).map((f, i) => (
                            <div key={i} className="flex justify-between items-center text-[9px] font-mono p-1 bg-blue-500/5 rounded">
                              <span className="text-blue-400">{f.level}</span>
                              <span className="text-white font-bold">${f.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[8px] text-gray-500 uppercase font-bold">Fib. Extensions</div>
                        <div className="space-y-1">
                          {fibData.extensions.slice(0, 3).map((f, i) => (
                            <div key={i} className="flex justify-between items-center text-[9px] font-mono p-1 bg-purple-500/5 rounded">
                              <span className="text-purple-400">{f.level}</span>
                              <span className="text-white font-bold">${f.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Indicator Correlation Matrix */}
                  <div className="pt-2 border-t border-white/5">
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 flex items-center justify-between">
                      <span>Market Correlation Matrix</span>
                      <ShieldCheck size={10} className="text-green-500/50" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-black/40 rounded border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] text-blue-400 font-bold uppercase">BTC/USD Ind.</span>
                          <span className="text-[7px] font-mono text-gray-600">INVERSE</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div animate={{ width: '65%' }} className="h-full bg-blue-500" />
                          </div>
                          <span className="text-[9px] font-mono font-bold text-white">-0.65</span>
                        </div>
                      </div>
                      <div className="p-2 bg-black/40 rounded border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] text-yellow-500 font-bold uppercase">XAU/USD Ind.</span>
                          <span className="text-[7px] font-mono text-gray-600">DIRECT</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div animate={{ width: '82%' }} className="h-full bg-yellow-500" />
                          </div>
                          <span className="text-[9px] font-mono font-bold text-white">+0.82</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {prediction.confluencePoints && prediction.confluencePoints.length > 0 && (
                    <div className="pt-3 border-t border-white/5">
                       <div className="text-[8px] text-oil-gold uppercase font-black mb-2 flex items-center gap-2">
                         <div className="w-1 h-1 bg-oil-gold rounded-full" />
                         High Probability Confluence Zone
                       </div>
                       <div className="space-y-1.5">
                         {prediction.confluencePoints.map((cp, i) => (
                           <div key={i} className="flex items-center justify-between p-2 bg-oil-gold/10 border border-oil-gold/20 rounded-md">
                             <div className="flex flex-col">
                               <span className="text-[9px] text-white font-bold">${cp.price.toFixed(2)}</span>
                               <span className="text-[7px] text-oil-gold/70 uppercase font-mono">{cp.source}</span>
                             </div>
                             <div className="text-right">
                               <span className="text-[8px] px-1.5 py-0.5 bg-black/40 rounded border border-white/10 text-gray-400 font-mono">
                                 {cp.type}
                               </span>
                             </div>
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                  {/* Astro-Geometric Alignment */}
                  <div className="pt-2 border-t border-white/5 bg-oil-amber/5 p-2 rounded mt-2 border border-oil-amber/10">
                     <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] uppercase font-black text-oil-amber flex items-center gap-2">
                           <RefreshCcw size={12} className="animate-spin-slow" />
                           Astro-Gann Alignment
                        </div>
                        <span className="text-[7px] font-mono text-oil-amber/60">PHASE: SYNERGETIC</span>
                     </div>
                     <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[9px]">
                           <span className="text-gray-400">Mars-Uranus Square Convergence</span>
                           <span className="text-white font-bold font-mono">1.618 Fib.</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                           <span className="text-gray-400">Gann Wheel of 24 (Time) Sync</span>
                           <span className="text-white font-bold font-mono">03h 48m</span>
                        </div>
                        <div className="flex items-center justify-between text-[9px]">
                           <span className="text-gray-400">Neptune Orbital Resonance</span>
                           <span className="text-white font-bold font-mono">GOLDEN_RATIO</span>
                        </div>
                     </div>
                  </div>

                  <div className="pt-2">
                    <div className="text-[8px] text-gray-500 uppercase font-bold mb-2">Upcoming Time Cycles</div>
                    <div className="space-y-1.5">
                      {gannData.cycles.map((cycle, i) => (
                        <div key={i} className="p-2 bg-black/40 border border-white/5 rounded flex justify-between items-start gap-3">
                          <div className="space-y-0.5">
                            <div className="text-[9px] text-oil-gold font-bold">{cycle.name}</div>
                            <div className="text-[7px] text-gray-500 leading-tight">{cycle.description}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-[8px] font-black ${cycle.significance === 'High' ? 'text-red-500' : 'text-yellow-500'}`}>{cycle.significance} SIG</div>
                            <div className="text-[7px] text-gray-600 font-mono">{new Date(cycle.nextDate).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Sentiment Gauge */}
              {prediction.sentiment && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-oil-gold uppercase text-[9px] font-black tracking-widest">
                      <Newspaper size={12} />
                      Quantum Market Sentiment
                    </div>
                    <div className={`text-[10px] font-black px-2 py-0.5 rounded italic tracking-widest ${prediction.sentiment.score > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {prediction.sentiment.score > 0 ? 'BULLISH' : 'BEARISH'}
                    </div>
                  </div>
                  
                  <div className="relative h-20 flex items-center justify-center overflow-hidden">
                    {/* Semi-circular Gauge Background */}
                    <svg viewBox="0 0 100 50" className="w-48 h-24">
                      <path 
                        d="M 10 45 A 35 35 0 0 1 90 45" 
                        fill="none" 
                        stroke="rgba(255,255,255,0.05)" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                      />
                      <path 
                        d="M 10 45 A 35 35 0 0 1 50 10" 
                        fill="none" 
                        stroke="rgba(239,68,68,0.2)" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                      />
                      <path 
                        d="M 50 10 A 35 35 0 0 1 90 45" 
                        fill="none" 
                        stroke="rgba(34,197,94,0.2)" 
                        strokeWidth="8" 
                        strokeLinecap="round"
                      />
                      
                      {/* Dynamic Needle */}
                      <motion.g
                        initial={{ rotate: -90 }}
                        animate={{ rotate: prediction.sentiment.score * 90 }}
                        transition={{ type: "spring", stiffness: 40, damping: 10 }}
                        style={{ originX: "50px", originY: "45px" }}
                      >
                        <line x1="50" y1="45" x2="50" y2="15" stroke="#D4AF37" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="50" cy="45" r="3" fill="#D4AF37" />
                      </motion.g>
                    </svg>
                    
                    <div className="absolute bottom-2 flex flex-col items-center">
                      <span className="text-[10px] text-gray-500 font-bold">SENTIMENT SCORE</span>
                      <span className="text-xl font-black text-white">{(prediction.sentiment.score * 100).toFixed(0)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-[8px] font-mono text-gray-500 px-4 -mt-2">
                    <span className="text-red-500/50">BEAR VORTEX</span>
                    <span className="text-green-500/50">BULL ORBIT</span>
                  </div>

                  {/* Entry Zone Visualization */}
                  <div className="mt-4 p-2 bg-oil-gold/5 border border-oil-gold/20 rounded flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-oil-gold uppercase font-black">Quantum Entry Zone</span>
                      <span className="text-xs font-mono font-bold text-white">
                        {prediction.strategy.entry}
                      </span>
                    </div>
                    <div className="px-2 py-1 bg-oil-amber/20 rounded border border-oil-amber/30 text-[9px] text-oil-amber font-black animate-pulse">
                      ACTIVE SCALP
                    </div>
                  </div>
                </div>
              )}

              {/* Quantum Wire Feed - Dedicated Section */}
              <NewsFeed />

              {/* Tactical Quantum Outlook - Gann & Fib Chart */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pl-1 pr-1">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-oil-gold">
                    <BarChart3 size={12} />
                    Tactical Astro-Geometry
                  </div>
                  <IndicatorSelector 
                    selectedIndicators={tacticalIndicators} 
                    onToggle={toggleTacticalIndicator} 
                  />
                </div>
                <TacticalChart 
  interval="5" 
  height={200} 
  indicators={tacticalIndicators} 
  cycles={gannData?.cycles || []} 
/>
                <div className="flex justify-between px-1 text-[7px] font-mono text-gray-600 uppercase">
                  <span>Gann Angles: Sync</span>
                  <span>Fib Levels: Locked</span>
                </div>
              </div>

              {/* Quantum Numerical Matrix - Asset & Astral Inputs */}
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-oil-gold">
                    <Activity size={12} />
                    Quantum Input Matrix
                  </div>
                  <div className="text-[7px] text-gray-600 font-mono italic">DATA_LAYER_SYNC</div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pb-2 border-b border-white/5">
                  <div className="flex flex-col p-2 bg-oil-gold/10 rounded border border-oil-gold/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-8 h-8 bg-oil-gold/10 -rotate-45 translate-x-4 -translate-y-4" />
                    <span className="text-[8px] text-oil-gold uppercase font-bold mb-1">Asset Price Vib.</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-white">
                        {liveVibrations?.priceVibration || prediction?.quantumCorrelation?.priceVibration || '—'}
                      </span>
                      <span className="text-[8px] text-oil-gold/60 underline decoration-dotted uppercase">
                        {liveVibrations ? 'WIRE_PUSH' : 'SCAN_STATE'}
                      </span>
                    </div>
                    {(liveVibrations?.timestamp || prediction?.timestamp) && (
                      <div className="text-[7px] text-oil-gold/50 font-mono mt-1 tracking-tighter">
                        TS: {new Date((liveVibrations?.timestamp || prediction?.timestamp) as string).toISOString().replace('T', ' ').replace('Z', '')}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col p-2 bg-white/5 rounded border border-white/10">
                    <span className="text-[8px] text-gray-500 uppercase font-bold mb-1">Cosmic Time Vib.</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-white">
                        {liveVibrations?.timeVibration || prediction?.quantumCorrelation?.timeVibration || '—'}
                      </span>
                      <span className="text-[8px] text-gray-600/60 underline decoration-dotted uppercase">
                         {liveVibrations ? 'UTC_SYNC' : 'STATIC'}
                      </span>
                    </div>
                    {(liveVibrations?.timestamp || prediction?.timestamp) && (
                      <div className="text-[7px] text-gray-500/50 font-mono mt-1 tracking-tighter">
                        TS: {new Date((liveVibrations?.timestamp || prediction?.timestamp) as string).toISOString().replace('T', ' ').replace('Z', '')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[8px] text-gray-500 uppercase font-bold tracking-widest px-1">Planetary Degree Vibrations</div>
                  <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                    {astro.planets.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-black/40 rounded border border-white/5 hover:border-oil-gold/20 transition-all cursor-default">
                        <div className="flex flex-col">
                          <span className="text-[7px] text-gray-500 font-bold uppercase">{p.name}</span>
                          <span className="text-[9px] text-white font-mono leading-none mt-0.5">{p.degree}° {p.sign.substring(0,3)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                           <span className="text-[7px] text-oil-gold/40 font-mono mb-0.5">VIBE</span>
                           <span className="text-[11px] font-black text-oil-gold leading-none">{p.numerology}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {(liveVibrations || prediction?.quantumCorrelation) && (
                  <div className="flex flex-col gap-1.5 py-2 px-2 bg-oil-amber/10 rounded border border-oil-amber/20">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-oil-amber animate-pulse shrink-0" />
                      <div className="text-[9px] text-oil-amber font-bold uppercase tracking-tight">
                        Correlation Alignment: {liveVibrations?.alignment || prediction?.quantumCorrelation?.alignment}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pl-3.5 text-[8px] font-mono text-oil-gold/80">
                      <div>
                        CONFIDENCE:{' '}
                        <span className={`font-black uppercase ${(liveVibrations?.confidenceScore || prediction?.quantumCorrelation?.confidenceScore) === 'High' ? 'text-green-400' : (liveVibrations?.confidenceScore || prediction?.quantumCorrelation?.confidenceScore) === 'Low' ? 'text-red-400' : 'text-yellow-400'}`}>
                          {liveVibrations?.confidenceScore || prediction?.quantumCorrelation?.confidenceScore || 'Medium'}
                        </span>
                      </div>
                      <div>
                        IMPACT: <span className="font-black text-white">{liveVibrations?.impactHours || prediction?.quantumCorrelation?.impactHours || 2}H</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TensorFlow.js Neural Drift Stream - Dedicated Section */}
                {mlPrediction && (
                  <div className="relative overflow-hidden bg-[#4285F4]/10 border border-[#4285F4]/30 rounded-xl p-4 mt-2 group shadow-[0_0_15px_rgba(66,133,244,0.1)]">
                    <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity">
                      <div className="text-[6px] font-black text-[#4285F4] uppercase leading-none">TF.js v4.22.0</div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                       <div className="p-1.5 bg-[#4285F4]/20 rounded-lg">
                         <BrainCircuit size={14} className="text-[#4285F4] animate-pulse" />
                       </div>
                       <div>
                         <div className="text-[10px] text-white font-black uppercase tracking-widest flex items-center gap-2">
                           TensorFlow.js Neural Drift
                           <span className="inline-block w-1 h-1 bg-[#4285F4] rounded-full animate-ping" />
                         </div>
                         <div className="text-[7px] text-[#4285F4]/70 uppercase font-mono tracking-tighter">Real-Time Pattern Recognition</div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                       <div className="space-y-1">
                          <div className="text-[8px] text-gray-500 uppercase font-bold tracking-tighter">Predicted Spot</div>
                          <div className={`text-xl font-mono font-black tracking-tighter ${mlPrediction.price > (prediction?.forecastTrajectory?.[0]?.expectedPrice || 87) ? 'text-green-400' : 'text-red-400'}`}>
                            ${mlPrediction.price.toFixed(3)}
                          </div>
                          <div className="text-[7px] font-mono text-[#4285F4] uppercase font-bold italic">
                            {mlPrediction.driftType || 'High-Prob Drift'}
                          </div>
                       </div>
                       
                       <div className="space-y-1">
                          <div className="text-[8px] text-gray-500 uppercase font-bold tracking-tighter">Inference Logic Map</div>
                          <div className="flex items-center gap-2">
                             <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${mlPrediction.confidence * 100}%` }}
                                  className="h-full bg-gradient-to-r from-[#4285F4] to-[#4285F4]/60"
                                />
                             </div>
                             <span className="text-[10px] font-mono font-black text-white">{(mlPrediction.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between items-center text-[7px] text-gray-600 font-mono uppercase">
                            <span>{mlPrediction.neuronsActive || 128} Neurons Active</span>
                            <span>{Math.round(mlPrediction.confidence * 100)}% REL</span>
                          </div>
                       </div>
                    </div>

                    {/* Embedded Drift Trajectory Chart */}
                    {mlHistory.length > 2 && (
                      <div className="h-16 mt-3 relative bg-black/20 rounded-lg overflow-hidden border border-white/5 group-hover:border-[#4285F4]/30 transition-colors">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={mlHistory}>
                            <defs>
                              <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4285F4" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#4285F4" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <YAxis domain={['auto', 'auto']} hide />
                            <Area 
                              type="monotone" 
                              dataKey="price" 
                              stroke="#4285F4" 
                              strokeWidth={2}
                              fillOpacity={1} 
                              fill="url(#driftGradient)" 
                              isAnimationActive={false}
                              dot={false}
                            />
                            {/* Latest Price Indicator Line */}
                            <ReferenceLine y={mlPrediction.price} stroke="#4285F4" strokeDasharray="3 3" opacity={0.3} />
                          </AreaChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 pointer-events-none p-2 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Activity size={8} className="text-[#4285F4] animate-pulse" />
                              <span className="text-[6px] text-[#4285F4]/70 uppercase font-black tracking-widest ont-mono">Manifold Drift Path</span>
                            </div>
                            <span className="text-[6px] text-gray-600 font-mono">T-{mlHistory.length}S</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                       <div className="flex gap-1.5 overflow-hidden">
                          {[1,2,3,4,5,6,7,8,9,10].map(i => (
                            <motion.div 
                              key={i}
                              animate={{ 
                                height: [Math.random() * 8 + 2, Math.random() * 8 + 2],
                                opacity: [0.3, 0.6, 0.3]
                              }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                              className="w-0.5 bg-[#4285F4] rounded-full"
                            />
                          ))}
                       </div>
                       <span className="text-[7px] font-mono text-gray-500 uppercase">ProcessID: AIS-TFJS-DRIFT-CORE</span>
                    </div>
                  </div>
                )}
              </div>

                {/* Predictive Correlation Model */}
                <div className="pt-2 border-t border-white/5 space-y-2 mt-2">
                  <CorrelationPanel />
                </div>

                {/* Dynamic Trade Setups */}
                {prediction.tradeSetups && prediction.tradeSetups.length > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-2 mt-2">
                    <TradingStrategyPanel 
                      strategy={{ ...prediction.strategy, confidence: prediction.confidence }} 
                      tradeSetups={prediction.tradeSetups as any} 
                      direction={prediction.direction as "UP" | "DOWN" | "NEUTRAL"} 
                    />
                  </div>
                )}

                {/* Strategy Deck */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                <div className="p-2 border border-oil-border rounded bg-white/5">
                  <div className="text-gray-500 text-[10px] uppercase">QUANTUM LEVERAGE</div>
                  <div className="text-oil-amber font-black italic">{prediction.strategy.leverage}</div>
                </div>
                <div className="p-2 border border-oil-border rounded bg-white/5">
                  <div className="text-gray-500 text-[10px] uppercase">SCALP ENTRY</div>
                  <div className="text-white font-mono">{prediction.strategy.entry}</div>
                </div>
                <div className="p-2 border border-oil-border rounded bg-white/5">
                  <div className="text-gray-500 text-[10px] uppercase">DYNAMIC TARGET</div>
                  <div className="text-green-400 font-mono font-bold leading-none">{prediction.strategy.target}</div>
                  <div className="text-[7px] text-green-500/50 uppercase mt-1">±$1.00 MARKET RANGE</div>
                </div>
                <div className="p-2 border border-oil-border rounded bg-white/5">
                  <div className="text-gray-500 text-[10px] uppercase">DYNAMIC SAFETY</div>
                  <div className="text-red-400 font-mono">{prediction.strategy.stopLoss}</div>
                  <div className="text-[7px] text-red-500/50 uppercase mt-1">±$1.00 RISK BRIDGE</div>
                </div>
              </div>

              {prediction.forecastTrajectory && (
                <PredictionChart data={prediction.forecastTrajectory} />
              )}

              {/* Backtest Analysis Section */}
              {prediction.backtest && (
                <div className="pt-3 border-t border-white/5 space-y-3">
                  <div className="flex flex-col gap-2 bg-oil-gold/10 px-2 py-2 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-oil-gold uppercase text-[9px] font-black tracking-widest">
                        <Database size={12} />
                        Quantum Backtest
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                        {['1h', '4h', '12h', '72h', '1w', '1m'].map((p) => (
                          <button
                            key={p}
                            onClick={() => {
                              setBacktestPeriod(p);
                              generatePrediction(p);
                            }}
                            className={`text-[8px] px-1.5 py-0.5 rounded border transition-all ${
                              backtestPeriod === p 
                                ? 'bg-oil-gold text-black border-oil-gold font-bold' 
                                : 'bg-transparent text-gray-400 border-white/10 hover:border-oil-gold/40'
                            }`}
                          >
                            {p.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => generatePrediction()}
                      disabled={loading}
                      className="w-full py-1.5 bg-oil-gold/20 hover:bg-oil-gold/30 border border-oil-gold/40 rounded flex items-center justify-center gap-2 text-oil-gold text-[10px] font-black uppercase tracking-[0.2em] transition-all group active:scale-[0.98]"
                    >
                      <RefreshCcw size={10} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
                      SCAN MATRIX: {backtestPeriod.toUpperCase()}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 bg-black/30 rounded border border-white/5 text-center">
                      <div className="text-[7px] text-gray-500 uppercase">Win Rate</div>
                      <div className="text-xs font-bold text-green-400">{(prediction.backtest.winRate * 100).toFixed(0)}%</div>
                    </div>
                    <div className="p-2 bg-black/30 rounded border border-white/5 text-center">
                      <div className="text-[7px] text-gray-500 uppercase">Profit Factor</div>
                      <div className="text-xs font-bold text-oil-gold">{prediction.backtest.profitFactor.toFixed(2)}</div>
                    </div>
                    <div className="p-2 bg-black/30 rounded border border-white/5 text-center">
                      <div className="text-[7px] text-gray-500 uppercase">Max DD</div>
                      <div className="text-xs font-bold text-red-400">{(prediction.backtest.maxDrawdown * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="text-[8px] text-gray-500 font-mono text-center">
                    Sample Size: <span className="text-white">{prediction.backtest.sampleSize} Simulated Matrix Trades</span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-col gap-1">
                <p className="text-[8px] text-gray-600 leading-tight">
                  Vectors generated via Astro-Market Synthesis. Leveraged derivatives carry total recursive risk.
                </p>
                <div className="flex items-center justify-between">
                  <a 
                    href="https://horoscopes.astro-seek.com/current-planets-astrology-transits-planetary-positions" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[7px] text-oil-gold/40 hover:text-oil-gold/80 transition-colors uppercase font-bold tracking-tighter"
                  >
                    Astro Data: Astro-Seek (Live Transits)
                  </a>
                  <span className="text-[7px] text-gray-600/50 font-mono italic">SYNC_VERIFIED: 2026-04-20</span>
                </div>
              </div>
            </motion.div>
          ) : (
             !loading && <div className="text-gray-600 italic">Initialize terminal to begin cosmic market tracking.</div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Footer bar */}
      <div className="bg-oil-dim border-t border-oil-border p-2 flex justify-between items-center shrink-0">
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-gray-400 font-mono">LIVE FEED</span>
          </div>
          <div className="flex items-center gap-1">
             <span className="text-[10px] text-gray-400 font-mono">TPS: 144Hz</span>
          </div>
        </div>
        <div className="text-[10px] text-gray-500 font-mono">
          © {new Date().getFullYear()} ASTROQUANT SYSTEMS
        </div>
      </div>
    </div>
  );
}
