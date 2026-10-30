-- Stage 13: lessons from moderators, and what the agent looked at.
-- Signed-in moderators write one-sentence lessons. The agent loads the active ones before
-- every decision. Every post also saves the list of what the agent looked at.

create table public.lessons (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  lesson      text        not null check (char_length(lesson) between 1 and 200),
  created_by  uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  written_by  text        not null default '',
  active      boolean     not null default true
);

comment on table public.lessons is 'Club Event Radar: one-sentence lessons from moderators, loaded before every decision.';

create index lessons_active_created_at on public.lessons (active, created_at desc);

alter table public.lessons enable row level security;

create policy "Moderators can read lessons"
  on public.lessons
  for select
  to authenticated
  using (true);

-- A moderator can add a lesson only in their own name.
create policy "Moderators can add lessons"
  on public.lessons
  for insert
  to authenticated
  with check (created_by = auth.uid());

-- A moderator can turn a lesson off (or back on).
create policy "Moderators can turn lessons off"
  on public.lessons
  for update
  to authenticated
  using (true)
  with check (true);

-- Website visitors (anon) get nothing. Moderators may add a lesson and change only "active".
revoke all on table public.lessons from anon, authenticated;
grant select on table public.lessons to authenticated;
grant insert (lesson, written_by) on public.lessons to authenticated;
grant update (active) on public.lessons to authenticated;
grant select on table public.lessons to service_role;

-- What the agent looked at before it decided, saved with every post.
alter table public.events
  add column looked_at jsonb not null default '[]';
