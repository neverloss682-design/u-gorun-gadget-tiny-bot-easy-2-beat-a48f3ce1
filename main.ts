// Tiny dip bot — beat buy-and-hold on Solana (bars-replay/v1).
//
// Idea (mean reversion, not momentum): on the dev window every symbol's
// 12h/24h momentum autocorrelates NEGATIVELY (mean about -0.2 at 12h,
// -0.5 at 24h) — sharp hourly drops bounce, sharp rises fade. Plain
// EMA trend-following loses on the same window (-$375..-$513 in our
// offline sim) while dip-buying is positive on both halves of it.
// So this bot buys oversold dips and sells the bounce, and otherwise
// sits in cash. No leverage, no shorts, no all-in: at most 4 holdings,
// each at most 25% of equity (the harness weight cap), a +3% take-profit
// and a -10% stop-loss per position. Fees are ~10bps + ~5bps slippage +
// pool impact, so it only trades on real dips, never on noise.
//
//   - Entry: a symbol's close is down >= 5% vs 24 bars ago, or down
//     >= 3% vs 6 bars ago. Deepest dip first, up to 4 holdings.
//   - Exit: the whole position when it is worth >= 103% of its cost
//     (take the bounce) or <= 90% of its cost (stop-loss).
//   - Sizing: equity / 4 per buy, capped by the 25% weight cap and by
//     the cash left in this reply. A sell's proceeds never fund a buy
//     of the same reply (the harness settles them at the next open).
//   - Deterministic: float64 closes only, no clock, no randomness, so
//     the two grading runs produce identical action logs.
//
// Laid out like an entrant's repository: the grader runs
// `node /bot/main.ts` with this directory mounted at /bot;
// vendor/makefun-bars.ts is a byte-identical copy of the kit SDK.

import { BPS, runBars, type BarsState, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const MAX_HOLD = 4;
/** 24h dip that triggers a buy: close down 5% vs 24 bars ago. */
const DIP_24_BARS = 24;
const DIP_24_BPS = -500;
/** 6h dip that triggers a buy: close down 3% vs 6 bars ago. */
const DIP_6_BARS = 6;
const DIP_6_BPS = -300;
/** Take the bounce: worth 103% of cost. */
const TAKE_NUM = 103n;
const TAKE_DEN = 100n;
/** Stop-loss: worth 90% of cost. */
const STOP_NUM = 90n;
const STOP_DEN = 100n;
const MAX_SLIPPAGE_BPS = 100;

/** Closes seen per symbol, oldest first (a gap adds nothing). */
const closes = new Map<string, number[]>();

/** Return in bps of the latest close vs `bars` closes ago, or null. */
function retBps(symbol: string, bars: number): number | null {
  const h = closes.get(symbol);
  if (h === undefined || h.length <= bars) return null;
  const now = h[h.length - 1];
  const then = h[h.length - 1 - bars];
  if (then === 0) return null;
  // Floor (not trunc): a -5.01% move must count as <= -500bps, not -499.
  return Math.floor(((now - then) / then) * 10000);
}

/** The dip score of a symbol: its most negative triggering return, or null. */
function dipScore(symbol: string): number | null {
  const r24 = retBps(symbol, DIP_24_BARS);
  const r6 = retBps(symbol, DIP_6_BARS);
  let score: number | null = null;
  if (r24 !== null && r24 <= DIP_24_BPS) score = r24;
  if (r6 !== null && r6 <= DIP_6_BPS) score = score === null ? r6 : Math.min(score, r6);
  return score;
}

await runBars({
  onBatch(state: BarsState, batch) {
    const fresh = new Set<string>();
    for (const bar of batch.bars) {
      let h = closes.get(bar.symbol);
      if (h === undefined) {
        h = [];
        closes.set(bar.symbol, h);
      }
      h.push(Number(bar.c));
      fresh.add(bar.symbol);
    }
    // While warming up every order would be rejected (warmup): wait.
    if (state.warmingUp) return [];

    const { caps, fees } = state.hello;
    const sells: SellInput[] = [];
    for (const [symbol, held] of state.positions) {
      const value = state.value(symbol, held.qty);
      if (value * TAKE_DEN >= held.cost * TAKE_NUM || value * STOP_DEN <= held.cost * STOP_NUM) {
        sells.push({ side: 'sell', symbol, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
      }
    }

    const cands: { symbol: string; score: number }[] = [];
    for (const { symbol } of state.hello.symbols) {
      if (!fresh.has(symbol) || state.positions.has(symbol)) continue;
      const score = dipScore(symbol);
      if (score !== null) cands.push({ symbol, score });
    }
    // Deepest dip first; ties break by symbol so the order is deterministic.
    cands.sort((a, b) => (a.score - b.score) || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0));

    const orders: (SellInput | BuyInput)[] = sells.slice(0, caps.max_orders_per_bar);
    const room = MAX_HOLD - (state.positions.size - sells.length);
    const stake = state.equity / BigInt(MAX_HOLD);
    const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
    let cash = state.cash;
    let bought = 0;
    for (const { symbol } of cands) {
      if (bought >= room || orders.length >= caps.max_orders_per_bar) break;
      let slice = stake < byWeight ? stake : byWeight;
      const wr = state.weightRoom(symbol);
      if (slice > wr) slice = wr;
      if (cash < slice) slice = cash;
      if (slice === 0n || slice < BigInt(fees.min_notional_quote_units)) break;
      orders.push({ side: 'buy', symbol, notional_quote_units: slice, max_slippage_bps: MAX_SLIPPAGE_BPS });
      cash -= slice;
      bought++;
    }
    return orders;
  },
});
