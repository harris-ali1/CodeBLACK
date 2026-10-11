-- The user's phone number, stored in E.164 format (e.g. +17135550123).
-- Private: the existing row-level security only lets users read and edit their own profile row.
alter table public.profiles
  add column if not exists phone text;
