/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MEXC public market-data integration (no API key required).
 *
 * The browser connects straight to MEXC's public contract WebSocket, so it
 * works from the user's machine even when the server container's egress policy
 * blocks mexc.com. A REST helper is also exported for server-side polling,
 * which starts working the moment contract.mexc.com is allow-listed.
 *
 * Docs: https://mexcdevelop.github.io/apidocs/contract_v1_en/
 */

export const MEXC_WS_URL = 'wss://contract.mexc.com/edge';
export const MEXC_REST_BASE = 'https://contract.mexc.com/api/v1/contract';

/** MEXC perpetual contracts the desk offers (crypto — MEXC has no oil product). */
export const MEXC_SYMBOLS = [
  { symbol: 'BTC_USDT', label: 'BTC · Perp', base: 'BTC' },
  { symbol: 'ETH_USDT', label: 'ETH · Perp', base: 'ETH' },
  { symbol: 'SOL_USDT', label: 'SOL · Perp', base: 'SOL' },
  { symbol: 'DOGE_USDT', label: 'DOGE · Perp', base: 'DOGE' },
  { symbol: 'XRP_USDT', label: 'XRP · Perp', base: 'XRP' },
];

export function baseAsset(symbol: string): string {
  return symbol.split('_')[0] || symbol;
}

export interface MexcTicker {
  symbol: string;
  lastPrice: number;
  changeRate: number; // 24h change as a decimal (0.0123 = +1.23%)
  high24: number;
  low24: number;
  volume24: number;
  bid1: number;
  ask1: number;
}

export interface MexcDepth {
  asks: Array<[number, number]>; // [price, volume], ascending
  bids: Array<[number, number]>; // [price, volume], descending
}

export type FeedStatus = 'connecting' | 'live' | 'disconnected';

interface FeedHandlers {
  onTicker?: (t: MexcTicker) => void;
  onDepth?: (d: MexcDepth) => void;
  onStatus?: (s: FeedStatus) => void;
}

/**
 * Live MEXC contract feed over WebSocket. Subscribes to ticker + full depth
 * for a single symbol, keeps the connection alive, and auto-reconnects.
 */
export class MexcFeed {
  private ws: WebSocket | null = null;
  private symbol: string;
  private handlers: FeedHandlers;
  private pingTimer: number | null = null;
  private reconnectTimer: number | null = null;
  private closed = false;

  constructor(symbol: string, handlers: FeedHandlers) {
    this.symbol = symbol;
    this.handlers = handlers;
  }

  connect(): void {
    this.closed = false;
    this.open();
  }

  setSymbol(symbol: string): void {
    if (symbol === this.symbol) return;
    this.symbol = symbol;
    // Resubscribe on the existing socket if open, else it'll subscribe on open.
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscribe();
    }
  }

  close(): void {
    this.closed = true;
    this.clearTimers();
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
  }

  private open(): void {
    this.handlers.onStatus?.('connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(MEXC_WS_URL);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.subscribe();
      this.pingTimer = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: 'ping' }));
      }, 15000);
    };

    ws.onmessage = (ev) => this.handleMessage(ev.data);

    ws.onerror = () => { /* surfaced via onclose */ };

    ws.onclose = () => {
      this.clearTimers();
      this.handlers.onStatus?.('disconnected');
      if (!this.closed) this.scheduleReconnect();
    };
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ method: 'sub.ticker', param: { symbol: this.symbol } }));
    this.ws.send(JSON.stringify({ method: 'sub.depth.full', param: { symbol: this.symbol, limit: 10 } }));
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') return;
    let msg: any;
    try { msg = JSON.parse(raw); } catch { return; }

    const channel: string | undefined = msg.channel;
    if (!channel) return;

    // Confirmation that a subscription is active == feed is live.
    if (channel === 'rs.sub.ticker' || channel === 'push.ticker') {
      this.handlers.onStatus?.('live');
    }

    if (channel === 'push.ticker' && msg.data) {
      const d = msg.data;
      // Ignore stray ticks for a symbol we just switched away from.
      if (d.symbol && d.symbol !== this.symbol) return;
      this.handlers.onTicker?.({
        symbol: d.symbol,
        lastPrice: Number(d.lastPrice),
        changeRate: Number(d.riseFallRate ?? 0),
        high24: Number(d.high24Price ?? d.lastPrice),
        low24: Number(d.lower24Price ?? d.lastPrice),
        volume24: Number(d.volume24 ?? 0),
        bid1: Number(d.bid1 ?? d.lastPrice),
        ask1: Number(d.ask1 ?? d.lastPrice),
      });
    }

    if ((channel === 'push.depth.full' || channel === 'push.depth') && msg.data) {
      const d = msg.data;
      const toLevels = (arr: any): Array<[number, number]> =>
        Array.isArray(arr) ? arr.map((lv: any[]) => [Number(lv[0]), Number(lv[1])]) : [];
      this.handlers.onDepth?.({ asks: toLevels(d.asks), bids: toLevels(d.bids) });
    }
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer != null) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed) this.open();
    }, 3000);
  }

  private clearTimers(): void {
    if (this.pingTimer != null) { window.clearInterval(this.pingTimer); this.pingTimer = null; }
    if (this.reconnectTimer != null) { window.clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
  }
}

/**
 * Server-side REST ticker fetch. Returns null if MEXC is unreachable (e.g. the
 * container's egress policy denies contract.mexc.com) so callers can fall back.
 */
export async function fetchMexcTicker(symbol: string): Promise<MexcTicker | null> {
  try {
    const res = await fetch(`${MEXC_REST_BASE}/ticker?symbol=${encodeURIComponent(symbol)}`);
    if (!res.ok) return null;
    const json: any = await res.json();
    const d = json?.data;
    if (!d || typeof d.lastPrice === 'undefined') return null;
    return {
      symbol: d.symbol ?? symbol,
      lastPrice: Number(d.lastPrice),
      changeRate: Number(d.riseFallRate ?? 0),
      high24: Number(d.high24Price ?? d.lastPrice),
      low24: Number(d.lower24Price ?? d.lastPrice),
      volume24: Number(d.volume24 ?? 0),
      bid1: Number(d.bid1 ?? d.lastPrice),
      ask1: Number(d.ask1 ?? d.lastPrice),
    };
  } catch {
    return null;
  }
}
