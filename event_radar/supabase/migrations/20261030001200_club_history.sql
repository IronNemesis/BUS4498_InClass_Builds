-- Stage 12: club history (memory of what happened).
-- Before it decides, the agent looks up the club's own upcoming posts. When a post updates one of them
-- (a changed time, date, or place), the earlier post is marked "replaced" and leaves the website
-- instead of staying up next to the new card.

-- A fifth status: replaced by a newer post from the same club.
alter table public.events drop constraint if exists events_status_check;
alter table public.events add constraint events_status_check
  check (status in ('published', 'waiting', 'rejected', 'archived', 'replaced'));

-- Which post replaced this one, and which post a waiting update will replace once a moderator approves it.
alter table public.events add column if not exists replaced_by uuid;
alter table public.events add column if not exists updates_id uuid;

-- Moderators may also mark a post as replaced (when they approve an update).
-- This project's Stage 8 policy is named "Moderators can review posts"; replace it too.
drop policy if exists "Moderators can review posts" on public.events;
drop policy if exists "Moderators can approve or reject" on public.events;
create policy "Moderators can approve or reject"
  on public.events for update
  to authenticated
  using (true)
  with check (status in ('published', 'waiting', 'rejected', 'replaced'));
