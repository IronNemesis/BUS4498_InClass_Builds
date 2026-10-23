-- Optional stage: the nightly clean-up.
-- Every night at 10:00 UTC (about 3 a.m. Pacific), archive published and waiting posts
-- whose event date has already passed. Archived posts leave the website and the
-- moderator's waiting list, and no longer count for the duplicate check.
-- See the job in Supabase under Integrations → Cron.

create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- Scheduling a job with the same name again replaces it, so this is safe to re-run.
select cron.schedule(
  'archive-past-events',
  '0 10 * * *',
  $$
    update public.events
    set status = 'archived'
    where status in ('published', 'waiting')
      and event_date < (now() at time zone 'America/Los_Angeles')::date;
  $$
);
