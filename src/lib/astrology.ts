/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as AstronomyNamespace from 'astronomy-engine';
const Astronomy: any = (AstronomyNamespace as any).default || AstronomyNamespace;
const { AstroTime, Body, GeoVector, Ecliptic } = Astronomy;

import { calculateNumerology } from './numerology.ts';
import { PlanetaryPosition, AstroAspect } from '../types.ts';

export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];

export function getActiveAspects(positions: PlanetaryPosition[]): AstroAspect[] {
  const getAbsDegree = (p: PlanetaryPosition) => {
    return SIGNS.indexOf(p.sign) * 30 + p.degree + p.minute / 60;
  };

  const aspects: AstroAspect[] = [];
  
  for(let i=0; i<positions.length; i++) {
    for(let j=i+1; j<positions.length; j++) {
      const p1 = positions[i];
      const p2 = positions[j];
      
      const deg1 = getAbsDegree(p1);
      const deg2 = getAbsDegree(p2);
      
      let diff = Math.abs(deg1 - deg2);
      if (diff > 180) diff = 360 - diff;
      
      const checkAspect = (target: number, name: string, maxOrb: number) => {
        const orb = Math.abs(diff - target);
        if (orb <= maxOrb) {
           let strength: 'High' | 'Medium' | 'Low' = 'Low';
           if (orb <= maxOrb * 0.33) strength = 'High';
           else if (orb <= maxOrb * 0.66) strength = 'Medium';
           
           aspects.push({ p1: p1.name, p2: p2.name, type: name, orb, strength });
        }
      };

      checkAspect(0, "Conjunction", 8);
      checkAspect(180, "Opposition", 8);
      checkAspect(90, "Square", 8);
      checkAspect(120, "Trine", 8);
      checkAspect(60, "Sextile", 6);
    }
  }

  // Sort by tightest orb
  return aspects.sort((a, b) => a.orb - b.orb).slice(0, 5); // top 5 most exact aspects
}

export function getPLANETARY_DATA(date: Date = new Date()) {
  const time = new AstroTime(date);
  
  const bodies = [
    { name: "Sun", id: Body.Sun },
    { name: "Moon", id: Body.Moon },
    { name: "Mercury", id: Body.Mercury },
    { name: "Venus", id: Body.Venus },
    { name: "Mars", id: Body.Mars },
    { name: "Jupiter", id: Body.Jupiter },
    { name: "Saturn", id: Body.Saturn },
    { name: "Uranus", id: Body.Uranus },
    { name: "Neptune", id: Body.Neptune },
    { name: "Pluto", id: Body.Pluto },
  ];

  const positions: PlanetaryPosition[] = bodies.map((b) => {
    // True astrological mapping uses Geocentric Ecliptic Longitude.
    // aberration = true accounts for the speed of light delay.
    const geoVec = GeoVector(b.id, time, true);
    const ecliptic = Ecliptic(geoVec);
    
    // Normalize longitude (0-360 starting at 0° Aries)
    let lon = ecliptic.elon;
    if (lon < 0) lon += 360;

    const signIdx = Math.floor(lon / 30);
    const degree = Math.floor(lon % 30);
    const minute = Math.floor(((lon % 30) - degree) * 60);

    const degreeNumerology = calculateNumerology(degree + (signIdx * 30));

    return {
      name: b.name,
      sign: SIGNS[signIdx],
      degree,
      minute,
      retrograde: false, // Computation omitted for performance
      numerology: degreeNumerology
    };
  });

  return positions;
}

