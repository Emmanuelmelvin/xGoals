-- Credit ledger for Bachs-powered top-ups. Supabase Auth remains the source of identity.
-- Balances are derived (sum of the ledger). Bachs webhooks are the source of
-- truth for purchases: fulfilment inserts into the ledger, deduped by event id.

create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  checkout_id text not null unique,
  usd_amount text not null check (usd_amount ~ '^[0-9]+\.[0-9]{2}$'),
  credits integer not null check (credits > 0),
  status text not null default 'open' check (status in ('open', 'completed', 'expired', 'failed', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  kind text not null default 'purchase' check (kind in ('purchase', 'spend', 'adjustment')),
  checkout_id text,
  event_id text unique,
  usd_amount text,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists credit_purchases_owner_id_created_at_idx on public.credit_purchases (owner_id, created_at desc);
create index if not exists credit_purchases_checkout_id_idx on public.credit_purchases (checkout_id);
create index if not exists credit_ledger_owner_id_created_at_idx on public.credit_ledger (owner_id, created_at desc);
create index if not exists credit_ledger_event_id_idx on public.credit_ledger (event_id);

alter table public.credit_purchases enable row level security;
alter table public.credit_ledger enable row level security;

revoke all on table public.credit_purchases from anon, authenticated;
revoke all on table public.credit_ledger from anon, authenticated;

-- Users read their own rows. Purchase intents are inserted server-side as the
-- signed-in user; fulfilment itself runs as service_role (webhooks are unsigned).
grant select on table public.credit_purchases to authenticated;
grant select on table public.credit_ledger to authenticated;
grant insert on table public.credit_purchases to authenticated;
grant all on table public.credit_purchases to service_role;
grant all on table public.credit_ledger to service_role;

drop policy if exists "Users can read their own credit purchases" on public.credit_purchases;
create policy "Users can read their own credit purchases"
  on public.credit_purchases
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can open their own credit purchases" on public.credit_purchases;
create policy "Users can open their own credit purchases"
  on public.credit_purchases
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can read their own credit ledger" on public.credit_ledger;
create policy "Users can read their own credit ledger"
  on public.credit_ledger
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop trigger if exists set_credit_purchases_updated_at on public.credit_purchases;
create trigger set_credit_purchases_updated_at
  before update on public.credit_purchases
  for each row
  execute procedure public.set_updated_at();
