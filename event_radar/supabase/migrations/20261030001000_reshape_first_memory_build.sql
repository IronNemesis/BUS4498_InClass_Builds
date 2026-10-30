-- Before Stages 11 to 13: reshape the first memory build (20261030000100 and 20261030000200) to the
-- Week 10 contract in AGENTS.md, so the Stage 11, 12, and 13 migrations below apply cleanly.
-- Nothing is deleted. Columns the Week 10 agent doesn't use stay in place, unused:
-- events.replaces_id, events.looked_at, and lessons.written_by.

-- clubs: "aliases" (a list) becomes "nicknames" (comma-separated text), plus the Week 10 columns.
drop policy if exists "Moderators can read clubs" on public.clubs;
alter table public.clubs drop constraint if exists clubs_name_check;
alter table public.clubs rename column aliases to nicknames;
alter table public.clubs alter column nicknames drop default;
alter table public.clubs alter column nicknames type text using array_to_string(nicknames, ', ');
alter table public.clubs alter column nicknames set default '';
alter table public.clubs add constraint clubs_name_check check (char_length(name) between 2 and 80);
alter table public.clubs
  add column if not exists usual_place_code text not null default '',
  add column if not exists usual_place_detail text not null default '',
  add column if not exists active boolean not null default true,
  add column if not exists note text not null default '';

-- The four sample clubs already here get the same nicknames and usual places as the Stage 11 list.
update public.clubs set nicknames = 'BGG, board game club, game night club', usual_place_code = 'UU', usual_place_detail = 'Room 220'
  where name = 'Board Game Guild';
update public.clubs set nicknames = 'pitch society, pitch club, MPS', usual_place_code = 'UU-PLAZA', usual_place_detail = ''
  where name = 'Mustang Pitch Society';
update public.clubs set nicknames = 'WiFC, women in finance', usual_place_code = 'BUSINESS', usual_place_detail = 'Room 213'
  where name = 'Women in Finance Circle';
update public.clubs set nicknames = 'sustainability club, green crew', usual_place_code = 'DEXTER-LAWN', usual_place_detail = ''
  where name = 'Sustainability Crew';

-- lessons: created_by holds the moderator's email (text), lessons are 5 to 300 characters, and from_post
-- remembers the post that prompted a lesson. The old policies are replaced in Stage 13.
drop policy if exists "Moderators can turn lessons off" on public.lessons;
drop policy if exists "Moderators can add lessons" on public.lessons;
alter table public.lessons drop constraint if exists lessons_created_by_fkey;
alter table public.lessons alter column created_by drop default;
alter table public.lessons alter column created_by type text using created_by::text;
alter table public.lessons alter column created_by set default '';
alter table public.lessons drop constraint if exists lessons_lesson_check;
alter table public.lessons add constraint lessons_lesson_check check (char_length(lesson) between 5 and 300);
alter table public.lessons add column if not exists from_post uuid;
