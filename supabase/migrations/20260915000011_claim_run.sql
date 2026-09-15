-- Atomic run claim for the dispatcher. One call does everything that must
-- happen together: pick the oldest due `running` workflow with no active run,
-- open its run row, and hand back the trusted job envelope.
--
-- Due means: status = 'running', no run currently queued/running, the
-- scheduled start (definition->>'starts_at') has passed, and the window has
-- not expired (definition->>'ends_at' is null or in the future).
--
-- SECURITY DEFINER (owner postgres) so it can read goals/goal_permissions
-- for context injection — agent_writer itself was deliberately granted no
-- access to those tables. EXECUTE is granted to agent_writer only (+
-- service_role for ops). Row scoping stays in the tools; this function only
-- ever returns ONE due job.
create or replace function public.claim_next_run(p_workflow_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_wf public.workflows%rowtype;
  v_goal public.goals%rowtype;
  v_run_id uuid;
  v_balance integer;
  v_permissions text[];
  v_starts_at timestamptz;
begin
  select *
    into v_wf
    from public.workflows as w
   where w.status = 'running'
     and (p_workflow_id is null or w.id = p_workflow_id)
     and not exists (
       select 1 from public.workflow_runs as r
       where r.workflow_id = w.id and r.status in ('queued', 'running')
     )
     and coalesce(nullif(w.definition ->> 'starts_at', '')::timestamptz, timezone('utc', now())) <= timezone('utc', now())
     and coalesce(nullif(w.definition ->> 'ends_at', '')::timestamptz, timezone('utc', now()) + interval '1 second') >= timezone('utc', now())
   order by w.updated_at asc
   limit 1
   for update skip locked;

  if not found then
    return null;
  end if;

  insert into public.workflow_runs (workflow_id, owner_id, status, started_at)
  values (v_wf.id, v_wf.owner_id, 'running', timezone('utc', now()))
  returning id into v_run_id;

  select * into v_goal from public.goals where id = v_wf.goal_id;

  select coalesce(array_agg(gp.permission order by gp.permission), '{}')
    into v_permissions
    from public.goal_permissions as gp
   where gp.goal_id = v_wf.goal_id and gp.decision = 'allow';

  select coalesce(sum(amount), 0)::integer into v_balance
    from public.credit_ledger where owner_id = v_wf.owner_id;

  v_starts_at := coalesce(nullif(v_wf.definition ->> 'starts_at', '')::timestamptz, timezone('utc', now()));

  return jsonb_build_object(
    'run_id', v_run_id,
    'owner_id', v_wf.owner_id,
    'goal_id', v_wf.goal_id,
    'workflow_id', v_wf.id,
    'goal_title', coalesce(v_goal.title, ''),
    'goal_prompt', coalesce(v_goal.prompt, ''),
    'skills', coalesce((v_wf.definition -> 'skills'), '[]'::jsonb),
    'permissions', to_jsonb(v_permissions),
    'balance', v_balance,
    'starts_at', v_starts_at
  );
end;
$$;

revoke all on function public.claim_next_run(uuid) from public, anon, authenticated;
grant execute on function public.claim_next_run(uuid) to agent_writer;
grant execute on function public.claim_next_run(uuid) to service_role;
