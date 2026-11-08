-- ==============================================================================
-- ADDIS REPAIR / AGORA MARKETPLACE — COMPREHENSIVE SUPABASE DATABASE SCHEMA
-- Version: 3.0 (PostgreSQL / Supabase Production-Ready)
-- Target: Supabase SQL Editor (Run in browser in one click)
-- Compatible with: React Web/Admin Portal + Flutter Mobile App
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. ENUM TYPES
-- ==============================================================================
do $$ begin
  create type user_role_type as enum ('admin', 'seller', 'buyer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status_type as enum ('active', 'pending', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type seller_status_type as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status_type as enum ('pending', 'approved', 'rejected', 'draft');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_type_enum as enum ('product', 'service');
exception when duplicate_object then null; end $$;

do $$ begin
  create type service_coverage_enum as enum ('atLocation', 'travelsToCustomer', 'selectedAreas');
exception when duplicate_object then null; end $$;

-- ==============================================================================
-- 3. PROFILES TABLE (Users & Auth metadata)
-- ==============================================================================
create table if not exists public.profiles (
  id text primary key,
  name text not null,
  email text not null unique,
  phone text,
  role text not null default 'buyer' check (role in ('admin', 'seller', 'buyer')),
  status text not null default 'active' check (status in ('active', 'pending', 'rejected', 'suspended')),
  avatar_url text,
  city text default 'Addis Ababa',
  sub_city text default 'Bole',
  address_description text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 4. SELLER PROFILES TABLE
-- ==============================================================================
create table if not exists public.seller_profiles (
  id text primary key,
  user_id text not null,
  store_name text not null,
  business_description text not null,
  phone text not null,
  email text,
  city text not null default 'Addis Ababa',
  sub_city text not null default 'Bole',
  address_description text,
  latitude double precision,
  longitude double precision,
  location text,
  logo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  rating double precision default 4.8,
  total_listings integer default 0,
  is_verified boolean default false,
  service_coverage text default 'atLocation' check (service_coverage in ('atLocation', 'travelsToCustomer', 'selectedAreas')),
  service_coverage_note text,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_seller_profiles_user on public.seller_profiles(user_id);
create index if not exists idx_seller_profiles_status on public.seller_profiles(status);

-- ==============================================================================
-- 5. BUYER PROFILES TABLE
-- ==============================================================================
create table if not exists public.buyer_profiles (
  id text primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  bio text,
  delivery_address text,
  delivery_city text,
  delivery_subcity text,
  delivery_notes text,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_buyer_profiles_user on public.buyer_profiles(user_id);

-- ==============================================================================
-- 6. CATEGORIES TABLE
-- ==============================================================================
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text,
  icon_name text default 'Package',
  image_url text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_categories_slug on public.categories(slug);

-- ==============================================================================
-- 7. PRODUCTS & SERVICES LISTING TABLE
-- ==============================================================================
create table if not exists public.products (
  id text primary key,
  seller_id text not null,
  seller_name text not null,
  seller_phone text not null,
  seller_location text,
  listing_type text not null default 'product' check (listing_type in ('product', 'service')),
  name text not null,
  description text not null,
  price numeric(12, 2) not null,
  is_starting_price boolean default false,
  category_id text not null references public.categories(id) on delete restrict,
  category_name text,
  condition text check (condition in ('brandNew', 'used', 'new', 'like_new', 'good', 'fair')),
  quantity integer default 1,
  images text[] default '{}',
  service_coverage text check (service_coverage in ('atLocation', 'travelsToCustomer', 'selectedAreas')),
  service_coverage_note text,
  location_city text default 'Addis Ababa',
  location_sub_city text default 'Bole',
  address_description text,
  latitude double precision,
  longitude double precision,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected', 'draft')),
  rejection_reason text,
  is_featured boolean default false,
  is_sold_out boolean default false,
  is_available boolean default true,
  views_count integer default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null,
  updated_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_seller on public.products(seller_id);
create index if not exists idx_products_type on public.products(listing_type);
create index if not exists idx_products_location on public.products(location_city, location_sub_city);

-- ==============================================================================
-- 8. CONVERSATIONS TABLE (Buyer <-> Seller chat threads)
-- ==============================================================================
create table if not exists public.conversations (
  id text primary key,
  buyer_id text not null,
  buyer_name text not null,
  seller_id text not null,
  seller_name text not null,
  product_id text not null,
  product_name text not null,
  product_image text,
  product_price numeric(12, 2) default 0,
  last_message text default '',
  last_message_at timestamptz default timezone('utc'::text, now()) not null,
  unread_count_buyer integer default 0,
  unread_count_seller integer default 0,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_conversations_buyer on public.conversations(buyer_id);
create index if not exists idx_conversations_seller on public.conversations(seller_id);
create index if not exists idx_conversations_product on public.conversations(product_id);

-- ==============================================================================
-- 9. MESSAGES TABLE
-- ==============================================================================
create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  sender_id text not null,
  sender_name text not null,
  sender_role text default 'buyer',
  content text not null,
  delivery_location_snippet jsonb,
  is_read boolean default false,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_messages_conv on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at);

-- ==============================================================================
-- 10. NOTIFICATIONS TABLE
-- ==============================================================================
create table if not exists public.notifications (
  id text primary key,
  user_id text not null,
  title text not null,
  message text not null,
  type text not null,
  is_read boolean default false,
  link_to text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_notifications_user on public.notifications(user_id);

-- ==============================================================================
-- 11. REPORTED ITEMS TABLE (Admin Moderation)
-- ==============================================================================
create table if not exists public.reported_items (
  id text primary key,
  target_type text not null check (target_type in ('product', 'user')),
  target_id text not null,
  target_name text not null,
  reporter_name text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  resolution_action text,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

-- ==============================================================================
-- 12. ACTIVITY LOGS TABLE (Admin Audit)
-- ==============================================================================
create table if not exists public.activity_logs (
  id text primary key,
  actor_name text not null,
  actor_role text not null,
  action text not null,
  details text not null,
  created_at timestamptz default timezone('utc'::text, now()) not null
);

create index if not exists idx_activity_logs_created on public.activity_logs(created_at desc);

-- ==============================================================================
-- 13. SPATIAL & DISTANCE FUNCTIONS (Haversine formula in PostgreSQL)
-- ==============================================================================
create or replace function public.calculate_distance_km(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language plpgsql
immutable
as $$
declare
  r constant double precision := 6371.0; -- Earth radius in km
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
begin
  if lat1 is null or lon1 is null or lat2 is null or lon2 is null then
    return null;
  end if;
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2.0)^2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2.0)^2;
  c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
  return round((r * c)::numeric, 2)::double precision;
end;
$$;

-- Trigger to automatically update conversation preview when a new message is inserted
create or replace function public.handle_new_message()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.conversations
  set
    last_message = new.content,
    last_message_at = new.created_at,
    unread_count_seller = case when new.sender_role = 'buyer' then coalesce(unread_count_seller, 0) + 1 else coalesce(unread_count_seller, 0) end,
    unread_count_buyer = case when new.sender_role = 'seller' then coalesce(unread_count_buyer, 0) + 1 else coalesce(unread_count_buyer, 0) end
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_new_message on public.messages;
create trigger on_new_message
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- Function to increment product views count
create or replace function public.increment_product_views(product_id_param text)
returns void
language plpgsql
security definer
as $$
begin
  update public.products
  set views_count = coalesce(views_count, 0) + 1
  where id = product_id_param;
end;
$$;

-- ==============================================================================
-- 14. COMPATIBILITY VIEWS (Unified aliases for React & Flutter models)
-- ==============================================================================
create or replace view public.product_listings as
select
  p.id,
  p.name as title,
  p.name,
  p.description,
  p.price,
  p.is_starting_price,
  p.category_id,
  coalesce(p.category_name, c.name) as category_name,
  p.listing_type,
  p.condition,
  p.quantity,
  p.images,
  p.images as image_urls,
  p.service_coverage,
  p.service_coverage_note,
  p.location_city,
  p.location_sub_city,
  p.address_description,
  p.latitude,
  p.longitude,
  p.seller_id,
  p.seller_name,
  p.seller_phone,
  p.is_sold_out,
  p.is_available,
  p.status as moderation_status,
  p.status,
  p.rejection_reason,
  p.views_count,
  p.is_featured,
  p.created_at,
  p.updated_at
from public.products p
left join public.categories c on c.id = p.category_id;

-- ==============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- Permissive policies for seamless web/mobile client interaction
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.buyer_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reported_items enable row level security;
alter table public.activity_logs enable row level security;

-- Categories
drop policy if exists "Allow all operations categories" on public.categories;
create policy "Allow all operations categories" on public.categories for all using (true) with check (true);

-- Profiles
drop policy if exists "Allow all operations profiles" on public.profiles;
create policy "Allow all operations profiles" on public.profiles for all using (true) with check (true);

-- Seller Profiles
drop policy if exists "Allow all operations seller_profiles" on public.seller_profiles;
create policy "Allow all operations seller_profiles" on public.seller_profiles for all using (true) with check (true);

-- Buyer Profiles
drop policy if exists "Allow all operations buyer_profiles" on public.buyer_profiles;
create policy "Allow all operations buyer_profiles" on public.buyer_profiles for all using (true) with check (true);

-- Products
drop policy if exists "Allow all operations products" on public.products;
create policy "Allow all operations products" on public.products for all using (true) with check (true);

-- Conversations
drop policy if exists "Allow all operations conversations" on public.conversations;
create policy "Allow all operations conversations" on public.conversations for all using (true) with check (true);

-- Messages
drop policy if exists "Allow all operations messages" on public.messages;
create policy "Allow all operations messages" on public.messages for all using (true) with check (true);

-- Notifications
drop policy if exists "Allow all operations notifications" on public.notifications;
create policy "Allow all operations notifications" on public.notifications for all using (true) with check (true);

-- Reported Items
drop policy if exists "Allow all operations reported_items" on public.reported_items;
create policy "Allow all operations reported_items" on public.reported_items for all using (true) with check (true);

-- Activity Logs
drop policy if exists "Allow all operations activity_logs" on public.activity_logs;
create policy "Allow all operations activity_logs" on public.activity_logs for all using (true) with check (true);

-- ==============================================================================
-- 16. REALTIME ENABLEMENT
-- ==============================================================================
do $$ begin
  alter publication supabase_realtime add table public.categories;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.products;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.conversations;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when others then null; end $$;

-- ==============================================================================
-- 17. STORAGE BUCKETS (Product Images & Avatars)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Public Access listing-images" on storage.objects;
create policy "Public Access listing-images" on storage.objects for select using (bucket_id = 'listing-images');

drop policy if exists "Allow all uploads listing-images" on storage.objects;
create policy "Allow all uploads listing-images" on storage.objects for insert with check (bucket_id = 'listing-images');

drop policy if exists "Allow all updates listing-images" on storage.objects;
create policy "Allow all updates listing-images" on storage.objects for update using (bucket_id = 'listing-images');

drop policy if exists "Public Access avatars" on storage.objects;
create policy "Public Access avatars" on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Allow all uploads avatars" on storage.objects;
create policy "Allow all uploads avatars" on storage.objects for insert with check (bucket_id = 'avatars');

-- ==============================================================================
-- 18. SEED DATA (Categories, Verified Sellers, Products, Messages)
-- ==============================================================================

-- Categories
insert into public.categories (id, name, slug, description, icon_name, image_url)
values
  ('cat-1', 'Electronics & Phones', 'electronics-phones', 'Laptops, smartphones, audio gear, and screen repair parts.', 'Laptop', 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&auto=format&fit=crop&q=80'),
  ('cat-2', 'Vehicles & Motors', 'vehicles-motors', 'Cars, motorbikes, replacement spare parts, and engine diagnostics.', 'Car', 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600&auto=format&fit=crop&q=80'),
  ('cat-3', 'Jobs & Services', 'jobs-services', 'Professional repair technicians, motherboard specialists, and home handymen.', 'Wrench', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80'),
  ('cat-4', 'Fashion & Clothes', 'fashion-clothes', 'Traditional Ethiopian Habesha Kemis, shoes, and modern tailoring.', 'Shirt', 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&auto=format&fit=crop&q=80'),
  ('cat-5', 'Home & Furniture', 'home-furniture', 'Sofas, handcrafted dining tables, home appliances, and electrical fixes.', 'Armchair', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80'),
  ('cat-6', 'Property & Houses', 'property-houses', 'Apartments, commercial workshop spaces, and store rentals.', 'Building', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&auto=format&fit=crop&q=80'),
  ('cat-7', 'Agro & Food Products', 'agro-food', 'Authentic Yirgacheffe coffee beans, organic honey, and local grains.', 'Utensils', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80'),
  ('cat-8', 'Accessories & Gear', 'accessories-gear', 'Bags, watch repairs, optical glasses, and specialized tools.', 'Watch', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80')
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  icon_name = excluded.icon_name,
  image_url = excluded.image_url;

-- Sample Users / Profiles
insert into public.profiles (id, name, email, phone, role, status, city, sub_city, address_description, latitude, longitude)
values
  ('user-admin', 'Platform Administrator', 'admin@marketplace.com', '+251900000000', 'admin', 'active', 'Addis Ababa', 'Kirkos', 'Addis Repair HQ, Mexico Square', 9.0080, 38.7600),
  ('user-seller-1', 'Yonas Tadesse (Bole Tech)', 'yonas.t@example.com', '+251911234567', 'seller', 'active', 'Addis Ababa', 'Bole', 'Near Edna Mall, Camera Building 2nd Floor', 8.9950, 38.7880),
  ('user-seller-2', 'Almaz Tefera (Kazanchis Express)', 'almaz@techstore.et', '+251922334455', 'seller', 'active', 'Addis Ababa', 'Kazanchis', 'Near UNECA, Mina Building 3rd Floor', 9.0180, 38.7690),
  ('user-buyer-1', 'Abebe Kebede', 'abebe.k@example.com', '+251933445566', 'buyer', 'active', 'Addis Ababa', 'Bole', 'Medhanialem Area', 9.0020, 38.7840)
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  phone = excluded.phone,
  role = excluded.role,
  status = excluded.status,
  latitude = excluded.latitude,
  longitude = excluded.longitude;

-- Seller Profiles with Real Map Coordinates
insert into public.seller_profiles (id, user_id, store_name, business_description, phone, email, city, sub_city, address_description, latitude, longitude, location, status, rating, total_listings, is_verified, service_coverage)
values
  ('seller_01', 'user-seller-1', 'Bole Tech & Gadgets', 'Authentic certified used and brand new smartphones, MacBook laptops, and screen replacements with warranty.', '+251911234567', 'sales@boletech.et', 'Addis Ababa', 'Bole', 'Near Edna Mall, Suite 204', 8.9950, 38.7880, 'Bole, Addis Ababa', 'approved', 4.9, 12, true, 'atLocation'),
  ('seller_02', 'user-seller-2', 'Sheger Auto & Electrical Repair', 'Professional diagnostics, ECU repair, alternator rewinding, and genuine spare parts in Piazza.', '+251922334455', 'contact@shegerauto.et', 'Addis Ababa', 'Arada (Piazza)', 'Opposite Cinema Empire, Shop #12', 9.0350, 38.7520, 'Arada (Piazza), Addis Ababa', 'approved', 4.8, 8, true, 'travelsToCustomer')
on conflict (id) do update set
  store_name = excluded.store_name,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  status = excluded.status;

-- Sample Products & Services
insert into public.products (
  id, seller_id, seller_name, seller_phone, seller_location,
  listing_type, name, description, price, is_starting_price,
  category_id, category_name, condition, quantity, images,
  service_coverage, service_coverage_note, location_city, location_sub_city,
  address_description, latitude, longitude, status, is_featured, is_available, views_count
)
values
  (
    'prod-01', 'user-seller-1', 'Bole Tech & Gadgets', '+251911234567', 'Bole, Addis Ababa',
    'product', 'iPhone 15 Pro Max - 256GB Natural Titanium',
    'Brand new sealed iPhone 15 Pro Max with 1 year Apple international warranty. Physical dual SIM version with invoice.',
    145000.00, false,
    'cat-1', 'Electronics & Phones', 'brandNew', 5,
    array['https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80'],
    null, null, 'Addis Ababa', 'Bole', 'Edna Mall Area, Suite 204',
    8.9950, 38.7880, 'approved', true, true, 420
  ),
  (
    'prod-02', 'user-seller-1', 'Bole Tech & Gadgets', '+251911234567', 'Bole, Addis Ababa',
    'service', 'MacBook & Laptop Motherboard Chip-Level Repair',
    'Professional repair for liquid damage, short circuits, no display, and battery charging circuit repairs. Same-day diagnostics.',
    3500.00, true,
    'cat-3', 'Jobs & Services', null, 1,
    array['https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'],
    'atLocation', 'Workshop open Mon-Sat 8:30 AM to 7:00 PM in Bole', 'Addis Ababa', 'Bole',
    'Near Edna Mall, Camera Building 2nd Floor', 8.9950, 38.7880, 'approved', true, true, 890
  ),
  (
    'prod-03', 'user-seller-2', 'Sheger Auto & Electrical Repair', '+251922334455', 'Arada (Piazza), Addis Ababa',
    'service', 'Automotive Alternator & Starter Motor Rewinding',
    'Expert electric overhaul for Toyota, Hyundai, and Suzuki models. Mobile diagnostics available across central Addis.',
    2500.00, true,
    'cat-2', 'Vehicles & Motors', null, 1,
    array['https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80'],
    'travelsToCustomer', 'We travel to customer location within Addis Ababa', 'Addis Ababa', 'Arada (Piazza)',
    'Opposite Cinema Empire', 9.0350, 38.7520, 'approved', false, true, 310
  ),
  (
    'prod-04', 'user-seller-1', 'Bole Tech & Gadgets', '+251911234567', 'Bole, Addis Ababa',
    'product', 'Samsung Galaxy S24 Ultra - 512GB Titanium Black',
    'Clean condition certified phone with charger and screen protector included. 3 months shop replacement warranty.',
    128000.00, false,
    'cat-1', 'Electronics & Phones', 'used', 2,
    array['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=800&q=80'],
    null, null, 'Addis Ababa', 'Bole', 'Edna Mall Area',
    8.9950, 38.7880, 'approved', false, true, 260
  )
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  status = excluded.status;

-- Sample Conversations & Messages
insert into public.conversations (
  id, buyer_id, buyer_name, seller_id, seller_name, product_id,
  product_name, product_image, product_price, last_message, last_message_at,
  unread_count_buyer, unread_count_seller
)
values
  (
    'conv-01', 'user-buyer-1', 'Abebe Kebede', 'user-seller-1', 'Bole Tech & Gadgets',
    'prod-01', 'iPhone 15 Pro Max - 256GB Natural Titanium',
    'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=800&q=80',
    145000.00, 'Yes, the shop is open today until 7 PM. You are welcome to inspect it.',
    timezone('utc'::text, now()), 0, 0
  )
on conflict (id) do update set
  last_message = excluded.last_message;

insert into public.messages (
  id, conversation_id, sender_id, sender_name, sender_role, content, is_read
)
values
  ('msg-01', 'conv-01', 'user-buyer-1', 'Abebe Kebede', 'buyer', 'Hello, is this iPhone still available in your Bole store?', true),
  ('msg-02', 'conv-01', 'user-seller-1', 'Bole Tech & Gadgets', 'seller', 'Yes, the shop is open today until 7 PM. You are welcome to inspect it.', true)
on conflict (id) do nothing;

-- Admin Activity Log Seed
insert into public.activity_logs (id, actor_name, actor_role, action, details)
values
  ('act-01', 'Platform Administrator', 'admin', 'SYSTEM_INITIALIZATION', 'Supabase database initialized with categories, verified sellers, and sample products.')
on conflict (id) do nothing;
