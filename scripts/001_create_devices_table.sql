-- Create devices table for tracking multiple devices
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null check (status in ('active', 'inactive', 'warning')),
  battery_level integer check (battery_level >= 0 and battery_level <= 100),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.devices enable row level security;

-- Create policies for devices table
create policy "Allow public to view devices"
  on public.devices for select
  using (true);

create policy "Allow public to insert devices"
  on public.devices for insert
  with check (true);

create policy "Allow public to update devices"
  on public.devices for update
  using (true);

create policy "Allow public to delete devices"
  on public.devices for delete
  using (true);
