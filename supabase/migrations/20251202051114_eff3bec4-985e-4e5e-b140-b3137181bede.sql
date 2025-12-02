-- Create meal_plans table
create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_days integer not null default 7,
  created_by uuid references auth.users(id) on delete cascade not null,
  is_template boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create meal_plan_days table
create table public.meal_plan_days (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid references public.meal_plans(id) on delete cascade not null,
  day_number integer not null check (day_number > 0),
  notes text,
  created_at timestamp with time zone default now()
);

-- Create meal_plan_meals table
create table public.meal_plan_meals (
  id uuid primary key default gen_random_uuid(),
  meal_plan_day_id uuid references public.meal_plan_days(id) on delete cascade not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name text not null,
  description text,
  calories integer,
  protein_grams integer,
  carbs_grams integer,
  fat_grams integer,
  ingredients text,
  instructions text,
  created_at timestamp with time zone default now()
);

-- Create client_meal_plans table (assignments)
create table public.client_meal_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references auth.users(id) on delete cascade not null,
  meal_plan_id uuid references public.meal_plans(id) on delete cascade not null,
  assigned_by uuid references auth.users(id) on delete set null,
  start_date date not null,
  end_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.meal_plans enable row level security;
alter table public.meal_plan_days enable row level security;
alter table public.meal_plan_meals enable row level security;
alter table public.client_meal_plans enable row level security;

-- RLS Policies for meal_plans
create policy "Admins can view all meal plans"
  on public.meal_plans for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can create meal plans"
  on public.meal_plans for insert
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update meal plans"
  on public.meal_plans for update
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete meal plans"
  on public.meal_plans for delete
  using (public.has_role(auth.uid(), 'admin'));

create policy "Clients can view assigned meal plans"
  on public.meal_plans for select
  using (
    exists (
      select 1 from public.client_meal_plans
      where client_meal_plans.meal_plan_id = meal_plans.id
        and client_meal_plans.client_id = auth.uid()
        and client_meal_plans.status = 'active'
    )
  );

-- RLS Policies for meal_plan_days
create policy "Admins can manage meal plan days"
  on public.meal_plan_days for all
  using (public.has_role(auth.uid(), 'admin'));

create policy "Clients can view days of assigned meal plans"
  on public.meal_plan_days for select
  using (
    exists (
      select 1 from public.client_meal_plans
      where client_meal_plans.meal_plan_id = meal_plan_days.meal_plan_id
        and client_meal_plans.client_id = auth.uid()
        and client_meal_plans.status = 'active'
    )
  );

-- RLS Policies for meal_plan_meals
create policy "Admins can manage meals"
  on public.meal_plan_meals for all
  using (public.has_role(auth.uid(), 'admin'));

create policy "Clients can view meals of assigned plans"
  on public.meal_plan_meals for select
  using (
    exists (
      select 1 from public.meal_plan_days
      join public.client_meal_plans on client_meal_plans.meal_plan_id = meal_plan_days.meal_plan_id
      where meal_plan_days.id = meal_plan_meals.meal_plan_day_id
        and client_meal_plans.client_id = auth.uid()
        and client_meal_plans.status = 'active'
    )
  );

-- RLS Policies for client_meal_plans
create policy "Admins can view all assignments"
  on public.client_meal_plans for select
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can create assignments"
  on public.client_meal_plans for insert
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update assignments"
  on public.client_meal_plans for update
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete assignments"
  on public.client_meal_plans for delete
  using (public.has_role(auth.uid(), 'admin'));

create policy "Clients can view own assignments"
  on public.client_meal_plans for select
  using (auth.uid() = client_id);

-- Create triggers for updated_at
create trigger update_meal_plans_updated_at
  before update on public.meal_plans
  for each row
  execute function public.update_updated_at_column();

create trigger update_client_meal_plans_updated_at
  before update on public.client_meal_plans
  for each row
  execute function public.update_updated_at_column();

-- Create indexes for better performance
create index idx_meal_plan_days_meal_plan_id on public.meal_plan_days(meal_plan_id);
create index idx_meal_plan_meals_day_id on public.meal_plan_meals(meal_plan_day_id);
create index idx_client_meal_plans_client_id on public.client_meal_plans(client_id);
create index idx_client_meal_plans_meal_plan_id on public.client_meal_plans(meal_plan_id);