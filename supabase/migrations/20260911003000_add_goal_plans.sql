-- Store the reviewed AI plan so goal creation can be separated from workflow execution.
alter table public.goals
  add column if not exists plan jsonb not null default '{}'::jsonb;

alter table public.goal_permissions
  add column if not exists reason text not null default '';

create index if not exists goals_plan_gin_idx on public.goals using gin (plan);
