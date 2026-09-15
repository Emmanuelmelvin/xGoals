-- agent_writer: the agent loop's ID badge. Least privilege, exactly 5 tables
-- (+ EXECUTE on try_spend_credits / reap_stale_runs / claim_next_run).
--
-- HOW THE AGENT CONNECTS (IaC, not manual)
--   This role is NOLOGIN in SQL. Login is enabled by infrastructure code
--   (CDK/Terraform): a Secrets Manager secret `agent_writer/password` with a
--   30-day rotation Lambda that does both UpdateSecret and
--   ALTER ROLE agent_writer WITH PASSWORD '<new>' atomically. The IaC (not a
--   hand-run psql) declares the secret, rotation schedule, and execution-role
--   permissions; `cdk deploy` / `terraform apply` wires it. The agent connects
--   direct-Postgres (psycopg) as agent_writer via AGENT_DATABASE_URL from the
--   secret. The Supabase service key stays break-glass admin only and never
--   enters the agent loop. Service connections may also `SET ROLE agent_writer`
--   (granted below) for local testing without a password.
--
-- WHAT IT CAN TOUCH (and nothing else)
--   drafts         SELECT, INSERT, UPDATE (status, error_message)
--                    Propose drafts, mark publish outcomes. Never retargets
--                    (guard trigger), never edits user words.
--   notifications  SELECT, INSERT
--                    Tell the user things. Never marks read (users do that).
--   workflow_runs  SELECT, INSERT, UPDATE (status, started_at, finished_at,
--                    error_message, result_summary)
--                    Full run lifecycle, nothing else on the row.
--   workflows      SELECT, UPDATE (status, definition)
--                    Check off milestones, pause/complete. Never renames,
--                    never repoints goal/owner.
--   credit_ledger  SELECT, INSERT
--                    Balance checks + spend rows. Ledger is append-only for
--                    everyone: no UPDATE or DELETE, ever.
--
-- ROW SCOPING
--   Grants narrow tables/columns/operations. Row scoping (this owner's rows
--   only) lives in the tool code: every tool takes owner/workflow IDs from
--   the trusted job payload — never from the model — and filters by them.
--   The RLS policies below are therefore permissive for this role; the
--   grants are the walls, the tools are the doors.
--   Context the agent only reads (goal prompt, skills, permission grants)
--   is injected into the job payload by the dispatcher — agent_writer gets
--   no access to goals or goal_permissions at all.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'agent_writer') then
    create role agent_writer nologin;
  end if;
end
$$;

grant connect on database postgres to agent_writer;
grant usage on schema public to agent_writer;

-- Start closed, then open exactly what is listed above. Idempotent.
revoke all on table public.drafts from agent_writer;
revoke all on table public.notifications from agent_writer;
revoke all on table public.workflow_runs from agent_writer;
revoke all on table public.workflows from agent_writer;
revoke all on table public.credit_ledger from agent_writer;
revoke all on table public.goals from agent_writer;
revoke all on table public.goal_permissions from agent_writer;
revoke all on table public.credit_purchases from agent_writer;

grant select, insert on table public.notifications to agent_writer;
grant select, insert on table public.credit_ledger to agent_writer;
grant select, insert on table public.drafts to agent_writer;
grant update (status, error_message) on table public.drafts to agent_writer;
grant select, insert on table public.workflow_runs to agent_writer;
grant update (status, started_at, finished_at, error_message, result_summary) on table public.workflow_runs to agent_writer;
grant select on table public.workflows to agent_writer;
grant update (status, definition) on table public.workflows to agent_writer;

-- RLS policies for the role. Grants above are the enforcement; these let
-- the role through RLS (which is enabled on all five tables) so the grants
-- decide what succeeds. No policies on goals / goal_permissions /
-- credit_purchases / profiles: agent_writer cannot read them at all.
drop policy if exists "agent_writer can read drafts" on public.drafts;
create policy "agent_writer can read drafts"
  on public.drafts for select to agent_writer using (true);

drop policy if exists "agent_writer can insert drafts" on public.drafts;
create policy "agent_writer can insert drafts"
  on public.drafts for insert to agent_writer with check (true);

drop policy if exists "agent_writer can update drafts" on public.drafts;
create policy "agent_writer can update drafts"
  on public.drafts for update to agent_writer using (true) with check (true);

drop policy if exists "agent_writer can read notifications" on public.notifications;
create policy "agent_writer can read notifications"
  on public.notifications for select to agent_writer using (true);

drop policy if exists "agent_writer can insert notifications" on public.notifications;
create policy "agent_writer can insert notifications"
  on public.notifications for insert to agent_writer with check (true);

drop policy if exists "agent_writer can read workflow runs" on public.workflow_runs;
create policy "agent_writer can read workflow runs"
  on public.workflow_runs for select to agent_writer using (true);

drop policy if exists "agent_writer can insert workflow runs" on public.workflow_runs;
create policy "agent_writer can insert workflow runs"
  on public.workflow_runs for insert to agent_writer with check (true);

drop policy if exists "agent_writer can update workflow runs" on public.workflow_runs;
create policy "agent_writer can update workflow runs"
  on public.workflow_runs for update to agent_writer using (true) with check (true);

drop policy if exists "agent_writer can read workflows" on public.workflows;
create policy "agent_writer can read workflows"
  on public.workflows for select to agent_writer using (true);

drop policy if exists "agent_writer can update workflows" on public.workflows;
create policy "agent_writer can update workflows"
  on public.workflows for update to agent_writer using (true) with check (true);

drop policy if exists "agent_writer can read credit ledger" on public.credit_ledger;
create policy "agent_writer can read credit ledger"
  on public.credit_ledger for select to agent_writer using (true);

drop policy if exists "agent_writer can insert credit ledger" on public.credit_ledger;
create policy "agent_writer can insert credit ledger"
  on public.credit_ledger for insert to agent_writer with check (true);

-- Allow service connections to assume the badge for local testing.
grant agent_writer to service_role;
