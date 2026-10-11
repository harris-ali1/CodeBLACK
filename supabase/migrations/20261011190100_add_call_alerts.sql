-- Phone-call alerts: whether the user agreed to be called with flood warnings,
-- and a free-text note on who they look after (e.g. "elderly mother, two kids, uses a walker")
-- that tailors what the alert says.
alter table public.profiles
  add column if not exists call_consent boolean not null default false,
  add column if not exists dependents text;
