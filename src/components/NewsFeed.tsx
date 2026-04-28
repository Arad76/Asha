
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchOilNews, NewsItem } from '../lib/geminiService';

export const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadNews = async () => {
    setLoading(true);
    const data = await fetchOilNews();
    if (data && data.length > 0) {
      setNews(data);
    }
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadNews();
    const interval = setInterval(loadNews, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish': return <TrendingUp id="sentiment-up" className="text-green-500 w-4 h-4" />;
      case 'Bearish': return <TrendingDown id="sentiment-down" className="text-red-500 w-4 h-4" />;
      default: return <Minus id="sentiment-neutral" className="text-gray-400 w-4 h-4" />;
    }
  };

  const getSentimentBg = (sentiment: string) => {
    switch (sentiment) {
      case 'Bullish': return 'bg-green-500/10 border-green-500/20';
      case 'Bearish': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div id="news-feed-container" className="bg-oil-dim/40 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden flex flex-col h-[300px] shadow-2xl">
      <div id="news-header" className="px-3 py-2 border-b border-white/5 flex justify-between items-center bg-white/5">
        <div id="news-title-group" className="flex items-center gap-2">
          <Newspaper id="news-icon" className="text-oil-gold w-4 h-4" />
          <h2 id="news-title" className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Global Intel</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <button 
            id="refresh-news-btn"
            onClick={loadNews}
            disabled={loading}
            className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw id="refresh-icon" className={`w-3 h-3 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div id="news-scroll-area" className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        {loading && news.length === 0 ? (
          <div id="news-loading-state" className="flex flex-col items-center justify-center h-full py-12 space-y-4 text-gray-500">
            <RefreshCw id="loading-spinner" className="w-8 h-8 animate-spin text-blue-500/50" />
            <p id="loading-text" className="text-sm font-mono animate-pulse uppercase tracking-widest">Scanning X, Telegram & Google...</p>
          </div>
        ) : (
          <AnimatePresence id="news-presence" mode="popLayout">
            {news.map((item, index) => (
              <motion.div
                id={`news-item-${index}`}
                key={item.url + index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border ${getSentimentBg(item.sentiment)} transition-all hover:bg-white/5 group`}
              >
                <div id={`news-meta-${index}`} className="flex justify-between items-start mb-2">
                  <span id={`news-source-${index}`} className="text-[10px] font-mono text-oil-gold/80 uppercase tracking-wider bg-oil-gold/10 px-2 py-0.5 rounded">
                    {item.source}
                  </span>
                  <div id={`news-sentiment-${index}`} className="flex items-center gap-1">
                    {getSentimentIcon(item.sentiment)}
                    <span className={`text-[10px] font-bold uppercase ${item.sentiment === 'Bullish' ? 'text-green-400' : item.sentiment === 'Bearish' ? 'text-red-400' : 'text-gray-400'}`}>
                      {item.sentiment}
                    </span>
                  </div>
                </div>
                
                <h3 id={`news-headline-${index}`} className="text-sm font-semibold text-white mb-2 leading-tight group-hover:text-oil-gold transition-colors">
                  {item.title}
                </h3>
                
                <ul id={`news-bullets-${index}`} className="text-xs text-gray-400 mb-3 space-y-1 list-none">
                  {item.bullets?.map((bullet, bIdx) => (
                    <li key={bIdx} className="flex gap-2 items-start italic leading-tight">
                      <span className="text-oil-gold mt-1 shrink-0">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <div id={`news-footer-${index}`} className="flex justify-between items-center mt-3">
                  <span id={`news-time-${index}`} className="text-[10px] text-gray-600 font-mono">
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'RECENT'}
                  </span>
                  <a 
                    id={`news-link-${index}`}
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <ExternalLink id={`link-icon-${index}`} className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div id="news-timestamp-footer" className="p-2 bg-black/60 border-t border-white/5 text-center">
        <p id="footer-update-text" className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">
          Last Quantum Sync: {lastUpdated.toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};


