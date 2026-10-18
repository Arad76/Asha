/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TradingTerminal — 120x isolated-margin perpetual terminal for WTI/USOIL.
 * Drives off the server's live `price-tick` feed (falls back to a local
 * random walk if the socket is quiet) and runs the full position lifecycle:
 * sizing, liquidation price, fees, live PnL/ROE and auto-liquidation.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Gauge, TrendingUp, TrendingDown, Crosshair, Flame, X } from 'lucide-react';
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

const START_BALANCE = 10000;

interface BookRow { price: number; size: number; total: number; }

function buildBook(mid: number): { asks: BookRow[]; bids: BookRow[]; max: number } {
  const asks: BookRow[] = [];
  const bids: BookRow[] = [];
  let totA = 0;
  let totB = 0;
  for (let i = 8; i >= 1; i--) {
    const size = Math.round(30 + Math.random() * 900);
    totA += size;
    asks.push({ price: mid + i * 0.01 + Math.random() * 0.004, size, total: totA });
  }
  for (let k = 1; k <= 8; k++) {
    const size = Math.round(30 + Math.random() * 900);
    totB += size;
    bids.push({ price: mid - k * 0.01 - Math.random() * 0.004, size, total: totB });
  }
  return { asks, bids, max: Math.max(totA, totB) };
}

const fmt = (n: number, d = 2) =>
  n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export function TradingTerminal() {
  const [mark, setMark] = useState(85.0);
  const [prevMark, setPrevMark] = useState(85.0);
  const [side, setSide] = useState<Side>('long');
  const [margin, setMargin] = useState(500);
  const [leverage, setLeverage] = useState(MAX_LEVERAGE);
  const [balance, setBalance] = useState(START_BALANCE);
  const [position, setPosition] = useState<Position | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: 'good' | 'bad' | 'liq' } | null>(null);
  const [book, setBook] = useState(() => buildBook(85));

  const markRef = useRef(mark);
  const positionRef = useRef<Position | null>(null);
  const lastTickAt = useRef(Date.now());
  markRef.current = mark;
  positionRef.current = position;

  const flash = useCallback((msg: string, tone: 'good' | 'bad' | 'liq') => {
    setToast({ msg, tone });
    window.setTimeout(() => setToast(null), 3400);
  }, []);

  const closePosition = useCallback((liquidated: boolean) => {
    const pos = positionRef.current;
    if (!pos) return;
    const m = markRef.current;
    if (liquidated) {
      setBalance((b) => b - pos.margin);
      flash(`LIQUIDATED — margin lost ${fmt(pos.margin)} USDT`, 'liq');
    } else {
      const pnl = unrealisedPnl(pos.entry, m, pos.sizeBbl, pos.side);
      setBalance((b) => b + pnl - pos.openFee);
      flash(`Closed ${pos.side.toUpperCase()} · PnL ${pnl >= 0 ? '+' : ''}${fmt(pnl)} USDT`, pnl >= 0 ? 'good' : 'bad');
    }
    setPosition(null);
  }, [flash]);

  // Live price feed: subscribe to the server tick, walk locally if it goes quiet.
  useEffect(() => {
    const socket: Socket = io(window.location.origin);
    const onTick = (data: { price: number }) => {
      if (typeof data.price !== 'number') return;
      lastTickAt.current = Date.now();
      setMark((prev) => { setPrevMark(prev); return data.price; });
    };
    socket.on('price-tick', onTick);
    socket.on('market-update', (d: { price?: number }) => { if (typeof d.price === 'number') onTick({ price: d.price }); });

    fetch('/api/quote')
      .then((r) => r.json())
      .then((d) => { if (d?.price) setMark(d.price); })
      .catch(() => {});

    // Fallback walk so the terminal is never frozen if the socket is idle.
    const walk = window.setInterval(() => {
      if (Date.now() - lastTickAt.current < 2500) return;
      setMark((prev) => {
        setPrevMark(prev);
        const z = (Math.random() + Math.random() + Math.random() - 1.5) * 1.1;
        const next = Math.max(55, prev * (1 + 0.0015 * z));
        return next;
      });
    }, 900);

    return () => { socket.disconnect(); window.clearInterval(walk); };
  }, []);

  // React to every mark change: refresh book + check liquidation.
  useEffect(() => {
    setBook(buildBook(mark));
    const pos = positionRef.current;
    if (pos && isLiquidated(mark, pos)) closePosition(true);
  }, [mark, closePosition]);

  const onOpen = () => {
    if (position) return;
    if (margin > balance) { flash(`Insufficient margin — max ${fmt(balance)} USDT`, 'bad'); return; }
    if (margin < 1) { flash('Minimum margin is 1 USDT', 'bad'); return; }
    const pos = openPosition(side, margin, leverage, mark);
    setPosition(pos);
    flash(`${side.toUpperCase()} ${fmt(pos.sizeBbl)} bbl @ ${fmt(pos.entry)} · ${leverage}x`, 'good');
  };

  // Preview numbers for the open ticket (no position yet).
  const previewNotional = margin * leverage;
  const previewSize = positionSize(margin, leverage, mark);
  const previewLiq = liquidationPrice(mark, leverage, side);
  const previewDist = distanceToLiq(mark, previewLiq);
  const previewFee = previewNotional * TAKER_FEE_RATE;

  const livePnl = position ? unrealisedPnl(position.entry, mark, position.sizeBbl, position.side) : 0;
  const liveRoe = position ? returnOnEquity(livePnl, position.margin) : 0;
  const liveDist = position ? distanceToLiq(mark, position.liq) : 0;

  const up = mark >= prevMark;

  return (
    <div className="flex flex-col bg-oil-black border border-oil-gold/30 rounded-lg overflow-hidden relative">
      {/* Header */}
      <div className="bg-oil-dim border-b border-oil-border px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-oil-gold">
          <Gauge size={15} />
          <span className="font-mono text-[11px] uppercase tracking-widest">USOIL · Perp</span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-oil-gold/15 text-oil-gold tracking-widest">120× ISOLATED</span>
        </div>
        <div className="flex flex-col items-end leading-none">
          <span className={`font-mono text-base font-bold tabular-nums ${up ? 'text-green-400' : 'text-red-400'}`}>
            {fmt(mark)}
          </span>
          <span className="text-[8px] text-gray-500 font-mono uppercase tracking-widest">Mark Price</span>
        </div>
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
              <span className="relative text-red-400">{fmt(r.price)}</span>
              <span className="relative text-right text-gray-400">{r.size}</span>
              <span className="relative text-right text-gray-500">{(r.total / 1000).toFixed(2)}k</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between py-1.5 my-1 border-y border-white/5 bg-oil-gold/[0.03] px-1">
          <span className={`font-mono text-sm font-bold tabular-nums ${up ? 'text-green-400' : 'text-red-400'}`}>{fmt(mark)}</span>
          <span className="font-mono text-[9px] text-gray-600">spread 0.02</span>
        </div>
        <div className="flex flex-col">
          {book.bids.map((r, i) => (
            <div key={`b${i}`} className="relative grid grid-cols-3 text-[10px] font-mono tabular-nums py-[1px]">
              <div className="absolute inset-y-0 right-0 bg-green-500/10" style={{ width: `${(r.total / book.max) * 100}%` }} />
              <span className="relative text-green-400">{fmt(r.price)}</span>
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
            <span className="text-gray-400">Avail {fmt(balance)} USDT</span>
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

        {/* Ticket quote */}
        <div className="rounded-md border border-white/5 overflow-hidden divide-y divide-white/5">
          {[
            ['Position Size', `${fmt(previewSize)} bbl`, 'text-white'],
            ['Notional', `${fmt(previewNotional)} USDT`, 'text-white'],
            ['Est. Entry', fmt(mark), 'text-white'],
            ['Liq. Price', fmt(previewLiq), 'text-oil-amber'],
            ['Dist. to Liq', `${previewDist.toFixed(2)}%`, 'text-oil-amber'],
            ['Open Fee', `${fmt(previewFee)} USDT`, 'text-white'],
          ].map(([k, v, c]) => (
            <div key={k} className="flex justify-between px-3 py-1.5 bg-black/40 text-[11px] font-mono">
              <span className="text-gray-500">{k}</span>
              <span className={`tabular-nums ${c}`}>{v}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onOpen}
          disabled={!!position}
          className={`w-full py-3 rounded-md font-mono text-sm font-bold tracking-widest transition-all active:translate-y-px disabled:opacity-40 disabled:cursor-not-allowed ${
            side === 'long'
              ? 'bg-gradient-to-b from-green-400 to-green-600 text-black'
              : 'bg-gradient-to-b from-red-400 to-red-600 text-black'
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
              {position.side.toUpperCase()}
            </span>
            <span className="font-mono text-[10px] text-oil-gold flex items-center gap-1">
              {position.leverage >= 100 && <Flame size={10} className="text-oil-amber" />}
              {position.leverage}× ISOLATED
            </span>
          </div>
          <div className="px-3 py-3 text-center border-b border-white/5">
            <div className={`font-mono text-2xl font-bold tabular-nums ${livePnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {livePnl >= 0 ? '+' : ''}{fmt(livePnl)} <span className="text-xs text-gray-500">USDT</span>
            </div>
            <div className={`font-mono text-xs tabular-nums ${liveRoe >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {liveRoe >= 0 ? '+' : ''}{liveRoe.toFixed(2)}% ROE
            </div>
          </div>
          <div className="grid grid-cols-2 text-[10px] font-mono">
            {[
              ['Entry', fmt(position.entry), 'text-white'],
              ['Mark', fmt(mark), 'text-white'],
              ['Size', `${fmt(position.sizeBbl)} bbl`, 'text-white'],
              ['Margin', fmt(position.margin), 'text-white'],
              ['Liq. Price', fmt(position.liq), 'text-oil-amber'],
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
            toast.tone === 'liq'
              ? 'bg-oil-dim border-oil-amber text-oil-amber'
              : toast.tone === 'good'
                ? 'bg-oil-dim border-green-500/50 text-green-400'
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
