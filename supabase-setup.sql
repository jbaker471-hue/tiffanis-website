-- ================================================================
-- To A "T" Boutique — Supabase Database Setup
-- Run this entire file in your Supabase SQL Editor
-- ================================================================

-- ORDERS table
create table if not exists orders (
  id            bigserial primary key,
  created_at    timestamptz default now(),
  date          text,
  customer_name text not null,
  phone         text,
  delivery      text default 'Pickup',
  brand         text default '',
  shirt_style   text default 'no-pocket',
  placement     text default '',
  items         text,          -- JSON string of items array
  status        text default 'New',
  paid          boolean default false,
  payment_method text default 'Pending',
  using_reward  boolean default false,
  reward_redeemed boolean default false,
  notes         text
);

-- CUSTOMERS loyalty table
create table if not exists customers (
  id              bigserial primary key,
  created_at      timestamptz default now(),
  phone           text unique not null,
  name            text,
  total_shirts    int default 0,
  earned_rewards  int default 0,
  redeemed_rewards int default 0,
  since           text
);

-- MESSAGES table
create table if not exists messages (
  id         bigserial primary key,
  created_at timestamptz default now(),
  name       text not null,
  phone      text,
  message    text not null,
  read       boolean default false,
  date       text,
  time       text
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
-- Allow public inserts (customers placing orders / leaving messages)
-- Allow public reads on their own data via phone number
-- Everything else requires the service key (admin only)

alter table orders   enable row level security;
alter table customers enable row level security;
alter table messages  enable row level security;

-- Anyone can insert an order
create policy "Public can insert orders"
  on orders for insert
  with check (true);

-- Anyone can read orders by phone (for order status lookup)
create policy "Public can read own orders"
  on orders for select
  using (true);

-- Anyone can update orders (Tiffani updates via anon key for now)
create policy "Public can update orders"
  on orders for update
  using (true);

-- Anyone can delete orders
create policy "Public can delete orders"
  on orders for delete
  using (true);

-- Customers table
create policy "Public can insert customers"
  on customers for insert
  with check (true);

create policy "Public can read customers"
  on customers for select
  using (true);

create policy "Public can update customers"
  on customers for update
  using (true);

-- Messages table
create policy "Public can insert messages"
  on messages for insert
  with check (true);

create policy "Public can read messages"
  on messages for select
  using (true);

create policy "Public can update messages"
  on messages for update
  using (true);

create policy "Public can delete messages"
  on messages for delete
  using (true);

-- ── DONE ─────────────────────────────────────────────────────
-- Your database is ready!

-- ── MIGRATION: Add new columns if upgrading from earlier version ──
-- Run these if your orders table already exists:
alter table orders add column if not exists brand text default '';
alter table orders add column if not exists shirt_style text default 'no-pocket';
alter table orders add column if not exists placement text default '';

-- ── MIGRATION: Add Stripe payment columns ──
alter table orders add column if not exists stripe_session_id text default '';
alter table orders add column if not exists amount_paid numeric default 0;
alter table orders add column if not exists shipping_address text default '';
alter table orders add column if not exists email text default '';

-- ── MIGRATION: Lock down orders/customers/messages ──────────────
-- The original policies above (using (true) for select/insert/update/delete)
-- let anyone with the public anon key read and modify every customer name,
-- phone number, order, and message, and the app fetched all three tables in
-- full on every page load. All reads and writes now go through Netlify
-- functions (lookup-customer, admin-data, admin-mutate, send-message-email,
-- stripe-webhook) using the service role key, which bypasses RLS, so the
-- anon role needs none of its own access to these three tables anymore.
-- Run this once to drop the old wide-open policies; it leaves RLS enabled
-- with no anon policies, which means the anon key can no longer read or
-- write these tables at all.
drop policy if exists "Public can insert orders"    on orders;
drop policy if exists "Public can read own orders"  on orders;
drop policy if exists "Public can update orders"    on orders;
drop policy if exists "Public can delete orders"    on orders;
drop policy if exists "Public can insert customers" on customers;
drop policy if exists "Public can read customers"   on customers;
drop policy if exists "Public can update customers" on customers;
drop policy if exists "Public can insert messages"  on messages;
drop policy if exists "Public can read messages"    on messages;
drop policy if exists "Public can update messages"  on messages;
drop policy if exists "Public can delete messages"  on messages;
