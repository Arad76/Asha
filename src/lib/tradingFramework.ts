/**
 * Trading Strategy Framework
 * Designed for High-Leverage, High-Yield Trading on predicted commodities (WTI Crude Oil).
 */

export interface Signal {
  type: 'LONG' | 'SHORT' | 'NEUTRAL';
  entryPrice: number;
  confidence: number; // 0 to 1
  timestamp: string;
  catalysts: string[]; // e.g., ["Astro-Gann Confluence", "Bullish News Sentiment"]
}

export interface RiskManagementPlan {
  stopLossAmount: number;
  takeProfitAmount: number;
  riskRewardRatio: number;
}

export interface Position {
  id: string;
  signal: Signal;
  size: number; // Position size in units/contracts
  leverage: number;
  margin: number;
  entryTime: string;
  status: 'OPEN' | 'CLOSED';
  exitPrice?: number;
  pnl?: number;
}

export interface BacktestResult {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  netProfit: number;
  sharpeRatio: number;
}

/**
 * Calculates optimal position size using a modified Kelly Criterion
 * tailored for high-volatility, high-leverage crude oil trading.
 * 
 * Kelly % = W - [(1 - W) / R]
 * Where W is win probability, and R is the Risk/Reward ratio.
 * 
 * @param accountBalance Total account equity
 * @param winProbability Historical or predicted probability of winning (0 to 1)
 * @param riskRewardRatio The ratio of potential profit to potential loss (e.g., 2 for a 2:1 ratio)
 * @param leverage Maximum allowed leverage (used to scale sizing)
 * @param maxRiskPerTrade Maximum percentage of account balance to risk on a single trade (e.g., 0.02 for 2%)
 */
export function calculatePositionSize(
  accountBalance: number,
  winProbability: number,
  riskRewardRatio: number,
  leverage: number = 1,
  maxRiskPerTrade: number = 0.05 // Cap risk at 5% for high-leverage accounts
): { positionSizeAsset: number; marginRequired: number; actualRisk: number } {
  // Base Kelly formula
  let kellyPercentage = winProbability - ((1 - winProbability) / riskRewardRatio);
  
  // Half-Kelly is often used in practice to reduce volatility
  let fractionalKelly = kellyPercentage / 2;
  
  // Cap at maxRiskPerTrade (e.g. 5% max risk)
  if (fractionalKelly > maxRiskPerTrade) {
    fractionalKelly = maxRiskPerTrade;
  }
  
  // If edge is negative, don't trade
  if (fractionalKelly <= 0) {
    return { positionSizeAsset: 0, marginRequired: 0, actualRisk: 0 };
  }

  const capitalToRisk = accountBalance * fractionalKelly;
  
  // Leverage magnifies buying power
  const buyingPower = capitalToRisk * leverage;
  
  return {
    positionSizeAsset: buyingPower,
    marginRequired: capitalToRisk,
    actualRisk: fractionalKelly
  };
}

/**
 * Generates dynamic stop-loss and take-profit levels using ATR 
 * (Average True Range) or Fibonacci extensions to account for current volatility.
 */
export function calculateDynamicRiskLevels(
  entryPrice: number,
  direction: 'LONG' | 'SHORT',
  currentVolatilityATR: number,
  riskMultiplier: number = 1.5,
  rewardMultiplier: number = 3.0
): RiskManagementPlan {
  const riskAmount = currentVolatilityATR * riskMultiplier;
  const rewardAmount = currentVolatilityATR * rewardMultiplier;
  
  const stopLoss = direction === 'LONG' ? entryPrice - riskAmount : entryPrice + riskAmount;
  const takeProfit = direction === 'LONG' ? entryPrice + rewardAmount : entryPrice - rewardAmount;
  
  return {
    stopLossAmount: stopLoss,
    takeProfitAmount: takeProfit,
    riskRewardRatio: rewardAmount / riskAmount
  };
}

/**
 * Mock framework for backtesting a strategy against historical signals and price data.
 */
export function runBacktest(
  historicalPrices: { time: string; open: number; high: number; low: number; close: number }[],
  signals: Signal[],
  initialCapital: number
): BacktestResult {
  // In a real implementation, this would iterate over the timeseries, match signals to prices,
  // manage open positions, trigger stop-loss/take-profits, and calculate P&L tracking.
  // We return a simulated output based on the framework design.
  
  return {
    totalTrades: signals.length,
    winRate: 0.62, // Simulated
    profitFactor: 1.8,
    maxDrawdown: 0.12,
    netProfit: initialCapital * 0.45, // Simulating a 45% return
    sharpeRatio: 1.4
  };
}
