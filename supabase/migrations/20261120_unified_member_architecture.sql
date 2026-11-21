-- ==============================================================================
-- ADDIS REPAIR — UNIFIED MEMBER ARCHITECTURE MIGRATION (2026-11-20)
--
-- PROPOSAL FOR THE BACKEND TEAM. This file has NOT been run against any
-- database. Review it, adapt it, and apply it with your normal process.
--
-- Until it is applied, the mobile app and website keep working against the
-- current schema: they read old and new values, and retry writes with legacy
-- values (e.g. listing status 'approved' instead of 'active') when the new
-- value is rejected by a CHECK constraint.
--
-- Identical copies live in:
--   E-com-app/supabase/migrations/
--   Ecommerce-site/supabase/migrations/
-- ==============================================================================

-- 1. ONE MEMBER ACCOUNT ---------------------------------------------------------
-- Roles: 'admin' or 'member' (legacy 'buyer'/'seller' rows become members).
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'member' where role in ('buyer', 'seller');
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'member'));
alter table public.profiles alter column role set default 'member';

-- One-time verification status: pending | approved | rejected | suspended.
-- ('active' was the legacy value for an approved account.)
alter table public.profiles drop constraint if exists profiles_status_check;
update public.profiles set status = 'approved' where status = 'active';
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected', 'suspended'));
alter table public.profiles alter column status set default 'pending';

alter table public.profiles add column if not exists verification_details jsonb;
alter table public.profiles add column if not exists verification_note text;
alter table public.profiles add column if not exists verified_at timestamptz;
alter table public.profiles add column if not exists verified_by text;

-- The old seller approval status is no longer used: verification lives on
-- profiles.status. seller_profiles now only stores member business / shop
-- details (consider renaming it to member_business_profiles).
alter table public.seller_profiles alter column status drop not null;

-- 2. LISTINGS PUBLISH IMMEDIATELY -----------------------------------------------
-- Status: active | hidden | suspended | removed (+ draft for owner drafts).
-- There is NO pending/approval state for ordinary listings.
alter table public.products drop constraint if exists products_status_check;
update public.products set status = 'active' where status in ('approved', 'pending');
update public.products set status = 'removed' where status = 'rejected';
alter table public.products
  add constraint products_status_check
  check (status in ('active', 'hidden', 'suspended', 'removed', 'draft'));
alter table public.products alter column status set default 'active';
alter table public.products add column if not exists moderation_note text;

-- Listing types used by both frontends (keep legacy 'product'/'service').
alter table public.products drop constraint if exists products_listing_type_check;
alter table public.products
  add constraint products_listing_type_check
  check (listing_type in ('product', 'service', 'New spares', 'Used spares', 'Repair tools', 'Services', 'Posts'));

-- Condition is required for physical products and forbidden for services.
alter table public.products drop constraint if exists products_condition_rule;
alter table public.products
  add constraint products_condition_rule check (
    (listing_type in ('service', 'Services', 'Posts') and condition is null)
    or (listing_type not in ('service', 'Services', 'Posts') and condition in ('brandNew', 'used', 'new'))
  ) not valid; -- validate after cleaning legacy rows: alter table ... validate constraint

-- 3. COMMUNITY REPORTS -----------------------------------------------------------
alter table public.reported_items add column if not exists reason_code text;
alter table public.reported_items add column if not exists details text;
alter table public.reported_items add column if not exists reporter_id text;
alter table public.reported_items add column if not exists listing_owner_id text;
alter table public.reported_items add column if not exists resolution_note text;
alter table public.reported_items add column if not exists resolved_at timestamptz;
alter table public.reported_items add column if not exists resolved_by text;

alter table public.reported_items drop constraint if exists reported_items_status_check;
alter table public.reported_items
  add constraint reported_items_status_check
  check (status in ('pending', 'under_review', 'resolved', 'dismissed'));

alter table public.reported_items drop constraint if exists reported_items_reason_code_check;
alter table public.reported_items
  add constraint reported_items_reason_code_check check (
    reason_code is null or reason_code in (
      'fake_or_misleading', 'incorrect_price', 'incorrect_information',
      'duplicate_listing', 'suspicious_activity', 'other'
    )
  );

-- One open report per member per listing (prevents repeated submissions).
create unique index if not exists uq_open_report_per_member
  on public.reported_items (target_id, reporter_id)
  where status in ('pending', 'under_review') and reporter_id is not null;

create index if not exists idx_reported_items_target on public.reported_items (target_id);
create index if not exists idx_reported_items_status on public.reported_items (status);

-- 4. SECURITY (REQUIRED BEFORE PRODUCTION) --------------------------------------
-- The current schema uses permissive "allow all" RLS policies. The frontends
-- are NOT a security boundary. Replace them with policies that enforce:
--   * profiles: a member can read public fields and update only their own
--     non-security fields; ONLY admins can change role/status/verification_*.
--   * products: INSERT only when the author's profiles.status = 'approved'
--     and seller_id = auth.uid(); UPDATE/DELETE only by the owner, and owners
--     cannot set status to 'suspended'/'removed' or undo those states;
--     admins can moderate any listing. Public SELECT only where status='active'.
--   * reported_items: INSERT only by approved members, reporter_id = auth.uid(),
--     never on their own listing; SELECT/UPDATE only by admins.
--   * A report must never change products.status (no trigger may hide a
--     listing automatically).
-- Note: profiles.id is currently a text id, not auth.users.id; mapping the
-- two is a prerequisite for auth.uid()-based policies.
