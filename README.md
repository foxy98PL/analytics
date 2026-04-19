This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase integration (burn storage + global stats + leaderboard)

1. Create a Supabase project.
2. Open SQL Editor and run [supabase/schema.sql](supabase/schema.sql).
3. Add environment variables to your local .env:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ALCHEMY_API_KEY=...
MORALIS_API_KEY=...

# Optional explicit RPC URLs (if you do not want to derive from ALCHEMY_API_KEY)
ALCHEMY_RPC_URL_ETH=...
ALCHEMY_RPC_URL_OPTIMISM=...
ALCHEMY_RPC_URL_POLYGON=...
ALCHEMY_RPC_URL_BASE=...
PULSE_RPC_URL=...

# Optional Moralis pair overrides per chain (defaults to configured pair)
MORALIS_PAIR_OPTIMISM=...
MORALIS_PAIR_BASE=...
MORALIS_PAIR_PULSE=...
```

4. Run the updated SQL from `supabase/schema.sql`.

When configured, `/api/wallet-burns` (with `chain` query/body) will:
- persist wallet burn data,
- update stored data only if total burned XEN increased,
- return global stats and leaderboard data.

`/api/raw-stats` returns chain-level raw totals (XEN, USD, tx, wallets).

## Token history storage

Local development stores chain price history in `data/token-history-<chain>.json` fallback files.

Primary cache is now Supabase table `token_daily_prices` (per chain, per day), which reduces repeated Alchemy requests.

Historical price providers:
- ETH + Polygon: Alchemy historical API
- Optimism + Base + Pulse: Moralis OHLCV (`close` as daily price), with cursor pagination and limit 1000 per page

If history already exists, refresh starts from the last stored UTC day instead of refetching the full range.

On Vercel, the app automatically uses `/tmp/token-history.json` as an ephemeral runtime cache because the deployment filesystem is not writable. You can override the location with:

```env
TOKEN_HISTORY_STORE_PATH=...
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
