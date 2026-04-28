/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AstroData } from '../types';

interface Props {
  astro: AstroData;
}

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16",
  "#22c55e", "#10b981", "#06b6d4", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899"
];

export function AstroWheel({ astro }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !astro) return;

    const width = 400;
    const height = 400;
    const margin = 10;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.7;
    const signRadius = radius * 0.85;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Draw the outer circle
    g.append("circle")
      .attr("r", radius)
      .attr("fill", "rgba(0, 0, 0, 0.4)")
      .attr("stroke", "rgba(212, 175, 55, 0.3)")
      .attr("stroke-width", 2);

    // Draw zodiac segments
    const pie = d3.pie<void>().value(() => 1).sort(null);
    const arc = d3.arc<any>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .startAngle((d, i) => i * (Math.PI * 2 / 12) - Math.PI / 12)
      .endAngle((d, i) => (i + 1) * (Math.PI * 2 / 12) - Math.PI / 12);

    const segments = g.selectAll(".sign-segment")
      .data(pie(new Array(12)))
      .enter()
      .append("g")
      .attr("class", "sign-segment");

    segments.append("path")
      .attr("d", arc as any)
      .attr("fill", (d, i) => i % 2 === 0 ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.03)")
      .attr("stroke", "rgba(212, 175, 55, 0.1)");

    // Add zodiac labels
    segments.append("text")
      .attr("transform", (d, i) => {
        const centroid = d3.arc<any>()
          .innerRadius(innerRadius)
          .outerRadius(radius)
          .centroid({
            startAngle: i * (Math.PI * 2 / 12) - Math.PI / 12,
            endAngle: (i + 1) * (Math.PI * 2 / 12) - Math.PI / 12
          } as any);
        return `translate(${centroid[0]}, ${centroid[1]})`;
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "8px")
      .attr("fill", "rgba(156, 163, 175, 0.6)")
      .attr("font-family", "monospace")
      .text((d, i) => SIGNS[i].substring(0, 3).toUpperCase());

    // Draw planetary positions
    astro.planets.forEach((p) => {
      const signIndex = SIGNS.indexOf(p.sign);
      if (signIndex === -1) return;

      const totalDegrees = (signIndex * 30) + p.degree + (p.minute / 60);
      const angle = (totalDegrees * (Math.PI / 180)) - (Math.PI / 2);
      
      const x = Math.cos(angle) * (innerRadius * 0.9);
      const y = Math.sin(angle) * (innerRadius * 0.9);

      // Planet point
      g.append("circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 4)
        .attr("fill", "#D4AF37")
        .attr("filter", "drop-shadow(0 0 5px rgba(212, 175, 55, 0.5))");

      // Label line
      const labelX = Math.cos(angle) * (innerRadius * 0.7);
      const labelY = Math.sin(angle) * (innerRadius * 0.7);

      g.append("line")
        .attr("x1", x)
        .attr("y1", y)
        .attr("x2", labelX)
        .attr("y2", labelY)
        .attr("stroke", "rgba(212, 175, 55, 0.2)")
        .attr("stroke-dasharray", "2,2");

      // Planet label (Name)
      g.append("text")
        .attr("x", labelX)
        .attr("y", labelY - 3)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "8px")
        .attr("fill", "white")
        .attr("font-weight", "bold")
        .text(p.name.toUpperCase());

      // Planet label (Sign + Degree)
      g.append("text")
        .attr("x", labelX)
        .attr("y", labelY + 6)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "7px")
        .attr("fill", "#D4AF37")
        .attr("font-family", "monospace")
        .text(`${p.degree}°${p.minute}' ${p.sign.substring(0, 3).toUpperCase()}`);
    });

    // Center decor
    g.append("circle")
      .attr("r", innerRadius * 0.35)
      .attr("fill", "rgba(212, 175, 55, 0.05)")
      .attr("stroke", "rgba(212, 175, 55, 0.2)")
      .attr("stroke-dasharray", "4,4");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("fill", "rgba(212, 175, 55, 0.5)")
      .attr("font-weight", "black")
      .text("QUANTUM_READY");

  }, [astro]);

  return (
    <div className="relative flex items-center justify-center p-4 bg-black/20 rounded-xl border border-white/5 backdrop-blur-sm overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-oil-gold/5 via-transparent to-oil-amber/5 opacity-50" />
      <svg 
        ref={svgRef} 
        viewBox="0 0 400 400" 
        className="w-full max-w-[320px] h-auto drop-shadow-[0_0_15px_rgba(212,175,55,0.15)]"
      />
    </div>
  );
}
