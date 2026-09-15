-- Public goals: discoverable by anyone, forkable/runnable by signed-in users.
-- Workflows stay private: only the workflow owner can ever read them.
alter table public.goals
  add column if not exists visibility text not null default 'private'
  check (visibility in ('private', 'public'));

create index if not exists goals_visibility_updated_at_idx
  on public.goals (visibility, updated_at desc);

grant select on table public.goals to anon;
grant select on table public.goal_permissions to anon;
grant select on table public.profiles to anon;

-- Anyone, signed in or not, can read public goals.
drop policy if exists "Public goals are readable by everyone" on public.goals;
create policy "Public goals are readable by everyone"
  on public.goals
  for select
  to anon, authenticated
  using (visibility = 'public');

-- Signed-in users can deploy private workflows from public goals they don't own.
drop policy if exists "Users can deploy workflows from public goals" on public.workflows;
create policy "Users can deploy workflows from public goals"
  on public.workflows
  for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.goals
      where goals.id = workflows.goal_id
        and goals.visibility = 'public'
    )
  );

-- Permission scope names of public goals are readable by everyone, so a
-- public goal can be forked with its permission starting point intact.
drop policy if exists "Permissions of public goals are readable by everyone" on public.goal_permissions;
create policy "Permissions of public goals are readable by everyone"
  on public.goal_permissions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.goals
      where goals.id = goal_permissions.goal_id
        and goals.visibility = 'public'
    )
  );

-- Public identity for attribution on discovery pages (display name, X
-- handle, avatar — already public X identity, never credentials).
drop policy if exists "Profiles are readable by everyone" on public.profiles;
create policy "Profiles are readable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);
