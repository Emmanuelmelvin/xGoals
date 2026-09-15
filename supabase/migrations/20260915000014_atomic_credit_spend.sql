-- Atomic credit spend: serialize per-owner balance checks so concurrent
-- runs cannot overspend. The ledger is append-only; balance is SUM(amount).
-- Without a lock two runs can both read balance=1 and both insert -1.
--
-- Fix: a SECURITY DEFINER function that takes an advisory transaction lock
-- on the owner id (hashtext(owner_id::text)). Concurrent spends for the same
-- owner serialize at this lock; spends for different owners run in parallel.
-- The function also enforces insufficient-funds and returns the new balance.
-- Python code should call this RPC instead of SELECT + INSERT separately.
-- Kept as a standalone function so it is testable and auditable, and so a
-- future DB trigger/constraint can also rely on it if needed.

create or replace function public.try_spend_credits(
  p_owner_id uuid,
  p_amount integer,
  p_event_id text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
  v_new_balance integer;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be a positive integer';
  end if;
  if p_owner_id is null then
    raise exception 'owner_id is required';
  end if;
  if p_event_id is null or char_length(trim(p_event_id)) = 0 then
    raise exception 'event_id is required';
  end if;

  -- Per-owner serialization. hashtext is stable; advisory lock is released
  -- automatically at end of transaction. No table row needed.
  perform pg_advisory_xact_lock(hashtext(p_owner_id::text));

  select coalesce(sum(amount), 0)::integer
    into v_balance
    from public.credit_ledger
   where owner_id = p_owner_id;

  if v_balance < p_amount then
    raise exception 'Insufficient credits (balance %, need %)', v_balance, p_amount;
  end if;

  insert into public.credit_ledger (owner_id, amount, kind, event_id, note)
  values (p_owner_id, -p_amount, 'spend', p_event_id, nullif(trim(p_note), ''));

  v_new_balance := v_balance - p_amount;
  return jsonb_build_object('spent', p_amount, 'balance', v_new_balance, 'previous_balance', v_balance);
exception
  when unique_violation then
    -- event_id collision (uuid hex should never collide; treat as idempotent)
    raise exception 'Duplicate spend event %', p_event_id;
end;
$$;

revoke all on function public.try_spend_credits(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.try_spend_credits(uuid, integer, text, text) to agent_writer;
grant execute on function public.try_spend_credits(uuid, integer, text, text) to service_role;

-- Helpful comment for introspection
comment on function public.try_spend_credits(uuid, integer, text, text) is
  'Atomic per-owner spend. Takes pg_advisory_xact_lock on owner_id, checks SUM(credit_ledger) >= p_amount, inserts spend row, returns balances. Call from log_credit_spend tool.';
