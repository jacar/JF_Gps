-- 1. Tabla de Vehículos
drop table if exists public.vehicles cascade;
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  vehicle_number text unique not null,
  brand text,
  model text,
  year integer,
  plate text,
  color text,
  status text check (status in ('active', 'maintenance', 'inactive')) default 'active',
  imei text,
  current_driver_id uuid references public.users(id),
  last_latitude double precision,
  last_longitude double precision,
  current_speed double precision,
  last_position_update timestamp with time zone,
  motion_detected boolean default false,
  last_motion_update timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabla de Ubicaciones (Geocercas/Puntos de interés)
drop table if exists public.locations cascade;
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  radius double precision default 100, -- en metros
  location_type text check (location_type in ('office', 'warehouse', 'client', 'checkpoint', 'other')) default 'other',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabla de Mantenimientos
drop table if exists public.maintenances cascade;
create table if not exists public.maintenances (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  maintenance_type text check (maintenance_type in ('preventive', 'corrective', 'inspection')),
  description text,
  cost double precision default 0,
  scheduled_date timestamp with time zone not null,
  completed_date timestamp with time zone,
  status text check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')) default 'scheduled',
  mechanic_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabla de Dispositivos GPS
drop table if exists public.gps_devices cascade;
create table if not exists public.gps_devices (
  id uuid primary key default gen_random_uuid(),
  imei text unique not null,
  device_type text,
  status text check (status in ('active', 'inactive', 'maintenance')) default 'active',
  vehicle_id uuid references public.vehicles(id) on delete set null,
  last_connection timestamp with time zone,
  battery_level integer,
  signal_strength integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabla de Alarmas
drop table if exists public.alarms cascade;
create table if not exists public.alarms (
  id uuid primary key default gen_random_uuid(),
  device_imei text,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  alarm_type text check (alarm_type in ('speed', 'geofence', 'battery', 'offline', 'panic')),
  severity text check (severity in ('low', 'medium', 'high', 'critical')),
  message text,
  latitude double precision,
  longitude double precision,
  acknowledged boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.vehicles enable row level security;
alter table public.locations enable row level security;
alter table public.maintenances enable row level security;
alter table public.gps_devices enable row level security;
alter table public.alarms enable row level security;

-- Políticas de Seguridad (Permisivas para desarrollo)
-- Vehicles
drop policy if exists "Allow public to view vehicles" on public.vehicles;
create policy "Allow public to view vehicles" on public.vehicles for select using (true);

drop policy if exists "Allow public to insert vehicles" on public.vehicles;
create policy "Allow public to insert vehicles" on public.vehicles for insert with check (true);

drop policy if exists "Allow public to update vehicles" on public.vehicles;
create policy "Allow public to update vehicles" on public.vehicles for update using (true);

-- Locations
drop policy if exists "Allow public to view locations" on public.locations;
create policy "Allow public to view locations" on public.locations for select using (true);

drop policy if exists "Allow public to insert locations" on public.locations;
create policy "Allow public to insert locations" on public.locations for insert with check (true);

drop policy if exists "Allow public to update locations" on public.locations;
create policy "Allow public to update locations" on public.locations for update using (true);

-- Maintenances
drop policy if exists "Allow public to view maintenances" on public.maintenances;
create policy "Allow public to view maintenances" on public.maintenances for select using (true);

drop policy if exists "Allow public to insert maintenances" on public.maintenances;
create policy "Allow public to insert maintenances" on public.maintenances for insert with check (true);

drop policy if exists "Allow public to update maintenances" on public.maintenances;
create policy "Allow public to update maintenances" on public.maintenances for update using (true);

-- GPS Devices
drop policy if exists "Allow public to view gps_devices" on public.gps_devices;
create policy "Allow public to view gps_devices" on public.gps_devices for select using (true);

drop policy if exists "Allow public to insert gps_devices" on public.gps_devices;
create policy "Allow public to insert gps_devices" on public.gps_devices for insert with check (true);

drop policy if exists "Allow public to update gps_devices" on public.gps_devices;
create policy "Allow public to update gps_devices" on public.gps_devices for update using (true);

-- Alarms
drop policy if exists "Allow public to view alarms" on public.alarms;
create policy "Allow public to view alarms" on public.alarms for select using (true);

drop policy if exists "Allow public to insert alarms" on public.alarms;
create policy "Allow public to insert alarms" on public.alarms for insert with check (true);

drop policy if exists "Allow public to update alarms" on public.alarms;
create policy "Allow public to update alarms" on public.alarms for update using (true);
