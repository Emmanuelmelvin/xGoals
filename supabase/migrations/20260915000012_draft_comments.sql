-- Owner discussion on drafts. The agent never writes here — review is human.
create table if not exists public.draft_comments (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.drafts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists draft_comments_draft_id_created_at_idx on public.draft_comments (draft_id, created_at asc);

alter table public.draft_comments enable row level security;

revoke all on table public.draft_comments from anon, authenticated;
grant select, insert, update, delete on table public.draft_comments to authenticated;
grant all on table public.draft_comments to service_role;

drop policy if exists "Users can manage their own draft comments" on public.draft_comments;
create policy "Users can manage their own draft comments"
  on public.draft_comments
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1
      from public.drafts
      where drafts.id = draft_comments.draft_id
        and drafts.owner_id = (select auth.uid())
    )
  );

drop trigger if exists set_draft_comments_updated_at on public.draft_comments;
create trigger set_draft_comments_updated_at
  before update on public.draft_comments
  for each row
  execute procedure public.set_updated_at();
