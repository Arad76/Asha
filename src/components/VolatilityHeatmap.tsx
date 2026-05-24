import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

interface HeatmapData {
  time: Date;
  volatility: number;
  astroActivity: number;
}

export const VolatilityHeatmap: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Generate 24 hours of mock data
  const data: HeatmapData[] = useMemo(() => {
    const arr: HeatmapData[] = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 60 * 60 * 1000);
      arr.push({
        time: t,
        volatility: Math.random() * 100, // 0 to 100 proxy for volatility
        astroActivity: Math.random() // 0 to 1 score
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 100 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tools setup
    const tileWidth = width / data.length;

    // Color scale for volatility (dark slate/gray to vibrant gold)
    const colorScale = d3.scaleSequential(d3.interpolateYlOrBr)
      .domain([0, 150]); // Shift max to make low volatility darker

    const timeFormat = d3.timeFormat("%H:%M");

    // Draw the tiles
    const tiles = g.selectAll("rect")
      .data(data)
      .enter()
      .append("g")
      .attr("transform", (d, i) => `translate(${i * tileWidth}, 0)`);

    tiles.append("rect")
      .attr("width", tileWidth - 2)
      .attr("height", height)
      .attr("rx", 4)
      .attr("fill", d => colorScale(d.volatility))
      .attr("stroke", d => d.astroActivity > 0.7 ? "#3b82f6" : "none") // Highlight high astro activity with blue
      .attr("stroke-width", d => d.astroActivity > 0.7 ? 2 : 0)
      .style("opacity", 0.8)
      .on("mouseover", function(event, d) {
        d3.select(this).style("opacity", 1);
        // We could show tooltip here
      })
      .on("mouseout", function(event, d) {
        d3.select(this).style("opacity", 0.8);
      });

    // Add astrological peak markers
    tiles.filter(d => d.astroActivity > 0.7)
      .append("circle")
      .attr("cx", (tileWidth - 2) / 2)
      .attr("cy", height + 8)
      .attr("r", 3)
      .attr("fill", "#3b82f6");

    // X Axis Labels (every 4 hours)
    const xAxis = g.selectAll(".x-label")
      .data(data.filter((_, i) => i % 4 === 0))
      .enter()
      .append("text")
      .attr("class", "x-label")
      .attr("x", (d, i) => (data.indexOf(d) * tileWidth) + (tileWidth / 2))
      .attr("y", -8)
      .attr("text-anchor", "middle")
      .style("fill", "#9ca3af")
      .style("font-size", "10px")
      .style("font-family", "monospace")
      .text(d => timeFormat(d.time));

  }, [data]);

  return (
    <div className="w-full bg-black/40 rounded-xl border border-white/5 p-4 shadow-2xl flex flex-col gap-2">
      <div className="flex items-center justify-between pb-2 border-b border-white/5">
        <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">24H Volatility & Astro Heatmap</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-sm bg-[#fff7bc] opacity-80"></div>
             <span className="text-[9px] text-gray-500 uppercase tracking-widest">Low</span>
          </div>
          <div className="flex items-center gap-1">
             <div className="w-2 h-2 rounded-sm bg-[#d95f0e] opacity-80"></div>
             <span className="text-[9px] text-gray-500 uppercase tracking-widest">High Volatility</span>
          </div>
          <div className="flex items-center gap-1 ml-2">
             <div className="w-2 h-2 rounded-full bg-blue-500"></div>
             <span className="text-[9px] text-blue-400 uppercase tracking-widest">Astro Peak</span>
          </div>
        </div>
      </div>
      <div className="w-full h-[100px]">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
};
