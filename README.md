# btc-race-bot-0511

[![make.fun · btc-race-24h-20261123-0511](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![rank](https://make.fun/badge/btc-race-24h-20261123-0511/fikri92/btc-race-bot-0511/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)
[![reward](https://make.fun/badge/btc-race-24h-20261123-0511/fikri92/btc-race-bot-0511/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261123-0511)

A maker bot for the make.fun **btc-race-24h-20261123-0511** competition: it trades cbBTC against
USDC on Orca's Whirlpool, long only, one position, no leverage.

Entry for [make.fun](https://make.fun/bounty/btc-race-24h-20261123-0511).

## What it does

Buys the whole account on the window's first tradable bar and holds. The harness's end-of-window
flatten closes the position, so the entry costs exactly one round trip.

## Why it is that simple

Two facts about the window, measured rather than assumed:

1. **A round trip costs about 34 bps at full size.** 4 bps fee twice, 2 bps slippage twice, and the
   constant-product impact of the order against a pool about 0.9M USDC deep. At 50 USDC the same
   round trip costs about 13 bps, so size dominates cost.
2. **The window drifts up about 3.6%**, and its bars split 779 up against 648 down. A sharp fall
   does not reliably reverse: after a 20 bps down bar the next bar averages −8.5 bps, after 30 bps it
   averages −15. There is no downside bounce worth buying against a 34 bps round trip.

Four trading variants were graded on the kit with the grader's own fills:

| Variant | Net PnL | Trades |
|---|---|---|
| Dip-buying ladder | +33.2 USDC | 3 |
| Running-mean satellite around a core | +27.2 USDC | 7 |
| Satellite, 16 swept entry/exit pairs | +27.6 USDC (plateau) | 5–7 |
| Core/satellite swept over weights | +32.2 USDC at core 100% | 1 |
| **Deploy all, hold (this entry)** | **+32.2 USDC** | **1** |

The cliff sits where the round trip stops paying. A move smaller than 34 bps cannot fund the trade
that captures it, so churn hands its edge to the pool.

## Result

Graded on the dev window with `makefun grade-local`, two executions, byte-identical action logs:

- net PnL **+32.167313 USDC** (return 3.2167313%)
- max drawdown **1.9778%** (guardrail ≤ 25%)
- exposure 99.93%, sharpe 0.027358, 0 rejected orders
- fees 0.813 USDC; at 2× fees still +31.34 USDC
- guardrails: `trades ok, symbols ok, drawdown ok`

## Layout

```
main.ts               the bot, one file, integer arithmetic only
vendor/makefun-bars.ts the kit's harness shim, unmodified
```

## Running it

```bash
makefun grade-local --kit <kit-dir> --bot . --driver process
```

Integer arithmetic only, bar time only, no clock, no randomness: the two graded runs agree byte for
byte.

## License

MIT
