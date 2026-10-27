-- Statements are separated by lines containing only "-- ;;" (see scripts/init-db.js)

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  timezone text not null default 'Asia/Kolkata',
  photo_retention_days int not null default 90,
  record_retention_days int not null default 365
);
-- ;;
insert into settings (id) values (1) on conflict do nothing;
-- ;;
create table if not exists shifts (
  name text primary key check (name in ('day', 'night')),
  start_time time not null,
  end_time time not null,
  -- how many minutes before start_time the kiosk starts accepting attendance
  early_minutes int not null default 30
);
-- ;;
insert into shifts (name, start_time, end_time, early_minutes) values
  ('day', '09:00', '18:00', 30),
  ('night', '21:00', '06:00', 30)
on conflict do nothing;
-- ;;
create table if not exists employees (
  id serial primary key,
  roll_no text not null unique,
  name text not null,
  shift text not null references shifts(name),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
-- ;;
create table if not exists attendance (
  id serial primary key,
  employee_id int not null references employees(id) on delete cascade,
  -- the date the shift STARTED on, so a night shift crossing midnight counts once
  shift_date date not null,
  marked_at timestamptz not null default now(),
  photo_url text,
  photo_bytes int,
  face_score real,
  unique (employee_id, shift_date)
);
-- ;;
create index if not exists attendance_shift_date_idx on attendance (shift_date);
-- ;;
-- Returns the shift_date if "now" is inside the shift's marking window, else null.
create or replace function shift_date_for(p_shift text) returns date
language plpgsql stable as $$
declare
  s shifts%rowtype;
  now_local timestamp;
  d date;
begin
  select * into s from shifts where name = p_shift;
  if not found then return null; end if;
  now_local := now() at time zone (select timezone from settings where id = 1);
  foreach d in array array[now_local::date, now_local::date - 1] loop
    if now_local >= d + s.start_time - make_interval(mins => s.early_minutes)
       and now_local <= d + s.end_time
         -- parens matter: plpgsql ends an IF condition at the first THEN, even one inside CASE
         + (case when s.end_time <= s.start_time then interval '1 day' else interval '0' end)
    then
      return d;
    end if;
  end loop;
  return null;
end $$;
