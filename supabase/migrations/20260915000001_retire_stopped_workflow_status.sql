-- "stopped" is retired: a workflow is running, paused, or has completed its
-- task. Fold legacy stopped rows into completed (both terminal, both
-- re-runnable), then enforce the new lifecycle.
update public.workflows set status = 'completed' where status = 'stopped';

alter table public.workflows drop constraint if exists workflows_status_check;
alter table public.workflows add constraint workflows_status_check check (status in ('running', 'paused', 'completed'));
