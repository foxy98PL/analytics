create extension if not exists pgcrypto;

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_refreshed_at timestamptz,
  constraint wallets_address_chk check (wallet_address ~* '^0x[a-f0-9]{40}$')
);

create table if not exists public.wallet_burn_transactions (
  id bigserial primary key,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  chain_key text not null default 'eth',
  tx_hash text not null,
  occurred_at timestamptz not null,
  block_num bigint,
  xen_amount numeric(38,18) not null,
  usd_value numeric(38,18) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint burns_hash_chk check (tx_hash ~* '^0x[a-f0-9]{64}$')
);

create table if not exists public.wallet_daily_burns (
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  chain_key text not null default 'eth',
  day_utc date not null,
  burned_xen numeric(38,18) not null default 0,
  burned_usd numeric(38,18) not null default 0,
  tx_count integer not null default 0,
  first_tx_at timestamptz,
  last_tx_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(wallet_id, chain_key, day_utc)
);

create table if not exists public.wallet_totals (
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  chain_key text not null default 'eth',
  total_burned_xen numeric(38,18) not null default 0,
  total_burned_usd numeric(38,18) not null default 0,
  total_tx_count bigint not null default 0,
  first_burn_at timestamptz,
  last_burn_at timestamptz,
  refreshed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(wallet_id, chain_key)
);

create table if not exists public.token_daily_prices (
  chain_key text not null,
  token_address text not null,
  day_utc date not null,
  price_usd numeric(38,18) not null,
  source text not null default 'alchemy',
  refreshed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(chain_key, day_utc)
);

alter table public.wallet_burn_transactions add column if not exists chain_key text not null default 'eth';
alter table public.wallet_daily_burns add column if not exists chain_key text not null default 'eth';
alter table public.wallet_totals add column if not exists chain_key text not null default 'eth';

-- Upgrade legacy PKs from single-chain schema to multichain schema.
alter table public.wallet_daily_burns drop constraint if exists wallet_daily_burns_pkey;
alter table public.wallet_daily_burns
  add constraint wallet_daily_burns_pkey primary key (wallet_id, chain_key, day_utc);

alter table public.wallet_totals drop constraint if exists wallet_totals_pkey;
alter table public.wallet_totals
  add constraint wallet_totals_pkey primary key (wallet_id, chain_key);

drop index if exists ux_wallet_burn_event;
create unique index if not exists ux_wallet_burn_event
  on public.wallet_burn_transactions(wallet_id, chain_key, tx_hash, occurred_at, xen_amount);

drop index if exists ix_wallet_burn_transactions_wallet_time;
create index if not exists ix_wallet_burn_transactions_wallet_time
  on public.wallet_burn_transactions(wallet_id, chain_key, occurred_at desc);

create index if not exists ix_wallet_totals_chain
  on public.wallet_totals(chain_key, total_burned_usd desc);

create unique index if not exists ux_wallet_totals_wallet_chain
  on public.wallet_totals(wallet_id, chain_key);

create unique index if not exists ux_wallet_daily_wallet_chain_day
  on public.wallet_daily_burns(wallet_id, chain_key, day_utc);

create index if not exists ix_token_daily_prices_chain_day
  on public.token_daily_prices(chain_key, day_utc desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wallets_touch on public.wallets;
create trigger trg_wallets_touch
before update on public.wallets
for each row execute function public.touch_updated_at();

drop trigger if exists trg_wallet_burns_touch on public.wallet_burn_transactions;
create trigger trg_wallet_burns_touch
before update on public.wallet_burn_transactions
for each row execute function public.touch_updated_at();

drop trigger if exists trg_wallet_daily_touch on public.wallet_daily_burns;
create trigger trg_wallet_daily_touch
before update on public.wallet_daily_burns
for each row execute function public.touch_updated_at();

drop trigger if exists trg_wallet_totals_touch on public.wallet_totals;
create trigger trg_wallet_totals_touch
before update on public.wallet_totals
for each row execute function public.touch_updated_at();

drop trigger if exists trg_token_daily_prices_touch on public.token_daily_prices;
create trigger trg_token_daily_prices_touch
before update on public.token_daily_prices
for each row execute function public.touch_updated_at();

drop view if exists public.v_global_burn_stats;
create view public.v_global_burn_stats as
select
  chain_key,
  coalesce(sum(total_burned_xen), 0) as global_burned_xen,
  coalesce(sum(total_burned_usd), 0) as global_burned_usd,
  coalesce(sum(total_tx_count), 0) as global_tx_count,
  count(*) as wallets_count
from public.wallet_totals
group by chain_key;

drop view if exists public.v_wallet_leaderboard;
create view public.v_wallet_leaderboard as
select
  t.chain_key,
  w.wallet_address,
  t.total_burned_xen,
  t.total_burned_usd,
  t.total_tx_count,
  dense_rank() over(partition by t.chain_key order by t.total_burned_usd desc) as rank_usd
from public.wallet_totals t
join public.wallets w on w.id = t.wallet_id
where w.is_active = true;
