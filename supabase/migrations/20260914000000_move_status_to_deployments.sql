-- Status now lives on deployments (workflows), not goals.
alter table public.goals drop column if exists status;

-- Normalize existing deployments to the running/paused/stopped lifecycle,
-- then enforce it.
update public.workflows set status = case status
  when 'deployed' then 'running'
  when 'completed' then 'stopped'
  when 'draft' then 'stopped'
  else status
end
where status not in ('running', 'paused', 'stopped');

alter table public.workflows alter column status set default 'running';
alter table public.workflows drop constraint if exists workflows_status_check;
alter table public.workflows add constraint workflows_status_check check (status in ('running', 'paused', 'stopped'));
