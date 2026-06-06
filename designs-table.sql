-- ================================================================
-- To A "T" Boutique — DESIGNS table (Google Drive sync)
-- Run this in your Supabase SQL Editor (in addition to the existing setup)
-- ================================================================

create table if not exists designs (
  id           bigserial primary key,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now(),
  drive_id     text unique not null,   -- Google Drive file ID (dedupe key)
  name         text not null,          -- design display name (from file name)
  category     text not null,          -- = Drive folder name
  image_url    text not null,          -- public image URL the storefront loads
  thumb_url    text,                   -- smaller thumbnail URL (faster grids)
  mime_type    text default '',
  active       boolean default true    -- set false to hide without deleting
);

create index if not exists designs_category_idx on designs (category);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table designs enable row level security;

-- Shoppers can read active designs
create policy "Public can read designs"
  on designs for select
  using (true);

-- The sync function uses the service key, which bypasses RLS,
-- so no public insert/update policies are needed for designs.

-- ── DONE ─────────────────────────────────────────────────────
