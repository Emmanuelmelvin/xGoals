-- In-app notifications, purely informational. The agent/service inserts rows
-- via service_role; users only read and mark read. Read state persists
-- server-side (read_at) so unread survives across devices. No email.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'info' check (kind in ('draft_ready', 'run_succeeded', 'run_failed', 'milestone', 'credits_low', 'workflow_completed', 'info')),
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 2000),
  link text check (link is null or (char_length(link) between 1 and 500 and link like '/%')),
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_owner_id_created_at_idx on public.notifications (owner_id, created_at desc);
create index if not exists notifications_owner_id_read_at_idx on public.notifications (owner_id, read_at) where read_at is null;

alter table public.notifications enable row level security;

revoke all on table public.notifications from anon, authenticated;
grant select, update, delete on table public.notifications to authenticated;
grant all on table public.notifications to service_role;

drop policy if exists "Users can read their own notifications" on public.notifications;
create policy "Users can read their own notifications"
  on public.notifications
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Users can mark their own notifications read" on public.notifications;
create policy "Users can mark their own notifications read"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can delete their own notifications" on public.notifications;
create policy "Users can delete their own notifications"
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Guard: clients may only flip read_at (and delete via policy). Title, body,
-- kind, link, and ownership are immutable after insert — only the service
-- role (agent) creates content.
create or replace function public.prevent_notification_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce((auth.jwt() ->> 'role'), current_user) = 'service_role' then
    return new;
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'notification owner is immutable';
  end if;
  if new.kind is distinct from old.kind then
    raise exception 'notification kind is immutable';
  end if;
  if new.title is distinct from old.title then
    raise exception 'notification title is immutable';
  end if;
  if new.body is distinct from old.body then
    raise exception 'notification body is immutable';
  end if;
  if new.link is distinct from old.link then
    raise exception 'notification link is immutable';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'notification timestamp is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_notification_update on public.notifications;
create trigger guard_notification_update
  before update on public.notifications
  for each row
  execute procedure public.prevent_notification_mutation();
