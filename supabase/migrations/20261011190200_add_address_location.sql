-- Home location from the address autocomplete / Census geocoder, so alerts can measure
-- "within 20 miles of home" without needing browser location access.
alter table public.profiles
  add column if not exists address_lat double precision,
  add column if not exists address_lon double precision;
