// A cbBTC race bot for make.fun's btc-race.
//
// The window is one pool's mid price, sampled every two seconds and cut into one-minute bars whose
// open, close, high and low are medians and extremes.
//
// Two measurements on the dev window decided the whole design, and both are worth stating because
// they are the reason this bot looks so simple:
//
//   1. A round trip is expensive. 4 bps of fee twice, 2 bps of slippage twice, and the
//      constant-product impact of the order itself against a pool roughly 0.9M USDC deep put a
//      1,000 USDC round trip at about 34 bps. A 50 USDC round trip costs about 13 bps. Size is the
//      single biggest lever on cost, and the pool is thin enough that a position-sized order earns a
//      real impact.
//   2. The window drifts up. Over its 1,440 bars the close rises about 3.6%, and the bars split 779
//      up against 648 down. A sharp fall does not reliably reverse: after a 20 bps down bar the next
//      bar averages -8.5 bps, and after 30 bps it averages -15. The downside has no bounce worth
//      trading against a 34 bps round trip.
//
// So every strategy that turns the position over gives its edge to the pool. I measured four of
// them on this kit, all through the grader's own fills and integer arithmetic: a dip-buying ladder
// (+33.2 USDC), a running-mean satellite around a core (+27.2), a satellite with four swept
// entry/exit pairs (a plateau at +27.6), and a core/satellite pair swept over core weight and
// satellite size (+32.2 at core 100%). The best of them barely beat doing nothing, and the fully
// invested hold was equal to or better than all of them. The cliff sits exactly where the round trip
// stops paying: a move smaller than 34 bps cannot fund the trade that captures it.
//
// This bot is therefore the one thing the measurements supported: buy once, at the start, with
// everything, and hold. The harness's end-of-window flatten closes the position, so the whole entry
// costs one round trip, and the position earns the window's drift with no churn of its own. The
// order goes out on the first bar the window lets us trade, priced off that bar's close, and the
// bot then does nothing at all.
//
// Integer arithmetic only, bar time only, no clock, no randomness: the two graded runs agree byte
// for byte.

import { runBars, type BarsState, type Bar, type Order } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

/** The whole account is committed on the first tradable bar: the measurements say the drift, not the
 *  trading, is what pays, and anything left in cash simply misses it. */
const DEPLOY_BPS = 10_000;

/** Orders may fill up to this far past the close they were decided on. The pool is thin, so a
 *  position-sized order earns a real impact; the cap only turns a liquidity gap into a refused order
 *  instead of a fill at any price. */
const MAX_SLIPPAGE_BPS = 500;

/** A buy worth less than this is refused by the market. */
const MIN_NOTIONAL = 1_000_000n;

/** True once the position has been bought. The fills the harness reports set it, not this bot's own
 *  intent, so a rejected order is retried on the next bar instead of silently skipped. */
let deployed = false;

await runBars({
  onBatch(state: BarsState, batch) {
    const bar: Bar | undefined = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar === undefined) return [];

    // The harness reports what the previous reply's orders did. A filled buy is the only thing that
    // turns this bot off for the rest of the window.
    for (const f of batch.fills) {
      if (f.symbol !== SYMBOL) continue;
      if (f.side === 'buy' && f.status === 'filled') deployed = true;
    }
    if (deployed) return [];
    if (state.warmingUp) return [];

    const close = BigInt(bar.c);
    if (close <= 0n) return [];

    // Equity is not marked yet on the window's first bars, so size off cash there.
    const basis = state.equity > 0n ? state.equity : state.cash;
    const target = (basis * BigInt(DEPLOY_BPS)) / 10_000n;
    const spend = target < state.cash ? target : state.cash;
    if (spend < MIN_NOTIONAL) return [];

    return [
      { side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS } satisfies Order,
    ];
  },
});
