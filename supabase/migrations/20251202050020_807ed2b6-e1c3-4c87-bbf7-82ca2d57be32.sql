-- Add INSERT policy so users can set their own role during signup
create policy "Users can insert own role"
  on public.user_roles for insert
  with check (auth.uid() = user_id);