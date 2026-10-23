-- Stage 7: photo uploads.
-- Each post can have one flyer photo. The AI agent uploads it to the "flyers" storage bucket
-- and saves the photo's public link in flyer_url. The website only reads that link.

alter table public.events
  add column flyer_url text not null default '';

-- The website may read the new column, like the other public columns.
grant select (flyer_url) on public.events to anon, authenticated;

-- A public bucket: anyone with a link can view a photo, but only the agent can upload.
-- The website gets no storage policies, so it can't upload, change, or delete files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('flyers', 'flyers', true, 5242880, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
