-- Branches can never be public: only top-level goals are discoverable.
-- Fold any existing public branches back to private, then enforce the rule
-- for every insert and update.
update public.goals
  set visibility = 'private'
  where visibility = 'public'
    and parent_goal_id is not null;

drop policy if exists "Users can manage their own goals" on public.goals;
create policy "Users can manage their own goals"
  on public.goals
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and (visibility = 'private' or parent_goal_id is null)
  );
