-- Create locations table for GPS tracking history
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  altitude double precision,
  speed double precision,
  heading double precision,
  battery_level integer check (battery_level >= 0 and battery_level <= 100),
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.locations enable row level security;

-- Create policies for locations table
create policy "Allow public to view locations"
  on public.locations for select
  using (true);

create policy "Allow public to insert locations"
  on public.locations for insert
  with check (true);

create policy "Allow public to update locations"
  on public.locations for update
  using (true);

create policy "Allow public to delete locations"
  on public.locations for delete
  using (true);

-- Create index for faster queries
create index if not exists locations_device_id_idx on public.locations(device_id);
create index if not exists locations_timestamp_idx on public.locations(timestamp desc);
