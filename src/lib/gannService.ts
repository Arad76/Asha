/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GannCycle {
  name: string;
  nextDate: string;
  significance: 'High' | 'Medium' | 'Low';
  description: string;
}

export interface GannLevels {
  supports: number[];
  resistances: number[];
}

/**
 * Basic Gann Square of 9 calculation for price levels
 * Price levels based on degrees (45, 90, 180, 270, 360)
 */
export function calculateGannLevels(price: number): GannLevels {
  const root = Math.sqrt(price);
  
  // High granularity angles (22.5 degree increments for dense levels)
  const angles = [22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5, 360];
  const supports: number[] = [];
  const resistances: number[] = [];
  
  angles.forEach(angle => {
    // Upward levels (Resistances)
    resistances.push(Math.pow(root + (angle / 180), 2));
    // Downward levels (Supports)
    const support = Math.pow(root - (angle / 180), 2);
    if (support > 0) supports.push(support);
  });
  
  return {
    supports: supports.sort((a, b) => b - a), // Descending
    resistances: resistances.sort((a, b) => a - b) // Ascending
  };
}

/**
 * Gann Angle calculations (1x1, 1x2, 2x1, etc.)
 * price = slope * (time_units) + start_price
 */
export function calculateGannAngles(startPrice: number, timeUnits: number) {
  const ratios = [0.125, 0.25, 0.5, 1, 2, 4, 8]; // 1x8, 1x4, 1x2, 1x1, 2x1, 4x1, 8x1
  return ratios.map(ratio => ({
    ratio: ratio === 1 ? "1x1" : ratio > 1 ? `${ratio}x1` : `1x${1/ratio}`,
    price: startPrice + (ratio * timeUnits)
  }));
}

/**
 * Gann Time Cycles based on major wheels
 */
export function getGannCycles(): GannCycle[] {
  const now = new Date();
  
  const cycles: GannCycle[] = [
    {
      name: "90-Day Harmonic",
      nextDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString(), // Mock for demo
      significance: 'High',
      description: "Square of the Circle completion. Expect major trend reversal."
    },
    {
      name: "144-Cycle",
      nextDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      significance: 'Medium',
      description: "Fibonacci-Gann resonance point. Volatility spike expected."
    },
    {
      name: "Master 360",
      nextDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      significance: 'High',
      description: "Solar year completion in price-time space."
    }
  ];
  
  return cycles;
}
