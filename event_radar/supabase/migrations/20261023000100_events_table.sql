-- Stage 4: the database.
-- One table, public.events, that saves every post and its status.
-- The website (anon) may only read published posts, and only the columns granted below.
-- Only the AI agent (service_role) may add or change posts.

create table public.events (
  id                 uuid        primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  status             text        not null default 'waiting'
                     check (status in ('published', 'waiting', 'rejected', 'archived')),
  status_reason      text        not null default '',
  announcement       text        not null
                     check (char_length(announcement) between 1 and 2000),
  title              text        not null default '',
  club               text        not null default '',
  event_date         date,
  start_time         time,
  end_time           time,
  place_code         text        not null default '',
  place_name         text        not null default '',
  place_detail       text        not null default '',
  cost               text        not null default '',
  free_food          boolean     not null default false,
  summary            text        not null default '',
  rule_flags         text[]      not null default '{}',
  note_for_moderator text        not null default '',
  -- "date|start time|place code", or null when one of them is unknown.
  dedupe_key         text,
  ai_model           text        not null default '',
  reviewed_at        timestamptz,
  reviewed_by        text        not null default ''
);

comment on table public.events is 'Club Event Radar: every post the AI agent receives, and its status.';

-- The duplicate check: only one live post (published or waiting) per date, start time, and place.
create unique index events_dedupe_key_live
  on public.events (dedupe_key)
  where dedupe_key is not null and status in ('published', 'waiting');

-- Helps the website list published events, soonest first.
create index events_status_event_date on public.events (status, event_date);

-- Row-level security: visitors see published posts only.
alter table public.events enable row level security;

create policy "Anyone can read published events"
  on public.events
  for select
  to anon, authenticated
  using (status = 'published');

-- Grants: start from nothing, then allow exactly what the website needs.
revoke all on table public.events from anon, authenticated;

grant select (
  id, created_at, status, title, club, event_date, start_time, end_time,
  place_name, place_detail, cost, free_food, summary
) on public.events to anon, authenticated;

-- The AI agent uses the secret key (service_role).
grant select, insert, update, delete on table public.events to service_role;
