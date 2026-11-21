# Unified Member Marketplace — Backend & Admin Handoff

**Project:** Addis Repair · **Date:** 2026-11-20 · **Applies to:** Flutter app (`E-com-app`) and website (`Ecommerce-site`)

This architecture **supersedes all earlier Buyer Mode / Seller Mode instructions.** The same document is in both repositories.

> Both frontends currently use mock repositories (and, where it was already wired, the existing Supabase tables). The endpoint names below are **proposals** for the backend teammate, not existing APIs. **The frontend is not the security boundary**: every rule below must be enforced by the backend.

---

## 1. Architecture summary

| Concept | Rule |
|---|---|
| Accounts | One member account per person: one registration, one profile, one login, one inbox. Only `admin` is a separate role. |
| Verification | Done **once**, at registration. Status: `pending` → `approved` / `rejected`; `approved` → `suspended` → `approved` (reinstate). Only admins change it. |
| Access | Only `approved` members can contact members, publish, manage their ads and report listings. Pending, rejected and suspended members see a status screen. |
| Listings | Any approved member can publish. Listings go **live immediately** (`active`). **There is no per-listing admin approval.** |
| Listing states | `active`, `hidden` (by owner or moderator), `suspended` (moderator), `removed` (moderator), `draft` (owner, app only). Sold out / available are separate flags (`is_sold_out`, `is_available`, `quantity`). |
| Reports | Any approved member can report a listing they do not own. A report only creates a moderation record. It **never** hides or removes a listing. |
| Admin work | **A. Member verification**, once per member. **B. Listing moderation**, only for reported listings or listings that need attention. |
| Commerce | Contact-based marketplace (call / message). No cart, checkout, payment, orders or order tracking. |

Inside a conversation, `buyer_*` means *the member who enquired* and `seller_*` means *the member who owns the listing*. These are per-conversation sides, not account types.

---

## 2. Data model

### 2.1 Member (`profiles`)
| Field | Type | Notes |
|---|---|---|
| `id` | text/uuid | Should map to `auth.users.id`. |
| `name`, `email`, `phone` | text | Phone uses Ethiopian format `+251 9X XXX XXXX`. |
| `role` | `admin` \| `member` | Legacy `buyer`/`seller` are read as `member`. |
| `status` | `pending` \| `approved` \| `rejected` \| `suspended` | Legacy `active` is read as `approved`. Unknown values are treated as **pending**, never approved. |
| `verification_details` | jsonb | See 2.2. |
| `verification_note` | text | Reason shown to rejected or suspended members. |
| `city`, `sub_city`, `address_description`, `latitude`, `longitude` | | The member's current / browsing location. Optional. |

### 2.2 Verification details (submitted once at registration)
```json
{
  "industryRole": "repairTechnician | repairShopOwner | sparePartsSupplier | accessoriesAndToolsSupplier | trainerOrInstructor | otherIndustryConnection",
  "yearsOfExperience": 4,
  "workplaceName": "Bole Mobile Repair Center",
  "industryDescription": "Screen, battery and motherboard repairs",
  "idType": "nationalId | kebeleId | passport | drivingLicense",
  "idNumber": "…",
  "tradeLicenseNumber": "optional",
  "referenceName": "optional",
  "referencePhone": "optional",
  "submittedAt": "ISO-8601"
}
```
The website writes the same fields using snake_case enum values (`repair_technician`, `national_id`, …). **Decision needed:** pick one casing. ID numbers are sensitive: store them encrypted and show them masked in the admin UI. Document image upload is **not** implemented yet.

### 2.3 Member business profile (current `seller_profiles` table)
These are the member's public business/shop details and the default location for their ads: `store_name` (business name), `business_description`, `phone`, `email`, `city`, `sub_city`, `address_description`, optional `latitude`/`longitude`, `service_coverage`.
It **has no approval status** of its own. Suggested rename: `member_business_profiles`.

### 2.4 Listing (`products`)
These fields are unchanged from the previous handoff, plus:
- `status`: `active | hidden | suspended | removed | draft`. Legacy values are read as follows: `approved`/`pending` → `active`, `rejected` → `removed`.
- `moderation_note`: shown to the owner (currently stored in `rejection_reason`).
- `condition`: **required** for physical products (`brandNew` | `used`). It **must be null** for services and posts.
- `listing_type`: `New spares | Used spares | Repair tools | Services | Posts`. Legacy values are `product | service`.
- Images are required for products and posts, and optional for services.

### 2.5 Report (`reported_items`)
| Field | Notes |
|---|---|
| `id`, `target_type` (`product`), `target_id`, `target_name` | |
| `reporter_id`, `reporter_name`, `listing_owner_id` | |
| `reason_code` | `fake_or_misleading`, `incorrect_price`, `incorrect_information`, `duplicate_listing`, `suspicious_activity`, `other` |
| `details` | Optional, max 500 characters. |
| `status` | `pending`, `under_review`, `resolved`, `dismissed` |
| `resolution_action` | `no_action`, `hide_listing`, `suspend_listing`, `remove_listing`, `restore_listing` |
| `resolution_note`, `resolved_at`, `resolved_by` | |

The proposed schema change is in `supabase/migrations/20261120_unified_member_architecture.sql`. It has **not been applied**: the frontends fall back to legacy values until it is.

---

## 3. Backend API requirements (proposed)

### Members
| Method & path | Who | Rules |
|---|---|---|
| `POST /members/register` | public | Creates **one** account with `status = pending`. Rejects duplicate email or phone. Never accepts `status` or `role` from the client. |
| `GET /members/me` | member | Returns the account, including `status` and `verification_note`. The apps poll this to refresh their status screen. |
| `PATCH /members/me` | member | Profile, business details and locations only. **Cannot** change `status`, `role` or `verification_*`. |
| `GET /members/{id}` | anyone | Public profile, only for `approved` members. |

### Listings
| Method & path | Who | Rules |
|---|---|---|
| `GET /listings` | anyone | Returns `active` listings only. Query params: `q`, `kind=product\|service`, `listing_type`, `condition=brandNew\|used` (products only), `city`, `sub_city`, `near_lat`, `near_lng`, `radius_km`, `sort=recent\|nearest\|price_low\|price_high\|popular`, `in_stock`, `min_price`, `max_price`. Returns `distance_km` only when both points are known. |
| `POST /listings` | approved member | Saved as `active` immediately; `seller_id` comes from the token. Validates the condition rule (2.4). Returns **403** with a message if the member is not approved. |
| `PATCH /listings/{id}` | owner | Owner can edit, set `hidden`/`active` and change sold-out/availability. Owner **cannot** set or undo `suspended`/`removed`, and cannot unhide a listing a moderator hid. |
| `DELETE /listings/{id}` | owner / admin | |
| `GET /members/me/listings` | member | My Ads: every status, including `moderation_note`. |

### Reports
| Method & path | Who | Rules |
|---|---|---|
| `POST /listings/{id}/reports` | approved member | `reason_code` is required and `details` is optional (≤500 characters). Returns 403 for the member's own listing, and **409** if the member already has an open report on that listing. **Must not change the listing.** Notifies admins. |
| `GET /listings/{id}/reports/mine` | member | Returns whether the member has an open report, so the UI can prevent duplicates. |

### Messaging
These endpoints are unchanged. Each conversation has two members, one per side, and a member's inbox returns conversations from **both** sides (`buyer_id = me OR seller_id = me`).

---

## 4. Admin dashboard requirements (for the admin teammate)

### A. Member verification (one time)
- **Queue** of `pending` members showing personal and contact details, industry role, years of experience, workplace, description, masked ID, trade licence, reference and shop location.
- **Approve** sets `approved`, notifies the member and records `verified_at`/`verified_by`.
- **Reject (reason required)** sets `rejected`, stores `verification_note` and notifies the member.
- **Suspend (reason required) / Reinstate** an existing member.
- **Member directory** filtered by status.
- **Never** a "seller approval" or a second verification for posting.

### B. Report management and listing moderation
- **Reported listings:** listings with open reports, newest activity first, with counts and reasons.
- **Report detail:** reason, additional details, reporter, date, and the full **report history** for that listing.
- **Listing and owner information:** title, type, price, location, current status, and the owner's name, contacts, verification status and active-ad count.
- **Actions:**
  - **Hide**, **Suspend** or **Remove** the listing (note required, shown to the owner).
  - **Restore** a hidden, suspended or removed listing.
  - **Resolve** with the action taken (this closes all open reports on the listing), or **Dismiss**.
- **Audit log** of every verification and moderation action.
- **No queue that approves new listings.**

Proposed admin endpoints:
- `GET /admin/members?status=`
- `POST /admin/members/{id}/approve | reject | suspend | reinstate`
- `GET /admin/reports?status=`
- `GET /admin/listings/{id}/reports`
- `POST /admin/listings/{id}/hide | suspend | remove | restore`
- `POST /admin/reports/{id}/resolve | dismiss`

The Flutter app documents this boundary as the `AdminModerationRepository` interface in `lib/data/repositories/admin_moderation_repository.dart`. It is intentionally **not implemented** in the app. The website (`Ecommerce-site`) already includes these admin screens, working against mock data and Supabase:
- `/admin/members/verification`
- `/admin/members`
- `/admin/reports/items`
- `/admin/products`

---

## 5. Open questions and assumptions
1. **Listing types.** The existing five types (New spares, Used spares, Repair tools, Services, Posts) were kept. New/Used is a required, separate condition field for every physical-product type.
2. **Legacy `pending` listings** created under the old approval model are now treated as **active**, because no approval exists any more. Confirm this with the team.
3. **Hidden on a legacy database.** Until the migration runs, an owner-hidden listing is stored as `draft`, which is the only non-public legacy value.
4. **Guest browsing.** The website still lets signed-out visitors and pending members browse public listings, as before; only contacting, posting and reporting require approval. The mobile app shows pending members only their status screen. Confirm whether the website should also hide browsing.
5. **Security.** Supabase currently has permissive RLS (`using (true)`), so the rules above are enforced **only in the UI** until the backend policies in the migration's section 4 are added.
6. **Profile ids.** `profiles.id` is a text id that is not linked to `auth.users`. This must be resolved for token-based authorisation.
7. **Verification evidence.** Decide whether ID or trade-licence photos must be uploaded. The UI collects numbers only.
