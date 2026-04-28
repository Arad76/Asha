/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function calculateNumerology(value: string | number): number {
  let str = value.toString().replace(/[^0-9]/g, '');
  if (!str) return 0;
  
  let sum = str.split('').reduce((acc, char) => acc + parseInt(char, 10), 0);
  
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').reduce((acc, char) => acc + parseInt(char, 10), 0);
  }
  
  return sum;
}

export function getDayNumerology(date: Date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  const val = calculateNumerology(`${day}${month}${year}`);
  
  const meanings: Record<number, { vibration: string; meaning: string }> = {
    1: { vibration: "Action", meaning: "New beginnings, leadership, and bold entries." },
    2: { vibration: "Balance", meaning: "Partnership, diplomacy, and waiting for confirmation." },
    3: { vibration: "Expansion", meaning: "Creativity, communication, and rapid growth." },
    4: { vibration: "Stability", meaning: "Solid foundations, discipline, and hard work." },
    5: { vibration: "Change", meaning: "Freedom, adaptability, and high volatility." },
    6: { vibration: "Harmony", meaning: "Responsibility, protection, and balanced trading." },
    7: { vibration: "Wisdom", meaning: "Analysis, introspection, and technical precision." },
    8: { vibration: "Power", meaning: "Material success, high stakes, and large gains." },
    9: { vibration: "Completion", meaning: "Ending cycles, fulfillment, and profit taking." },
    11: { vibration: "Illumination", meaning: "Intuition, spiritual insight, and visionary moves." },
    22: { vibration: "Manifestation", meaning: "Master builder, large-scale success." },
    33: { vibration: "Guidance", meaning: "Universal teacher, profound influence." },
  };
  
  return {
    dayNumber: val,
    ...(meanings[val] || { vibration: "Unknown", meaning: "Generic cycle." })
  };
}
