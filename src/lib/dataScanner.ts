/**
 * Quantum Data Scanner Module
 * Handles real-time ingestion from financial and astrological sources.
 */

import { getPLANETARY_DATA } from './astrology.ts';
import { getDayNumerology } from './numerology.ts';

export interface FuturesContract {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface ScanResult {
  price: number;
  futures: FuturesContract[];
  rawPriceData: any;
  astrologicalResonance: any;
  numerology: any;
  timestamp: string;
}

export class QuantumDataScanner {
  private tradingViewUrls: string[];
  private astroSeekEndpoints: string[];
  private lastScanTime: number = 0;
  private lastResult: ScanResult | null = null;
  private readonly MIN_SCAN_INTERVAL = 10000; // 10 seconds safety

  constructor(config: { tvUrls?: string[]; astroEndpoints?: string[] } = {}) {
    this.tradingViewUrls = config.tvUrls || [];
    this.astroSeekEndpoints = config.astroEndpoints || [];
  }

  /**
   * Fetches data with exponential backoff for rate limits.
   */
  private async fetchSecure(url: string, retries = 3): Promise<any> {
    let delay = 1000;
    for (let i = 0; i < retries; i++) {
        try {
            // Alternate between query1 and query2
            const domain = i % 2 === 0 ? 'query1.finance.yahoo.com' : 'query2.finance.yahoo.com';
            const secureUrl = url.replace(/query[12]\.finance\.yahoo\.com/, domain);
            
            const response = await fetch(secureUrl, {
                headers: { 
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive'
                }
            });

            if (response.status === 429) {
                console.warn(`Rate limit hit on ${secureUrl}. Backing off ${delay}ms...`);
                await new Promise(r => setTimeout(r, delay));
                delay *= 2;
                continue;
            }

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Fetch failed: ${response.status} ${response.statusText}. Response: ${text.slice(0, 100)}`);
            }
            return await response.json();
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
  }

  /**
   * Main scan execution
   */
  async performScan(): Promise<ScanResult> {
    const now = Date.now();
    if (this.lastResult && (now - this.lastScanTime < this.MIN_SCAN_INTERVAL)) {
        return this.lastResult;
    }
    
    this.lastScanTime = now;

    const dateObj = new Date(now);

    // 1. Fetch Real-time Market Data (Price + Futures)
    let price = 85.00;
    let rawPriceData = null;
    let futures: FuturesContract[] = [];

    try {
        // Fetch specific WTI futures contracts: Front month, E-mini, Micro, and nearby months
        // Note: Symbols like CLM26.NYM depend on the current year.
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        const symbols = [`CL=F`, `QM=F`, `MCL=F`, `BZ=F` ];
        
        const data = await this.fetchSecure(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}`);
        
        if (data && data.quoteResponse && data.quoteResponse.result) {
            rawPriceData = data.quoteResponse.result;
            const mainQuote = rawPriceData.find((q: any) => q.symbol === 'CL=F');
            if (mainQuote) {
                price = mainQuote.regularMarketPrice;
            }

            futures = rawPriceData.map((q: any) => ({
                symbol: q.symbol,
                name: q.shortName || q.symbol,
                price: q.regularMarketPrice,
                change: q.regularMarketChange,
                changePercent: q.regularMarketChangePercent
            }));
        }
    } catch (err) {
        console.error("Market scan error:", err);
    }

    // 2. Fetch Astrological Data
    // We prioritize local Astronomy Engine for precision, but allow endpoint hooks.
    let astrologicalResonance = getPLANETARY_DATA(dateObj);
    if (this.astroSeekEndpoints.length > 0) {
        for (const endpoint of this.astroSeekEndpoints) {
            try {
                // Placeholder for actual AstroSeek REST integration if credentials provided
                // const externalAstro = await this.fetchSecure(endpoint);
                // astrologicalResonance = merge(astrologicalResonance, externalAstro);
            } catch (err) {
                console.warn(`Endpoint ${endpoint} failed, falling back to local Engine.`);
            }
        }
    }

    // 3. Numerology Processing
    const numerology = getDayNumerology(dateObj);

    const result: ScanResult = {
        price,
        futures,
        rawPriceData,
        astrologicalResonance,
        numerology,
        timestamp: dateObj.toISOString()
    };

    this.lastResult = result;
    return result;
  }
}

export const dataScanner = new QuantumDataScanner({
    tvUrls: ['https://www.tradingview.com/chart/USOIL/'],
    astroEndpoints: [] // Extensible for user-provided secrets
});
