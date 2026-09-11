-- Goal-centric workflow data. Supabase Auth remains the source of identity.
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  prompt text,
  status text not null default 'draft' check (status in ('active', 'draft', 'paused', 'completed')),
  parent_goal_id uuid references public.goals(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.goal_permissions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  permission text not null,
  decision text not null default 'review' check (decision in ('allow', 'review', 'deny')),
  source text not null default 'user' check (source in ('user', 'ai', 'system')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (goal_id, permission)
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  status text not null default 'draft' check (status in ('draft', 'deployed', 'paused', 'completed')),
  definition jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists goals_owner_id_updated_at_idx on public.goals (owner_id, updated_at desc);
create index if not exists goal_permissions_goal_id_idx on public.goal_permissions (goal_id);
create index if not exists workflows_owner_id_updated_at_idx on public.workflows (owner_id, updated_at desc);
create index if not exists workflows_goal_id_idx on public.workflows (goal_id);
create index if not exists workflow_runs_workflow_id_idx on public.workflow_runs (workflow_id, created_at desc);

alter table public.goals enable row level security;
alter table public.goal_permissions enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;

revoke all on table public.goals from anon, authenticated;
revoke all on table public.goal_permissions from anon, authenticated;
revoke all on table public.workflows from anon, authenticated;
revoke all on table public.workflow_runs from anon, authenticated;

grant select, insert, update, delete on table public.goals to authenticated;
grant select, insert, update, delete on table public.goal_permissions to authenticated;
grant select, insert, update, delete on table public.workflows to authenticated;
grant select, insert, update, delete on table public.workflow_runs to authenticated;
grant all on table public.goals to service_role;
grant all on table public.goal_permissions to service_role;
grant all on table public.workflows to service_role;
grant all on table public.workflow_runs to service_role;

drop policy if exists "Users can manage their own goals" on public.goals;
create policy "Users can manage their own goals"
  on public.goals
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can manage their own goal permissions" on public.goal_permissions;
create policy "Users can manage their own goal permissions"
  on public.goal_permissions
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.goals
      where goals.id = goal_permissions.goal_id
        and goals.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can manage their own workflows" on public.workflows;
create policy "Users can manage their own workflows"
  on public.workflows
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.goals
      where goals.id = workflows.goal_id
        and goals.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can manage their own workflow runs" on public.workflow_runs;
create policy "Users can manage their own workflow runs"
  on public.workflow_runs
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.workflows
      where workflows.id = workflow_runs.workflow_id
        and workflows.owner_id = (select auth.uid())
    )
  );

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
  before update on public.goals
  for each row
  execute procedure public.set_updated_at();

drop trigger if exists set_goal_permissions_updated_at on public.goal_permissions;
create trigger set_goal_permissions_updated_at
  before update on public.goal_permissions
  for each row
  execute procedure public.set_updated_at();

drop trigger if exists set_workflows_updated_at on public.workflows;
create trigger set_workflows_updated_at
  before update on public.workflows
  for each row
  execute procedure public.set_updated_at();
