/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TradingTerminal — 120x isolated-margin perpetual terminal wired to MEXC.
 *
 * Primary feed: MEXC public contract WebSocket (ticker + full depth), connected
 * directly from the browser so it works regardless of the server's egress
 * policy. Fallbacks, in order: the server `price-tick` socket, then a local
 * random walk, so the desk is never frozen. Runs the full position lifecycle:
 * sizing, liquidation price, fees, live PnL/ROE and auto-liquidation.
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { Gauge, TrendingUp, TrendingDown, Crosshair, Flame, X, Wifi, WifiOff } from 'lucide-react';
import {
  Side,
  Position,
  openPosition,
  liquidationPrice,
  positionSize,
  unrealisedPnl,
  returnOnEquity,
  distanceToLiq,
  isLiquidated,
  MAX_LEVERAGE,
  TAKER_FEE_RATE,
} from '../lib/tradingEngine';
import {
  MexcFeed,
  MexcTicker,
  MexcDepth,
  FeedStatus,
  MEXC_SYMBOLS,
  baseAsset,
} from '../lib/mexc';

const START_BALANCE = 10000;

interface BookRow { price: number; size: number; total: number; }

/** Synthetic book used only until / unless the real MEXC depth arrives. */
function syntheticBook(mid: number): { asks: BookRow[]; bids: BookRow[]; max: number } {
  const step = mid * 0.0001;
  const asks: BookRow[] = [];
  const bids: BookRow[] = [];
  let totA = 0; let totB = 0;
  for (let i = 8; i >= 1; i--) { const s = Math.round(30 + Math.random() * 900); totA += s; asks.push({ price: mid + i * step, size: s, total: totA }); }
  for (let k = 1; k <= 8; k++) { const s = Math.round(30 + Math.random() * 900); totB += s; bids.push({ price: mid - k * step, size: s, total: totB }); }
  return { asks, bids, max: Math.max(totA, totB) };
}

/** Convert a MEXC depth snapshot into cumulative-total book rows. */
function bookFromDepth(d: MexcDepth): { asks: BookRow[]; bids: BookRow[]; max: number } {
  const asksAsc = d.asks.slice(0, 8);
  const bids = d.bids.slice(0, 8);
  let totA = 0; let totB = 0;
  // Asks displayed high→low, but cumulative totals grow from the mid outward.
  const asksRows: BookRow[] = asksAsc.map(([price, size]) => { totA += size; return { price, size, total: totA }; });
  const bidsRows: BookRow[] = bids.map(([price, size]) => { totB += size; return { price, size, total: totB }; });
  asksRows.reverse(); // show furthest ask on top
  return { asks: asksRows, bids: bidsRows, max: Math.max(totA, totB) || 1 };
}

function priceDecimals(p: number): number {
  if (p >= 1000) return 1;
  if (p >= 100) return 2;
  if (p >= 1) return 3;
  return 5;
}

export function TradingTerminal() {
  const [symbol, setSymbol] = useState('BTC_USDT');
  const [mark, setMark] = useState(0);
  const [prevMark, setPrevMark] = useState(0);
  const [status, setStatus] = useState<FeedStatus>('connecting');
  const [ticker, setTicker] = useState<MexcTicker | null>(null);
  const [depth, setDepth] = useState<MexcDepth | null>(null);

  const [side, setSide] = useState<Side>('long');
  const [margin, setMargin] = useState(500);
  const [leverage, setLeverage] = useState(MAX_LEVERAGE);
  const [balance, setBalance] = useState(START_BALANCE);
  const [position, setPosition] = useState<Position | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'good' | 'bad' | 'liq' } | null>(null);
  const [synthBook, setSynthBook] = useState(() => syntheticBook(100));

  const markRef = useRef(mark);
  const positionRef = useRef<Position | null>(null);
  const statusRef = useRef<FeedStatus>('connecting');
  const feedRef = useRef<MexcFeed | null>(null);
  const lastServerTickAt = useRef(0);
  markRef.current = mark;
  positionRef.current = position;
  statusRef.current = status;

  const base = baseAsset(symbol);
  const dp = priceDecimals(mark || ticker?.lastPrice || 1);
  const fmtP = useCallback((n: number) => n.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }), [dp]);
  const fmtU = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const flash = useCallback((msg: string, tone: 'good' | 'bad' | 'liq') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 3400);
  }, []);

  const setMarkChecked = useCallback((next: number) => {
    setMark((prev) => { setPrevMark(prev); return next; });
  }, []);

  const closePosition = useCallback((liquidated: boolean) => {
    const pos = positionRef.current;
    if (!pos) return;
    const m = markRef.current;
    if (liquidated) {
      setBalance((b) => b - pos.margin);
      flash(`LIQUIDATED — margin lost ${fmtU(pos.margin)} USDT`, 'liq');
    } else {
      const pnl = unrealisedPnl(pos.entry, m, pos.sizeBbl, pos.side);
      setBalance((b) => b + pnl - pos.openFee);
      flash(`Closed ${pos.side.toUpperCase()} · PnL ${pnl >= 0 ? '+' : ''}${fmtU(pnl)} USDT`, pnl >= 0 ? 'good' : 'bad');
    }
    setPosition(null);
  }, [flash]);

  // ---- MEXC live feed (direct from browser) ----
  useEffect(() => {
    const feed = new MexcFeed(symbol, {
      onStatus: setStatus,
      onTicker: (t) => { setTicker(t); setMarkChecked(t.lastPrice); },
      onDepth: (d) => setDepth(d),
    });
    feedRef.current = feed;
    feed.connect();
    return () => { feed.close(); feedRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch MEXC subscription when the symbol changes.
  useEffect(() => {
    setTicker(null);
    setDepth(null);
    setPosition(null); // positions are per-instrument; closing avoids cross-symbol liquidation
    feedRef.current?.setSymbol(symbol);
  }, [symbol]);

  // ---- Fallback feed: server socket + local walk, used only when MEXC isn't live ----
  useEffect(() => {
    const socket: Socket = io(window.location.origin);
    const onServerPrice = (d: { price?: number }) => {
      if (statusRef.current === 'live') return; // MEXC wins
      if (typeof d.price !== 'number') return;
      lastServerTickAt.current = Date.now();
      setMarkChecked(d.price);
    };
    socket.on('price-tick', onServerPrice);
    socket.on('market-update', onServerPrice);

    const walk = window.setInterval(() => {
      if (statusRef.current === 'live') return;
      if (Date.now() - lastServerTickAt.current < 2500) return;
      setMark((prev) => {
        setPrevMark(prev);
        const seed = prev || 100;
        const z = (Math.random() + Math.random() + Math.random() - 1.5) * 1.1;
        return Math.max(0.0001, seed * (1 + 0.0015 * z));
      });
    }, 900);

    // Seed an initial price so the desk shows something before MEXC connects.
    if (mark === 0) setMark(symbol === 'BTC_USDT' ? 64000 : 100);

    return () => { socket.disconnect(); window.clearInterval(walk); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to each mark change: refresh synthetic book + liquidation check.
  useEffect(() => {
    if (status !== 'live' && mark > 0) setSynthBook(syntheticBook(mark));
    const pos = positionRef.current;
    if (pos && mark > 0 && isLiquidated(mark, pos)) closePosition(true);
  }, [mark, status, closePosition]);

  const book = useMemo(() => (depth && depth.asks.length ? bookFromDepth(depth) : synthBook), [depth, synthBook]);

  const onOpen = () => {
    if (position || mark <= 0) return;
    if (margin > balance) { flash(`Insufficient margin — max ${fmtU(balance)} USDT`, 'bad'); return; }
    if (margin < 1) { flash('Minimum margin is 1 USDT', 'bad'); return; }
    const pos = openPosition(side, margin, leverage, mark);
    setPosition(pos);
    flash(`${side.toUpperCase()} ${pos.sizeBbl.toFixed(4)} ${base} @ ${fmtP(pos.entry)} · ${leverage}x`, 'good');
  };

  const previewNotional = margin * leverage;
  const previewSize = positionSize(margin, leverage, mark);
  const previewLiq = liquidationPrice(mark, leverage, side);
  const previewDist = distanceToLiq(mark, previewLiq);
  const previewFee = previewNotional * TAKER_FEE_RATE;

  const livePnl = position ? unrealisedPnl(position.entry, mark, position.sizeBbl, position.side) : 0;
  const liveRoe = position ? returnOnEquity(livePnl, position.margin) : 0;
  const liveDist = position ? distanceToLiq(mark, position.liq) : 0;

  const up = ticker ? ticker.changeRate >= 0 : mark >= prevMark;
  const changePct = ticker ? ticker.changeRate * 100 : 0;

  const statusBadge = status === 'live'
    ? { text: 'MEXC LIVE', cls: 'bg-green-500/15 text-green-400 border-green-500/40', icon: <Wifi size={9} /> }
    : status === 'connecting'
      ? { text: 'MEXC · LINKING', cls: 'bg-oil-amber/15 text-oil-amber border-oil-amber/40', icon: <Wifi size={9} className="animate-pulse" /> }
      : { text: 'SIM FALLBACK', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/40', icon: <WifiOff size={9} /> };

  return (
    <div className="flex flex-col bg-oil-black border border-oil-gold/30 rounded-lg overflow-hidden relative">
      {/* Header */}
      <div className="bg-oil-dim border-b border-oil-border px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Gauge size={15} className="text-oil-gold shrink-0" />
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="bg-black/60 border border-oil-border rounded px-1.5 py-1 text-[11px] font-mono text-white uppercase tracking-wider outline-none focus:border-oil-gold cursor-pointer"
            aria-label="MEXC contract"
          >
            {MEXC_SYMBOLS.map((s) => (
              <option key={s.symbol} value={s.symbol}>{s.symbol}</option>
            ))}
          </select>
          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border tracking-widest flex items-center gap-1 shrink-0 ${statusBadge.cls}`}>
            {statusBadge.icon}{statusBadge.text}
          </span>
        </div>
        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-oil-gold/15 text-oil-gold tracking-widest shrink-0">120×</span>
      </div>

      {/* Mark + 24h */}
      <div className="px-3 py-2 border-b border-white/5 flex items-end justify-between">
        <div className="flex flex-col leading-none">
          <span className={`font-mono text-lg font-bold tabular-nums ${up ? 'text-green-400' : 'text-red-400'}`}>
            {mark > 0 ? fmtP(mark) : '—'}
          </span>
          <span className="text-[8px] text-gray-500 font-mono uppercase tracking-widest mt-0.5">Mark · {base}/USDT</span>
        </div>
        {ticker && (
          <div className="flex flex-col items-end leading-tight font-mono">
            <span className={`text-xs font-bold tabular-nums ${up ? 'text-green-400' : 'text-red-400'}`}>
              {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
            </span>
            <span className="text-[8px] text-gray-500 tabular-nums">H {fmtP(ticker.high24)} · L {fmtP(ticker.low24)}</span>
          </div>
        )}
      </div>

      {/* Order book */}
      <div className="px-3 py-2 border-b border-white/5">
        <div className="grid grid-cols-3 text-[8px] font-mono uppercase tracking-widest text-gray-600 mb-1">
          <span>Price</span><span className="text-right">Size</span><span className="text-right">Total</span>
        </div>
        <div className="flex flex-col">
          {book.asks.map((r, i) => (
            <div key={`a${i}`} className="relative grid grid-cols-3 text-[10px] font-mono tabular-nums py-[1px]">
              <div className="absolute inset-y-0 right-0 bg-red-500/10" style={{ width: `${(r.total / book.max) * 100}%` }} />
              <span className="relative text-red-400">{fmtP(r.price)}</span>
              <span className="relative text-right text-gray-400">{r.size}</span>
              <span className="relative text-right text-gray-500">{(r.total / 1000).toFixed(2)}k</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between py-1.5 my-1 border-y border-white/5 bg-oil-gold/[0.03] px-1">
          <span className={`font-mono text-sm font-bold tabular-nums ${up ? 'text-green-400' : 'text-red-400'}`}>{mark > 0 ? fmtP(mark) : '—'}</span>
          <span className="font-mono text-[9px] text-gray-600">{status === 'live' ? 'MEXC depth' : 'sim depth'}</span>
        </div>
        <div className="flex flex-col">
          {book.bids.map((r, i) => (
            <div key={`b${i}`} className="relative grid grid-cols-3 text-[10px] font-mono tabular-nums py-[1px]">
              <div className="absolute inset-y-0 right-0 bg-green-500/10" style={{ width: `${(r.total / book.max) * 100}%` }} />
              <span className="relative text-green-400">{fmtP(r.price)}</span>
              <span className="relative text-right text-gray-400">{r.size}</span>
              <span className="relative text-right text-gray-500">{(r.total / 1000).toFixed(2)}k</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trade ticket */}
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide('long')}
            className={`py-2 rounded-md font-mono text-xs font-bold tracking-wider border transition-all ${
              side === 'long' ? 'bg-green-500/15 border-green-500 text-green-400' : 'border-oil-border text-gray-500 hover:border-gray-400'
            }`}
          >
            <TrendingUp size={12} className="inline mr-1" />LONG
          </button>
          <button
            onClick={() => setSide('short')}
            className={`py-2 rounded-md font-mono text-xs font-bold tracking-wider border transition-all ${
              side === 'short' ? 'bg-red-500/15 border-red-500 text-red-400' : 'border-oil-border text-gray-500 hover:border-gray-400'
            }`}
          >
            <TrendingDown size={12} className="inline mr-1" />SHORT
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-gray-500">
            <span>Margin</span>
            <span className="text-gray-400">Avail {fmtU(balance)} USDT</span>
          </div>
          <div className="flex items-center border border-oil-border rounded-md bg-black/60 focus-within:border-oil-gold">
            <input
              type="number"
              value={margin}
              min={1}
              step={10}
              onChange={(e) => setMargin(Math.max(0, parseFloat(e.target.value) || 0))}
              className="flex-1 bg-transparent px-3 py-2 text-white font-mono text-sm tabular-nums outline-none min-w-0"
              aria-label="Margin in USDT"
            />
            <span className="px-3 text-[10px] font-mono text-gray-600">USDT</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500">Leverage</span>
            <span className={`font-mono text-lg font-bold ${leverage >= 100 ? 'text-oil-amber' : 'text-oil-gold'}`}>{leverage}×</span>
          </div>
          <input
            type="range"
            min={1}
            max={MAX_LEVERAGE}
            value={leverage}
            onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
            className="w-full accent-oil-gold"
            aria-label="Leverage"
          />
          <div className="flex justify-between text-[8px] font-mono text-gray-600">
            <span>1×</span><span>25×</span><span>50×</span><span>75×</span><span>100×</span><span>120×</span>
          </div>
        </div>

        <div className="rounded-md border border-white/5 overflow-hidden divide-y divide-white/5">
          {[
            ['Position Size', `${previewSize.toFixed(4)} ${base}`, 'text-white'],
            ['Notional', `${fmtU(previewNotional)} USDT`, 'text-white'],
            ['Est. Entry', mark > 0 ? fmtP(mark) : '—', 'text-white'],
            ['Liq. Price', mark > 0 ? fmtP(previewLiq) : '—', 'text-oil-amber'],
            ['Dist. to Liq', `${previewDist.toFixed(2)}%`, 'text-oil-amber'],
            ['Open Fee', `${fmtU(previewFee)} USDT`, 'text-white'],
          ].map(([k, v, c]) => (
            <div key={k} className="flex justify-between px-3 py-1.5 bg-black/40 text-[11px] font-mono">
              <span className="text-gray-500">{k}</span>
              <span className={`tabular-nums ${c}`}>{v}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onOpen}
          disabled={!!position || mark <= 0}
          className={`w-full py-3 rounded-md font-mono text-sm font-bold tracking-widest transition-all active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${
            side === 'long' ? 'bg-gradient-to-b from-green-400 to-green-600 text-black' : 'bg-gradient-to-b from-red-400 to-red-600 text-black'
          }`}
        >
          {position ? 'POSITION OPEN' : `OPEN ${side.toUpperCase()} · ${leverage}×`}
        </button>
      </div>

      {/* Open position */}
      {position && (
        <div className="m-3 mt-0 rounded-lg border border-oil-border overflow-hidden bg-gradient-to-b from-white/[0.04] to-transparent">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
            <span className={`font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded ${position.side === 'long' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
              {position.side.toUpperCase()} · {base}
            </span>
            <span className="font-mono text-[10px] text-oil-gold flex items-center gap-1">
              {position.leverage >= 100 && <Flame size={10} className="text-oil-amber" />}
              {position.leverage}× ISOLATED
            </span>
          </div>
          <div className="px-3 py-3 text-center border-b border-white/5">
            <div className={`font-mono text-2xl font-bold tabular-nums ${livePnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {livePnl >= 0 ? '+' : ''}{fmtU(livePnl)} <span className="text-xs text-gray-500">USDT</span>
            </div>
            <div className={`font-mono text-xs tabular-nums ${liveRoe >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {liveRoe >= 0 ? '+' : ''}{liveRoe.toFixed(2)}% ROE
            </div>
          </div>
          <div className="grid grid-cols-2 text-[10px] font-mono">
            {[
              ['Entry', fmtP(position.entry), 'text-white'],
              ['Mark', fmtP(mark), 'text-white'],
              ['Size', `${position.sizeBbl.toFixed(4)} ${base}`, 'text-white'],
              ['Margin', fmtU(position.margin), 'text-white'],
              ['Liq. Price', fmtP(position.liq), 'text-oil-amber'],
              ['Dist. to Liq', `${liveDist.toFixed(2)}%`, liveDist < 0.2 ? 'text-red-400' : 'text-white'],
            ].map(([k, v, c], i) => (
              <div key={k} className={`px-3 py-2 border-white/5 ${i % 2 === 0 ? 'border-r' : ''} border-b`}>
                <div className="text-[8px] text-gray-600 uppercase tracking-widest">{k}</div>
                <div className={`tabular-nums mt-0.5 ${c}`}>{v}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => closePosition(false)}
            className="w-full py-2.5 font-mono text-[11px] tracking-widest text-gray-300 bg-white/5 hover:bg-red-500/15 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5"
          >
            <Crosshair size={11} /> CLOSE POSITION · MARKET
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 bottom-3 z-20 px-4 py-2 rounded-md font-mono text-[11px] border shadow-xl ${
            toast.tone === 'liq' ? 'bg-oil-dim border-oil-amber text-oil-amber'
              : toast.tone === 'good' ? 'bg-oil-dim border-green-500/50 text-green-400'
                : 'bg-oil-dim border-red-500/50 text-red-400'
          }`}
        >
          <X size={10} className="inline mr-1 opacity-50" />{toast.msg}
        </div>
      )}
    </div>
  );
}

export default TradingTerminal;
