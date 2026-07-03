-- ================================================================
-- MumbaiRainWatch — Ticker/Announcement Message Table
-- Run this in Supabase SQL Editor
-- ================================================================

create table if not exists site_ticker (
  id         int primary key default 1,
  message    text not null default '🌧️ Welcome to MumbaiRainWatch — stay safe, report what you see!',
  active     boolean default true,
  updated_at timestamptz default now(),
  constraint single_row check (id = 1)
);

-- Insert the one and only row
insert into site_ticker (id, message, active)
values (1, '🌧️ Welcome to MumbaiRainWatch — stay safe, report what you see!', true)
on conflict (id) do nothing;

-- RLS — public can only READ, not write
-- (this keeps your ticker safe from being edited by random visitors)
alter table site_ticker enable row level security;

create policy "Public read site_ticker"
  on site_ticker for select using (true);

-- No public insert/update/delete policy — only you can edit,
-- via the Supabase Dashboard or SQL Editor (both use your login, not the public key)

-- ================================================================
-- HOW TO UPDATE YOUR MESSAGE (do this daily/whenever needed):
--
-- Option A — Supabase Dashboard (easiest, no code):
--   1. Go to Supabase → Table Editor → site_ticker
--   2. Click the "message" cell for row id=1
--   3. Type your new message → press Enter to save
--   4. It appears live on the site within a few seconds — no push needed!
--
-- Option B — SQL Editor (paste and run):
--   update site_ticker set message = 'Your new message here', updated_at = now() where id = 1;
--
-- To temporarily hide the ticker, set active = false:
--   update site_ticker set active = false where id = 1;
-- ================================================================
