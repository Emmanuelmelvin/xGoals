-- Feedback loop: the agent may READ owner comments so the next run obeys
-- them. Insert/update/delete stay owner-only; agent_writer gets SELECT.
grant select on table public.draft_comments to agent_writer;

drop policy if exists "agent_writer can read draft comments" on public.draft_comments;
create policy "agent_writer can read draft comments"
  on public.draft_comments for select to agent_writer using (true);
