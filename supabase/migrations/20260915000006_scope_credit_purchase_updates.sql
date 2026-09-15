-- Scope credit purchase updates: owners may only link the real Bachs
-- checkout id and mark failures while the intent is still open.
-- Amounts, credits, and ownership are immutable after insert.
drop policy if exists "Users can update their own credit purchases" on public.credit_purchases;

create policy "Users can link their own open credit purchases"
  on public.credit_purchases
  for update
  to authenticated
  using ((select auth.uid()) = owner_id and status = 'open')
  with check ((select auth.uid()) = owner_id and status in ('open', 'failed'));

create or replace function public.prevent_credit_purchase_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Service-role fulfilment (Bachs webhook) bypasses the client guard.
  if coalesce((auth.jwt() ->> 'role'), current_user) = 'service_role' then
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'credit purchase owner is immutable';
  end if;
  if new.usd_amount is distinct from old.usd_amount then
    raise exception 'credit purchase amount is immutable';
  end if;
  if new.credits is distinct from old.credits then
    raise exception 'credit purchase credits are immutable';
  end if;
  if old.status <> 'open' then
    raise exception 'only open credit purchases can be updated';
  end if;
  if new.status not in ('open', 'failed') then
    raise exception 'credit purchases can only move to failed from the client';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_credit_purchase_update on public.credit_purchases;
create trigger guard_credit_purchase_update
  before update on public.credit_purchases
  for each row
  execute procedure public.prevent_credit_purchase_mutation();
