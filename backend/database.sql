-- ─────────────────────────────────────────────
-- CampusNest Database Schema
-- Run this in: Supabase → SQL Editor → New Query
-- ─────────────────────────────────────────────


-- 1. USERS TABLE
create table users (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  phone      text unique not null,
  password   text not null,
  role       text check (role in ('student', 'owner')) not null,
  created_at timestamp default now()
);


-- 2. LISTINGS TABLE
create table listings (
  id            uuid default gen_random_uuid() primary key,
  owner_id      uuid references users(id) on delete cascade,
  title         text not null,
  type          text check (type in ('flat', 'pg', 'hostel', 'room')) not null,
  price         integer not null,          -- monthly rent in ₹
  area          text,                      -- e.g. "BRS Nagar"
  city          text default 'Ludhiana',
  description   text,
  features      text[],                    -- e.g. {'WiFi','AC','Meals'}
  image_url     text,                      -- Cloudinary image link
  owner_name    text not null,
  owner_phone   text not null,
  is_active     boolean default false,     -- true after payment
  is_verified   boolean default false,     -- true after admin check
  created_at    timestamp default now()
);


-- 3. PAYMENTS TABLE
create table payments (
  id                   uuid default gen_random_uuid() primary key,
  listing_id           uuid references listings(id) on delete cascade,
  razorpay_order_id    text,
  razorpay_payment_id  text,
  amount               integer not null,   -- 100 or 200
  plan                 text check (plan in ('basic', 'featured')),
  status               text default 'pending',  -- pending | paid
  created_at           timestamp default now()
);


-- ─────────────────────────────────────────────
-- SAMPLE DATA (optional, for testing)
-- ─────────────────────────────────────────────

insert into users (name, phone, password, role) values
  ('Test Student', '9876543210', 'pass123', 'student'),
  ('Test Owner',   '9876543211', 'pass123', 'owner');

insert into listings (owner_id, title, type, price, area, description, features, owner_name, owner_phone, is_active, is_verified)
values (
  (select id from users where phone = '9876543211'),
  '2BHK Furnished Flat Near PAU',
  'flat',
  6500,
  'Sarabha Nagar',
  'Well furnished 2BHK flat, close to PAU main gate. All amenities included.',
  ARRAY['WiFi', 'AC', 'Furnished', 'Parking'],
  'Test Owner',
  '9876543211',
  true,
  true
);