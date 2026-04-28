/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PlanetaryPosition {
  name: string;
  sign: string;
  degree: number;
  minute: number;
  retrograde: boolean;
  numerology: number;
}

export interface AstroData {
  timestamp: string;
  planets: PlanetaryPosition[];
  ascendant?: PlanetaryPosition;
}

export interface AstroAspect {
  p1: string;
  p2: string;
  type: string;
  orb: number;
  strength: 'High' | 'Medium' | 'Low';
}

export interface NumerologyData {
  dayNumber: number; // Life Path style calculation for the day
  vibration: string;
  meaning: string;
}

export interface FuturesContract {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface PredictionResult {
  confidence: number;
  direction: 'UP' | 'DOWN' | 'NEUTRAL';
  reasoning: string;
  strategy: {
    leverage: string;
    entry: string;
    target: string;
    stopLoss: string;
  };
  timestamp: string;
}
