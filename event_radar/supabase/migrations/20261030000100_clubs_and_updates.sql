-- Stage 12: what the agent already posted.
-- The club list helps the agent recognize which club a post is from. Before deciding, the
-- agent looks up that club's upcoming posts in public.events, so an update ("actually, 8 pm")
-- can fill in the earlier post's details and replace its card instead of adding a second one.

create table public.clubs (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text        not null unique check (char_length(name) between 1 and 100),
  -- Other names people use for the club, such as "BGG".
  aliases     text[]      not null default '{}'
);

comment on table public.clubs is 'Club Event Radar: the club list the AI agent reads before every decision.';

-- Start with the clubs in the sample posts, plus any club already in events.
insert into public.clubs (name, aliases) values
  ('Board Game Guild', '{BGG}'),
  ('Mustang Pitch Society', '{}'),
  ('Sustainability Crew', '{}'),
  ('Women in Finance Circle', '{WIFC}')
on conflict (name) do nothing;

insert into public.clubs (name)
select distinct on (lower(club)) club
from public.events
where club <> ''
  and not exists (select 1 from public.clubs c where lower(c.name) = lower(events.club))
order by lower(club), created_at desc
on conflict (name) do nothing;

alter table public.clubs enable row level security;

-- Moderators may read the club list. Add or change clubs in the Table Editor.
create policy "Moderators can read clubs"
  on public.clubs
  for select
  to authenticated
  using (true);

revoke all on table public.clubs from anon, authenticated;
grant select on table public.clubs to authenticated;
grant select, insert, update, delete on table public.clubs to service_role;

-- The earlier post that this post updates (its card is archived when this one is saved).
alter table public.events
  add column replaces_id uuid references public.events (id);
