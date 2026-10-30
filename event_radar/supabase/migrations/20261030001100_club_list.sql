-- Stage 11: the club list (knowledge the agent reads on every post).
-- Moderators keep this table current in Supabase → Table Editor. The agent reads it before it reads a post,
-- so a nickname becomes the official club name and an unknown club waits for a moderator.
-- The agent never fills in a club's usual place: that is a hint for the moderator, and rule R2 still stands.

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique check (char_length(name) between 2 and 80),
  nicknames text not null default '',          -- separated by commas, such as "BGG, board game club"
  usual_place_code text not null default '',   -- a code from context/campus-places.md, or empty
  usual_place_detail text not null default '', -- such as "Room 220"
  active boolean not null default true,        -- switch a club off instead of deleting it
  note text not null default ''                -- anything a moderator wants to remember about the club
);

-- Security rules: visitors may see which clubs exist (their names), nothing more.
alter table public.clubs enable row level security;

drop policy if exists "Anyone can read active clubs" on public.clubs;
create policy "Anyone can read active clubs"
  on public.clubs for select
  to anon, authenticated
  using (active);

-- Some projects hand every new table to visitors by default. Take that back, then grant only what's needed.
revoke all on public.clubs from anon, authenticated;
grant select (id, name, nicknames, active) on public.clubs to anon, authenticated;
grant select, insert, update, delete on public.clubs to service_role;

-- The clubs from the sample posts. Every club here is made up.
insert into public.clubs (name, nicknames, usual_place_code, usual_place_detail) values
  ('Board Game Guild', 'BGG, board game club, game night club', 'UU', 'Room 220'),
  ('Mustang Pitch Society', 'pitch society, pitch club, MPS', 'UU-PLAZA', ''),
  ('Women in Finance Circle', 'WiFC, women in finance', 'BUSINESS', 'Room 213'),
  ('Sustainability Crew', 'sustainability club, green crew', 'DEXTER-LAWN', ''),
  ('Accounting Society', 'accounting club, acct society', 'BUSINESS', 'Room 212'),
  ('Cal Poly Ski & Snowboard Club', 'ski club, snowboard club, CP ski', '', '')
on conflict (name) do nothing;

-- What the agent looked at before it decided, saved with each post and shown to the moderator.
alter table public.events add column if not exists agent_notes text[] not null default '{}';

-- Moderator tools: "Clear the board" on the website deletes every post. Only signed-in moderators can.
drop policy if exists "Moderators can clear the board" on public.events;
create policy "Moderators can clear the board"
  on public.events for delete
  to authenticated
  using (true);
grant delete on public.events to authenticated;

create index if not exists events_by_club on public.events (club, status, event_date);
