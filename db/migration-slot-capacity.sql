-- Run this once on your existing Neon database before using slot capacity > 1.

-- 1. Remove the old unique slot rule from the Netlify-era setup.
drop index if exists reservations_slot_unique_idx;

-- 2. Ensure supporting indexes exist for status-based availability.
create index if not exists reservations_status_idx
  on reservations (status);

create index if not exists reservations_slot_status_idx
  on reservations (reservation_date, reservation_time, status);

-- 3. Optional: normalize old rows if needed.
update reservations
set status = 'pending'
where status is null or trim(status) = '';
