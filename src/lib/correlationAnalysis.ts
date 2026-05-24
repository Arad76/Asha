/**
 * Correlation Analysis Module
 * Analyzes statistically significant relationships between crude oil prices, 
 * astrological positioning, and numerological factors.
 */

import { AstroData, PlanetaryPosition } from '../types';

const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

export function getAbsDegree(p: PlanetaryPosition) {
  return SIGNS.indexOf(p.sign) * 30 + p.degree + p.minute / 60;
}

export interface DataPoint {
  timestamp: string; // ISO String
  price: number;     // WTI Crude Oil Price
  astro: AstroData;  // Planetary positions at that time
  numerology: {
    dayNumber: number;
  };
}

interface CorrelationResult {
  factor: string;
  pearsonCoefficient: number;
  statisticalSignificance: 'High' | 'Medium' | 'Low' | 'None';
  description: string;
}

/**
 * Calculates the Pearson correlation coefficient between two numeric arrays.
 * Returns a value between -1 and 1.
 */
function calculatePearson(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const meanX = x.reduce((a, b) => a + b, 0) / x.length;
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;
  
  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;
  
  for (let i = 0; i < x.length; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumSqX += diffX * diffX;
    sumSqY += diffY * diffY;
  }
  
  if (sumSqX === 0 || sumSqY === 0) return 0;
  
  return numerator / Math.sqrt(sumSqX * sumSqY);
}

/**
 * Determines statistical significance based on absolute correlation strength
 * and sample size (simplified heuristic).
 */
function getSignificance(coefficient: number, sampleSize: number): 'High' | 'Medium' | 'Low' | 'None' {
  const abs = Math.abs(coefficient);
  if (sampleSize < 10) return 'None';
  
  if (abs >= 0.7) return 'High';     // Strong correlation
  if (abs >= 0.4) return 'Medium';   // Moderate correlation
  if (abs >= 0.2) return 'Low';      // Weak correlation
  return 'None';
}

/**
 * Analyzes historical timeseries data to find correlations 
 * between oil price movements and esotoric/astrological factors.
 */
export function analyzeCorrelations(dataset: DataPoint[]): CorrelationResult[] {
  if (dataset.length < 2) {
    throw new Error('Insufficient data for correlation analysis');
  }

  const prices = dataset.map(d => d.price);
  
  // Extract specific independent variables to test against price
  
  // 1. Sun Degree Correlation
  const sunDegrees = dataset.map(d => {
    const p = d.astro.planets.find(pl => pl.name === 'Sun');
    return p ? getAbsDegree(p) : 0;
  });
  const sunCorr = calculatePearson(prices, sunDegrees);
  
  // 2. Numerology Universal Day Correlation
  const uniDays = dataset.map(d => d.numerology.dayNumber);
  const numCorr = calculatePearson(prices, uniDays);

  // 3. Moon Phase (simplified as angular distance from Sun) Correlation
  const moonDistance = dataset.map(d => {
    const sun = d.astro.planets.find(pl => pl.name === 'Sun');
    const moon = d.astro.planets.find(pl => pl.name === 'Moon');
    
    if (sun && moon) {
      let diff = Math.abs(getAbsDegree(sun) - getAbsDegree(moon));
      if (diff > 180) diff = 360 - diff;
      return diff; // 0 = New Moon, 180 = Full Moon
    }
    return 0;
  });
  const moonCorr = calculatePearson(prices, moonDistance);

  // Compile results
  return [
    {
      factor: 'Sun Zodiac Degree',
      pearsonCoefficient: sunCorr,
      statisticalSignificance: getSignificance(sunCorr, dataset.length),
      description: 'Tests if specific solar degrees align with price peaks or troughs.'
    },
    {
      factor: 'Universal Day Numerology',
      pearsonCoefficient: numCorr,
      statisticalSignificance: getSignificance(numCorr, dataset.length),
      description: 'Tests if sum-of-digits calendar days correlate with directional momentum.'
    },
    {
      factor: 'Lunar Phase Angles',
      pearsonCoefficient: moonCorr,
      statisticalSignificance: getSignificance(moonCorr, dataset.length),
      description: 'Tests if New/Full moon extremes correlate with price volatility or trend reversals.'
    }
  ];
}
