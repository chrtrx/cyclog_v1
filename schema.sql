-- ═══════════════════════════════════════════════════════════════════
-- CYCLOG – Vollständiges Datenbank-Schema (Vision Version)
-- PostgreSQL / Supabase
--
-- Im Supabase Dashboard → SQL Editor einfügen und ausführen.
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. PROFILE / EINSTELLUNGEN
-- ─────────────────────────────────────────────────────────────────
create table profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  weight_kg      numeric,                    -- Fahrergewicht (für Reifendruck-DB)
  theme          text default 'light',       -- 'light' | 'dark'
  streak         integer default 0,
  active_bike_id uuid,
  last_sync      timestamptz,
  created_at     timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 2. BIKES (Fahrräder)
-- ─────────────────────────────────────────────────────────────────
create table bikes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  type            text not null default 'Rennrad',
  manufacturer    text,
  model           text,
  model_year      integer,
  frame_size      text,
  purchase_date   date,
  photo_url       text,
  notes           text default '',
  strava_gear_id  text,
  km              integer default 0,
  geo_stack            numeric,
  geo_reach            numeric,
  geo_head_angle       numeric,
  geo_seat_angle       numeric,
  geo_head_tube        numeric,
  geo_top_tube         numeric,
  geo_seat_tube        numeric,
  geo_chainstay        numeric,
  geo_wheelbase        numeric,
  geo_bb_drop          numeric,
  geo_standover        numeric,
  is_retired      boolean default false,
  created_at      timestamptz default now()
);

alter table profiles
  add constraint fk_active_bike
  foreign key (active_bike_id) references bikes(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────
-- 3. KOMPONENTEN
-- ─────────────────────────────────────────────────────────────────
create table components (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bike_id       uuid references bikes(id) on delete cascade,
  category      text not null,
  name          text,
  manufacturer  text,
  model         text,
  specs         jsonb default '{}',
  weight_g      integer,
  installed_date  date,
  km_at_install   integer,
  is_active       boolean default true,
  notes           text default '',
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 4. WARTUNGS-EINTRÄGE
-- ─────────────────────────────────────────────────────────────────
create table service_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bike_id       uuid not null references bikes(id) on delete cascade,
  component_id  uuid references components(id) on delete set null,
  service_type  text not null,
  title         text not null,
  icon          text,
  km_at_service integer not null,
  service_date  timestamptz default now(),
  note          text default '',
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 5. VERSCHLEISS-TRACKER
-- ─────────────────────────────────────────────────────────────────
create table trackers (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bike_id       uuid not null references bikes(id) on delete cascade,
  component_id  uuid references components(id) on delete set null,
  type_id       text not null,
  title         text not null,
  icon          text not null,
  interval_type text default 'km',
  interval_km   integer,
  interval_days integer,
  km_at_start   integer not null,
  start_date    timestamptz default now(),
  note          text default '',
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 6. SETUPS
-- ─────────────────────────────────────────────────────────────────
create table setups (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bike_id       uuid references bikes(id) on delete set null,
  name          text not null,
  description   text default '',
  snapshot      jsonb default '{}',
  total_weight_g integer,
  tyre_pressure_front numeric,
  tyre_pressure_rear  numeric,
  fork_settings jsonb default '{}',
  shock_settings jsonb default '{}',
  fit_saddle_height   numeric,
  fit_setback         numeric,
  fit_stem_length     numeric,
  fit_stem_angle      numeric,
  fit_spacer_height   numeric,
  fit_bar_height      numeric,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 7. BIKE-FIT ARCHIV
-- ─────────────────────────────────────────────────────────────────
create table bike_fits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bike_id       uuid not null references bikes(id) on delete cascade,
  fit_date      date default current_date,
  saddle_height numeric,
  setback       numeric,
  stem_length   numeric,
  stem_angle    numeric,
  spacer_height numeric,
  bar_height    numeric,
  fitter_notes  text default '',
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 8. RACE-SETUP ARCHIV
-- ─────────────────────────────────────────────────────────────────
create table races (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bike_id       uuid references bikes(id) on delete set null,
  setup_id      uuid references setups(id) on delete set null,
  event_name    text not null,
  race_date     date,
  tyres         text,
  pressure_front numeric,
  pressure_rear  numeric,
  wheelset      text,
  gearing       text,
  weight_g      integer,
  distance_km   numeric,
  elevation_m   integer,
  duration_sec  integer,
  avg_speed     numeric,
  avg_power     integer,
  placement     text,
  conditions    text,
  notes         text default '',
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 9. REIFENDRUCK-DATENBANK
-- ─────────────────────────────────────────────────────────────────
create table tyre_pressures (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bike_id       uuid references bikes(id) on delete set null,
  tyre_model    text,
  tyre_width    integer,
  rim           text,
  rider_weight  numeric,
  weather       text,
  surface       text,
  pressure_front numeric,
  pressure_rear  numeric,
  rating        integer,
  notes         text default '',
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 10. STRAVA AKTIVITÄTEN
-- ─────────────────────────────────────────────────────────────────
create table activities (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  bike_id         uuid references bikes(id) on delete set null,
  strava_id       text unique,
  name            text,
  activity_date   timestamptz,
  distance_m      numeric,
  elevation_m     numeric,
  moving_time_sec integer,
  avg_speed       numeric,
  avg_power       integer,
  created_at      timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 11. STRAVA TOKENS
-- ─────────────────────────────────────────────────────────────────
create table strava_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  access_token  text not null,
  refresh_token text not null,
  expires_at    bigint not null,
  athlete_name  text,
  updated_at    timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────
-- 12. FOTOS
-- ─────────────────────────────────────────────────────────────────
create table photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  bike_id       uuid references bikes(id) on delete cascade,
  component_id  uuid references components(id) on delete cascade,
  setup_id      uuid references setups(id) on delete cascade,
  storage_path  text not null,
  caption       text default '',
  created_at    timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════
alter table profiles        enable row level security;
alter table bikes           enable row level security;
alter table components      enable row level security;
alter table service_logs    enable row level security;
alter table trackers        enable row level security;
alter table setups          enable row level security;
alter table bike_fits       enable row level security;
alter table races           enable row level security;
alter table tyre_pressures  enable row level security;
alter table activities      enable row level security;
alter table strava_tokens   enable row level security;
alter table photos          enable row level security;

create policy "own profile"    on profiles        for all using (auth.uid() = user_id);
create policy "own bikes"      on bikes           for all using (auth.uid() = user_id);
create policy "own components" on components      for all using (auth.uid() = user_id);
create policy "own services"   on service_logs    for all using (auth.uid() = user_id);
create policy "own trackers"   on trackers        for all using (auth.uid() = user_id);
create policy "own setups"     on setups          for all using (auth.uid() = user_id);
create policy "own fits"       on bike_fits       for all using (auth.uid() = user_id);
create policy "own races"      on races           for all using (auth.uid() = user_id);
create policy "own pressures"  on tyre_pressures  for all using (auth.uid() = user_id);
create policy "own activities" on activities      for all using (auth.uid() = user_id);
create policy "own tokens"     on strava_tokens   for all using (auth.uid() = user_id);
create policy "own photos"     on photos          for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- TRIGGER: Auto-Profil
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════
-- INDIZES
-- ═══════════════════════════════════════════════════════════════════
create index idx_bikes_user        on bikes(user_id);
create index idx_components_bike    on components(bike_id);
create index idx_components_cat     on components(category);
create index idx_service_bike       on service_logs(bike_id);
create index idx_trackers_bike      on trackers(bike_id);
create index idx_setups_bike        on setups(bike_id);
create index idx_fits_bike          on bike_fits(bike_id);
create index idx_races_user         on races(user_id);
create index idx_pressures_user     on tyre_pressures(user_id);
create index idx_activities_bike    on activities(bike_id);
create index idx_photos_bike        on photos(bike_id);
