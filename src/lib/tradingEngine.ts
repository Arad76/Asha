/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trading Engine — isolated-margin perpetual futures math.
 * Pure functions so they can be unit-checked and reused by the UI and backend.
 */

export type Side = 'long' | 'short';

/** Maintenance margin rate (fraction of notional kept as the liquidation buffer). */
export const MAINTENANCE_MARGIN_RATE = 0.005;
/** Taker fee rate applied to notional on market open/close. */
export const TAKER_FEE_RATE = 0.0002;
/** Hard cap on leverage offered by the desk. */
export const MAX_LEVERAGE = 120;

export interface Position {
  side: Side;
  entry: number;      // entry mark price (USD / bbl)
  margin: number;     // isolated margin posted (USDT)
  leverage: number;
  sizeBbl: number;    // position size in barrels
  notional: number;   // margin * leverage (USDT)
  liq: number;        // liquidation price
  openFee: number;    // taker fee paid to open
}

/** Barrels controlled by `margin` at `leverage` when the mark is `price`. */
export function positionSize(margin: number, leverage: number, price: number): number {
  if (price <= 0) return 0;
  return (margin * leverage) / price;
}

/**
 * Isolated-margin liquidation price. The trader is liquidated once unrealised
 * loss consumes the margin down to the maintenance buffer, i.e. a price move of
 * (1/leverage - maintenanceRate) against the entry.
 */
export function liquidationPrice(entry: number, leverage: number, side: Side): number {
  let distance = (1 / leverage) - MAINTENANCE_MARGIN_RATE;
  if (distance < 0.0005) distance = 0.0005; // floor so ultra-high lev still renders
  return side === 'long' ? entry * (1 - distance) : entry * (1 + distance);
}

/** Unrealised PnL in USDT for an open position at the current mark. */
export function unrealisedPnl(entry: number, mark: number, sizeBbl: number, side: Side): number {
  const direction = side === 'long' ? 1 : -1;
  return (mark - entry) * direction * sizeBbl;
}

/** Return on equity (PnL as a % of posted margin). */
export function returnOnEquity(pnl: number, margin: number): number {
  if (margin <= 0) return 0;
  return (pnl / margin) * 100;
}

/** Distance from current mark to liquidation, as a percentage of mark. */
export function distanceToLiq(mark: number, liq: number): number {
  if (mark <= 0) return 0;
  return (Math.abs(mark - liq) / mark) * 100;
}

/** True when the mark has crossed the liquidation threshold for the side. */
export function isLiquidated(mark: number, position: Position): boolean {
  return position.side === 'long' ? mark <= position.liq : mark >= position.liq;
}

/** Build a fully-resolved Position from the trade ticket inputs. */
export function openPosition(
  side: Side,
  margin: number,
  leverage: number,
  mark: number,
): Position {
  const notional = margin * leverage;
  return {
    side,
    entry: mark,
    margin,
    leverage,
    sizeBbl: positionSize(margin, leverage, mark),
    notional,
    liq: liquidationPrice(mark, leverage, side),
    openFee: notional * TAKER_FEE_RATE,
  };
}
