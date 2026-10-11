-- Columns for the Profile form
alter table public.profiles
  add column full_name text,
  add column language text not null default 'en',
  add column address text,
  add column household_needs text[] not null default '{}';

-- Addresses and household needs are private: users can only see their own row
drop policy if exists "Profiles are viewable by everyone" on public.profiles;

create policy "Users can view their own profile"
  on public.profiles for select using ((select auth.uid()) = id);

-- Let users create their own row if the signup trigger didn't
create policy "Users can create their own profile"
  on public.profiles for insert with check ((select auth.uid()) = id);