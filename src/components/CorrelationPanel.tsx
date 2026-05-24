import React, { useEffect, useState } from 'react';
import { Database, Link2 } from 'lucide-react';
import { analyzeCorrelations, DataPoint } from '../lib/correlationAnalysis';

// Mock generation for the correlation analysis on the frontend to visualize the models
const generateMockData = (): DataPoint[] => {
  const points: DataPoint[] = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const t = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    points.push({
      timestamp: t.toISOString(),
      price: 80 + Math.random() * 15,
      astro: {
        planets: [
          { name: 'Sun', degree: (t.getDate() * 12) % 30, sign: 'Aries', minute: 0, retrograde: false, numerology: 1 },
          { name: 'Moon', degree: (t.getHours() * 15) % 30, sign: 'Taurus', minute: 0, retrograde: false, numerology: 2 }
        ]
      },
      numerology: {
        dayNumber: (t.getDate() % 9) + 1
      }
    });
  }
  return points;
};

export const CorrelationPanel: React.FC = () => {
  const [correlations, setCorrelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const data = generateMockData();
      const results = analyzeCorrelations(data);
      setCorrelations(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
           <Database size={12} className="text-purple-400" />
           <span className="text-[9px] font-black uppercase tracking-widest text-purple-400">Pearson Correlations</span>
        </div>
        <span className="text-[7px] text-gray-500 font-mono">D-30 SAMPLE</span>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-[9px] text-gray-500 animate-pulse text-center">Processing models...</div>
        ) : (
          correlations.map((c, i) => (
            <div key={i} className="flex flex-col gap-1 p-2 bg-white/[0.02] rounded border border-white/5">
               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-1.5">
                   <Link2 size={10} className="text-gray-500" />
                   <span className="text-[8px] uppercase font-bold text-gray-300">{c.factor}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <span className={`text-[7px] px-1 py-0.5 rounded uppercase font-black ${
                      Math.abs(c.pearsonCoefficient) > 0.5 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {c.statisticalSignificance} SIG
                    </span>
                    <span className={`text-[10px] font-mono font-bold ${c.pearsonCoefficient > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {c.pearsonCoefficient > 0 ? '+' : ''}{c.pearsonCoefficient.toFixed(2)}
                    </span>
                 </div>
               </div>
               <p className="text-[7px] text-gray-500 italic pl-4">
                 "{c.description}"
               </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
