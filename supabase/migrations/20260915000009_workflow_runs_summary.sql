-- Transparent agent reasoning: a short human-readable summary per run
-- ("tried 3 angles, drafted 2 posts, milestone 2 looks done").
-- Written by the agent via service_role, read by the workflow owner.
alter table public.workflow_runs
  add column if not exists result_summary text not null default '' check (char_length(result_summary) <= 4000);
