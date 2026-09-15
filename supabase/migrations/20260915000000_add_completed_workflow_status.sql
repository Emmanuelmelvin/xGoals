-- Reintroduce "completed" as a terminal workflow status (a previous migration
-- normalized legacy "completed" rows to "stopped"). Finished runs are now
-- distinct from runs the user ended early, and the agent can flag a workflow
-- as completed once it has finished its task or run window.
alter table public.workflows drop constraint if exists workflows_status_check;
alter table public.workflows add constraint workflows_status_check check (status in ('running', 'paused', 'stopped', 'completed'));
