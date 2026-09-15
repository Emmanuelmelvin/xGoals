-- Stuck-run reaper: a workflow is blocked while it has a 'queued' or
-- 'running' workflow_runs row. If the agent crashes after claim_next_run()
-- (pod killed, SIGTERM, network drop) that row would stay 'running' forever
-- and the workflow would never be picked again.
--
-- This migration adds a reaper function and wires it into claim_next_run().
-- The reaper marks runs that have been 'running' longer than p_timeout
-- (default 10 minutes, configurable per-call) as 'failed' with a timeout
-- summary. It also backfills finished_at so Activity shows a closed run.
-- The dispatcher also gets a pg_cron-friendly entrypoint; in hosted
-- Supabase the cron is attached externally, but the function is callable
-- from code (poll loop, manual invoke) so dev without pg_cron still recovers.
--
-- No heartbeat column needed in v1 — started_at is the heartbeat. A future
-- `heartbeat_at` + explicit UPDATE from the runner can tighten the window
-- without changing this API.

-- Ensure started_at is indexed for the reaper scan
create index if not exists workflow_runs_status_started_at_idx
  on public.workflow_runs (status, started_at)
  where status in ('queued', 'running');

create or replace function public.reap_stale_runs(p_timeout interval default interval '10 minutes')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer := 0;
  v_timeout interval := coalesce(p_timeout, interval '10 minutes');
begin
  -- Only reap if timeout is sane (avoid accidental 0 => reap everything)
  if v_timeout < interval '1 minute' then
    v_timeout := interval '10 minutes';
  end if;

  update public.workflow_runs
     set status = 'failed',
         finished_at = timezone('utc', now()),
         error_message = coalesce(error_message, '') || case when coalesce(error_message, '') <> '' then ' | ' else '' end || 'Run timed out (no heartbeat for ' || v_timeout::text || '). Reaped by reap_stale_runs.',
         result_summary = case
           when coalesce(result_summary, '') = '' then 'Run timed out — reaped after ' || v_timeout::text || ' with no heartbeat. No drafts were finalized.'
           else result_summary
         end
   where status in ('queued', 'running')
     and started_at is not null
     and started_at < timezone('utc', now()) - v_timeout
     and finished_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.reap_stale_runs(interval) from public, anon, authenticated;
grant execute on function public.reap_stale_runs(interval) to agent_writer;
grant execute on function public.reap_stale_runs(interval) to service_role;

comment on function public.reap_stale_runs(interval) is
  'Marks workflow_runs stuck in queued/running longer than p_timeout (default 10m) as failed. Call from poll loop, claim_next_run, or pg_cron every minute.';

-- Patch claim_next_run to auto-reap before picking work so a stale run
-- never permanently blocks its workflow. The reap is cheap: an index scan
-- on (status, started_at) and usually 0 rows.
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
  -- Best-effort reap so crashed runs do not block their workflow forever.
  -- Ignore errors here — claiming work is more important than the reap.
  begin
    perform public.reap_stale_runs(interval '10 minutes');
  exception when others then
    -- swallow; claim can still proceed
    null;
  end;

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

-- Optional pg_cron wiring (uncomment when pg_cron is enabled on hosted project):
-- select cron.schedule('reap-stale-runs', '* * * * *', $$select public.reap_stale_runs(interval '10 minutes')$$);
