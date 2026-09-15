-- Owners must be able to update their own purchase intents: the checkout
-- flow stores the real Bachs checkout id on the row after session creation,
-- and marks failures. Without this, the id stays pending_* and fulfilment
-- can never match the webhook. Fulfilment itself stays service_role-only.
grant update on table public.credit_purchases to authenticated;

drop policy if exists "Users can update their own credit purchases" on public.credit_purchases;
create policy "Users can update their own credit purchases"
  on public.credit_purchases
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
