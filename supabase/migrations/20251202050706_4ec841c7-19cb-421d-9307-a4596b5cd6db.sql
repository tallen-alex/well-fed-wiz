-- Create updated_at function if it doesn't exist
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create appointments table
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id) on delete cascade not null,
  appointment_date date not null,
  appointment_time time not null,
  duration_minutes integer not null default 60,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  client_notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.appointments enable row level security;

-- Clients can view their own appointments
create policy "Clients can view own appointments"
  on public.appointments for select
  using (auth.uid() = client_id);

-- Clients can create their own appointments
create policy "Clients can create own appointments"
  on public.appointments for insert
  with check (auth.uid() = client_id);

-- Clients can update their own pending appointments
create policy "Clients can update own pending appointments"
  on public.appointments for update
  using (auth.uid() = client_id and status = 'pending');

-- Admins can view all appointments
create policy "Admins can view all appointments"
  on public.appointments for select
  using (public.has_role(auth.uid(), 'admin'));

-- Admins can update any appointment
create policy "Admins can update all appointments"
  on public.appointments for update
  using (public.has_role(auth.uid(), 'admin'));

-- Admins can delete any appointment
create policy "Admins can delete all appointments"
  on public.appointments for delete
  using (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
create trigger update_appointments_updated_at
  before update on public.appointments
  for each row
  execute function public.update_updated_at_column();