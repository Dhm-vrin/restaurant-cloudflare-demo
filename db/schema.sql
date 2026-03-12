create table if not exists reservations (
  id bigserial primary key,
  name text not null,
  email text not null,
  phone text not null,
  reservation_date date not null,
  reservation_time time not null,
  guests integer not null check (guests > 0),
  seating text,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists reservations_date_time_idx
  on reservations (reservation_date, reservation_time);

create index if not exists reservations_status_idx
  on reservations (status);

create index if not exists reservations_slot_status_idx
  on reservations (reservation_date, reservation_time, status);
