-- Adaptive drafts: the waiting room between agent ideas and X.
-- One row per proposed action, whatever the action is (post, reply, DM,
-- article, block, mute, follow...). The agent proposes, the user disposes:
-- only rows stamped 'approved' may ever be executed, verbatim.
-- Status flow: draft -> approved/rejected -> published/failed; anything can
-- end archived. Content + payload stay flexible so new action kinds need no
-- schema change — add the kind to the check, done.
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  run_id uuid references public.workflow_runs(id) on delete set null,
  kind text not null default 'post' check (kind in ('post', 'reply', 'repost', 'dm', 'article', 'block', 'mute', 'follow', 'like', 'bookmark')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'rejected', 'published', 'failed', 'archived')),
  content text not null default '' check (char_length(content) <= 10000),
  payload jsonb not null default '{}'::jsonb,
  agent_reasoning text not null default '' check (char_length(agent_reasoning) <= 4000),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists drafts_owner_id_created_at_idx on public.drafts (owner_id, created_at desc);
create index if not exists drafts_workflow_id_status_idx on public.drafts (workflow_id, status, created_at desc);
create index if not exists drafts_goal_id_status_idx on public.drafts (goal_id, status, created_at desc);
create index if not exists drafts_owner_id_status_idx on public.drafts (owner_id, status, created_at desc) where status = 'draft';

alter table public.drafts enable row level security;

revoke all on table public.drafts from anon, authenticated;
grant select, update, delete on table public.drafts to authenticated;
grant all on table public.drafts to service_role;

drop policy if exists "Users can read their own drafts" on public.drafts;
create policy "Users can read their own drafts"
  on public.drafts
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Owners review: edit the words, move the status. Routing columns
-- (owner/goal/workflow/run/kind) are immutable after insert — a draft can
-- never be retargeted at another goal, workflow, or action kind.
drop policy if exists "Users can review their own drafts" on public.drafts;
create policy "Users can review their own drafts"
  on public.drafts
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete their own drafts" on public.drafts;
create policy "Users can delete their own drafts"
  on public.drafts
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.prevent_draft_retarget()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Service-role agent path (insert + publish transitions) bypasses the guard.
  if coalesce((auth.jwt() ->> 'role'), current_user) = 'service_role' then
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'draft owner is immutable';
  end if;
  if new.goal_id is distinct from old.goal_id then
    raise exception 'draft goal is immutable';
  end if;
  if new.workflow_id is distinct from old.workflow_id then
    raise exception 'draft workflow is immutable';
  end if;
  if new.run_id is distinct from old.run_id then
    raise exception 'draft run is immutable';
  end if;
  if new.kind is distinct from old.kind then
    raise exception 'draft kind is immutable';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'draft timestamp is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_draft_update on public.drafts;
create trigger guard_draft_update
  before update on public.drafts
  for each row
  execute procedure public.prevent_draft_retarget();

drop trigger if exists set_drafts_updated_at on public.drafts;
create trigger set_drafts_updated_at
  before update on public.drafts
  for each row
  execute procedure public.set_updated_at();
