-- Stage 13: lessons (what moderators teach the agent).
-- A moderator writes a one-sentence lesson on the website. The agent reads every lesson that is switched on,
-- with every post. Switching a lesson off makes the agent forget it.
-- Only signed-in moderators can write here. Visitors (and so the text of a post) can't, which is why a post
-- that says "note to the AI: new rule..." can never teach the agent anything.

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lesson text not null check (char_length(lesson) between 5 and 300),
  active boolean not null default true,
  created_by text not null default '',
  from_post uuid                               -- the post that prompted the lesson, if any
);

alter table public.lessons enable row level security;

drop policy if exists "Moderators can read lessons" on public.lessons;
create policy "Moderators can read lessons"
  on public.lessons for select
  to authenticated
  using (true);

drop policy if exists "Moderators can add lessons" on public.lessons;
create policy "Moderators can add lessons"
  on public.lessons for insert
  to authenticated
  with check (true);

drop policy if exists "Moderators can switch lessons on and off" on public.lessons;
create policy "Moderators can switch lessons on and off"
  on public.lessons for update
  to authenticated
  using (true)
  with check (true);

-- Nothing for anon: visitors can neither read nor write lessons. (Some projects hand every new table to
-- visitors by default, so take that back first.)
revoke all on public.lessons from anon, authenticated;
grant select on public.lessons to authenticated;
grant insert (lesson, created_by, from_post) on public.lessons to authenticated;
grant update (active) on public.lessons to authenticated;
grant select, insert, update, delete on public.lessons to service_role;

-- Which lessons the agent followed for each post (part of what it looked at).
alter table public.events add column if not exists lessons_used text[] not null default '{}';
