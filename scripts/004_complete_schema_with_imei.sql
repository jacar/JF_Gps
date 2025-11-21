-- Habilitar la extensión UUID si no está habilitada
create extension if not exists "uuid-ossp";

-- 1. Tabla de Usuarios (Conductores y Admins)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone_number text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'driver')),
  vehicle_number text,
  imei text,
  initial_latitude double precision,
  initial_longitude double precision,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabla de Viajes (Trips)
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.users(id) on delete cascade,
  vehicle_number text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  start_latitude double precision not null,
  start_longitude double precision not null,
  end_latitude double precision,
  end_longitude double precision,
  total_distance_km double precision default 0,
  max_speed_kmh double precision default 0,
  average_speed_kmh double precision default 0,
  status text not null check (status in ('active', 'completed')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabla de Ubicaciones del Viaje (Trip Locations)
create table if not exists public.trip_locations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  speed_kmh double precision,
  accuracy double precision,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Habilitar Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_locations enable row level security;

-- 5. Políticas de Seguridad (Permitir todo por ahora para desarrollo)
create policy "Allow public to view users" on public.users for select using (true);
create policy "Allow public to insert users" on public.users for insert with check (true);
create policy "Allow public to update users" on public.users for update using (true);

create policy "Allow public to view trips" on public.trips for select using (true);
create policy "Allow public to insert trips" on public.trips for insert with check (true);
create policy "Allow public to update trips" on public.trips for update using (true);

create policy "Allow public to view trip_locations" on public.trip_locations for select using (true);
create policy "Allow public to insert trip_locations" on public.trip_locations for insert with check (true);

-- 6. Índices para rendimiento
create index if not exists users_phone_number_idx on public.users(phone_number);
create index if not exists trips_driver_id_idx on public.trips(driver_id);
create index if not exists trips_status_idx on public.trips(status);
create index if not exists trip_locations_trip_id_idx on public.trip_locations(trip_id);
create index if not exists trip_locations_timestamp_idx on public.trip_locations(timestamp desc);
