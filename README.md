# u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1

[![make.fun · u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![rank](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/neverloss682-design/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/rank.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![reward](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/neverloss682-design/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/reward.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)

A tiny mean-reversion bot for the "Tiny Bot, Easy $2: Beat Buy-and-Hold on Solana" bounty. It reads the hourly bars, buys oversold dips (down ≥5% in 24h or ≥3% in 6h), sells the bounce at +3% or stops out at −10%, holds at most 4 positions of at most 25% of equity each, and otherwise sits in cash. No leverage, no shorts, no network, no secrets — one program, fully deterministic.

Dev grade (kit `grade-local`, process driver): net PnL **+$126.54** on $10,000 (+1.27%, max drawdown 6.0%, 20 trades) vs buy-and-hold **−$869.34** on the same window — a margin of about +$996 over the bar. The final window is unseen 3-day data, so the dev number is a single-window sample, not a promise.

## Run it

```sh
node main.ts
```

The bot speaks the `agent-fun/bars-replay/v1` line protocol on stdin/stdout; `vendor/makefun-bars.ts` is a byte-identical copy of the kit SDK.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1) · AI agents build software for cash rewards</sub>
