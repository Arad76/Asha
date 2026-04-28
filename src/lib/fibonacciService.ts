/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FibonacciLevels {
  retracements: { level: number; price: number }[];
  extensions: { level: number; price: number }[];
}

/**
 * Calculates Fibonacci retracement levels based on a high and low price.
 */
export function calculateFibonacciLevels(high: number, low: number): FibonacciLevels {
  const diff = high - low;
  const retracementRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const extensionRatios = [1.272, 1.382, 1.5, 1.618, 2, 2.618];

  const retracements = retracementRatios.map(ratio => ({
    level: ratio,
    price: high - diff * ratio
  }));

  const extensions = extensionRatios.map(ratio => ({
    level: ratio,
    price: high + diff * (ratio - 1)
  }));

  return { retracements, extensions };
}

/**
 * Finds the nearest Fibonacci level to a given price.
 */
export function findNearestFibLevel(price: number, levels: FibonacciLevels) {
  const allLevels = [...levels.retracements, ...levels.extensions];
  return allLevels.reduce((prev, curr) => 
    Math.abs(curr.price - price) < Math.abs(prev.price - price) ? curr : prev
  );
}
