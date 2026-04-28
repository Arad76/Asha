/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

interface ForecastDataPoint {
  timeOffset: string;
  expectedPrice: number;
}

interface Props {
  data: ForecastDataPoint[];
}

export function PredictionChart({ data }: Props) {
  if (!data || data.length === 0) return null;

  const minPrice = Math.min(...data.map(d => d.expectedPrice));
  const maxPrice = Math.max(...data.map(d => d.expectedPrice));
  const padding = (maxPrice - minPrice) * 0.1 || 1; // Default padding if flat

  return (
    <div className="w-full h-[140px] mt-3 bg-black/40 rounded border border-white/5 p-2">
      <div className="text-[9px] text-gray-500 uppercase font-black tracking-widest pl-1 mb-1 font-mono">
        Orbit Forecast Trajectory
      </div>
      <div className="w-full h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis 
              dataKey="timeOffset" 
              stroke="rgba(255,255,255,0.2)" 
              fontSize={8} 
              tickMargin={4}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              domain={[minPrice - padding, maxPrice + padding]} 
              stroke="rgba(255,255,255,0.2)" 
              fontSize={8}
              tickFormatter={(val) => `$${val.toFixed(2)}`}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.3)', fontSize: '10px' }}
              labelStyle={{ color: '#D4AF37' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Projected Price']}
            />
            <Line 
              type="monotone" 
              dataKey="expectedPrice" 
              stroke="#D4AF37" 
              strokeWidth={2} 
              dot={{ r: 2, fill: '#D4AF37', strokeWidth: 0 }} 
              activeDot={{ r: 4, fill: '#fff' }} 
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
