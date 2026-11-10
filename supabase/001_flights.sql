-- ============================================================================
-- Paper Airplanes — flight notes, prints and flags
-- Family Supabase project. Signed-in family account only. Prefix: pa_  App: paper-airplanes
-- Paste by hand (test first with test_001_flights_rollback.sql). Safe to re-run.
--
-- kind:
--   flight  one test flight: distance_ft, seconds, path (straight / curve left / curve right / loop / dive / stall),
--           score = how easy it was to fold (1 hard · 2 OK · 3 easy), note
--   printed the sheet was printed (note says how many copies)
--   flag    something wrong with a sheet (open until fixed)
-- Approval is NOT stored here: Claude sets approved: true in data/planes.js after reading the flights.
-- ============================================================================

create table if not exists public.pa_flights (
    id          uuid primary key default gen_random_uuid(),
    code        text not null,
    kind        text not null check (kind in ('flight', 'printed', 'flag')),
    reason      text not null default '',
    who         text not null default '' check (who in ('', 'younger', 'older')),
    score       smallint check (score between 0 and 5),
    note        text not null default '',
    status      text not null default 'done' check (status in ('open', 'fixed', 'kept', 'done')),
    resolution  text not null default '',
    distance_ft numeric check (distance_ft is null or distance_ft >= 0),
    seconds     numeric check (seconds is null or seconds >= 0),
    path        text check (path is null or path in ('straight', 'curve left', 'curve right', 'loop', 'dive', 'stall')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    resolved_at timestamptz,
    unique (code, kind, created_at)
);
alter table public.pa_flights enable row level security;
create index if not exists pa_flights_code on public.pa_flights (code, kind);

drop policy if exists "Authenticated can manage pa_flights" on public.pa_flights;
create policy "Authenticated can manage pa_flights" on public.pa_flights for all to authenticated using (true) with check (true);
revoke all on public.pa_flights from anon;
comment on table public.pa_flights is 'Paper Airplanes: test flights (distance, time, path, ease of folding), prints and flags per plane code (PA-01 …).';

insert into public.app_table_registry (app, object_name, object_type, access, description, repo)
select 'paper-airplanes', 'pa_flights', 'table', 'owner', 'Paper Airplanes flight notes, prints and flags.', 'ShimmyCane/Felix-Maze'
where not exists (select 1 from public.app_table_registry where app = 'paper-airplanes' and object_name = 'pa_flights');

-- Check: this should list only other apps' objects, never pa_*.
-- select * from public.app_table_unregistered;
