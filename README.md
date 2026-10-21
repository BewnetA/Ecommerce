# Modern E-Commerce Marketplace Application

A full-featured multi-vendor e-commerce marketplace frontend built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **React Router**, implementing all initial-version specifications from the Project Requirements Document (PRD).

---

## 🌟 Architecture & Features Overview

### 1. Three Core User Roles & Public Marketplace
- **Public / Guest:**
  - Responsive marketplace homepage with hero promotions, categories grid, featured products, and popular items.
  - Category exploration (`/categories`, `/categories/:slug`) with category icons and product counts.
  - Search and multi-criteria filtering (`/products`) with query search, price range, condition, and sort order.
  - Dedicated product detail page (`/products/:id`) with image gallery, seller badge, stock status, direct phone dialer (`tel:`), and buyer inquiry modal.
  - Public seller profile page (`/sellers/:id`) showing seller storefront, location, direct phone call, and their approved product catalog.
  - **Strict Visibility Rule:** Only approved products belonging to approved sellers are visible publicly or in search results.

- **Buyer / Customer:**
  - Registration and authentication (`/register/buyer`, `/login`).
  - Customer dashboard (`/buyer/dashboard`) and profile manager (`/buyer/profile`).
  - Permission-based Location Manager (`/buyer/location`):
    - Browser Geolocation API request triggered only on explicit user click (never on page load).
    - Manual address entry fallback (Addis Ababa subcity, specific neighborhood, delivery notes).
    - Confirmation before sharing delivery coordinates with merchants.
  - Real-time product-related messaging threads (`/messages`, `/messages/:id`) with pre-canned inquiry quick prompts ("Is this available?", "Can you deliver?").
  - In-app notification center (`/notifications`) with unread counters and direct item links.

- **Seller / Merchant:**
  - Seller onboarding with store name, phone, email, bio, and business location (`/register/seller`).
  - Seller starts in `pending` status until reviewed by Platform Admin.
  - Protected seller portal (`/seller/dashboard`):
    - Real-time inventory metrics (total products, approved live, pending approval, rejected).
    - Product management table (`/seller/products`) with status badges and rejection explanation view.
    - Product creation (`/seller/products/new`) with multi-image support, category taxonomy, condition, stock, and contact info.
    - Product modification (`/seller/products/:id/edit`): **Re-moderation Rule:** Editing an approved product automatically resets its status to `pending` until re-approved by Admin.
    - Seller storefront profile settings (`/seller/profile`).

- **Platform Administrator:**
  - Dedicated governance portal (`/admin`):
    - Live platform metrics calculated directly from mock storage (total sellers, buyers, products, pending approval queues, approved live).
    - **Seller Approval Queue (`/admin/sellers/approvals`):** Review merchant applications, approve, or reject with mandatory written reason.
    - **Product Approval Queue (`/admin/products/approvals`):** Inspect submitted items, price reasonableness, approve, or reject with mandatory reason.
    - **Seller Management (`/admin/sellers`):** Active/suspended seller toggling, store directory.
    - **Product Catalog Management (`/admin/products`):** Comprehensive catalog oversight, inline moderation, and deletion.
    - **Category Taxonomy Management (`/admin/categories`):** Add, update, and delete categories with delete guard (blocks deleting categories with active products).
    - **Buyer Management (`/admin/buyers`):** Customer directory, inquiry counts, and saved delivery area profiles.
    - **User Administration (`/admin/users`):** Unified user directory with account status controls.
    - **Safety Reports & Activity Audit Log (`/admin/reports`, `/admin/reports/items`):** Platform audit events and safety moderation.

---

## 🚀 Pre-Configured Demo Accounts

A persistent **Demo Account Quick Switcher** is rendered in the top header and bottom bar, allowing instant 1-click role switching between any role without needing to re-type passwords:

| Role | Name | Email | Password | Status / Permissions |
|---|---|---|---|---|
| **Platform Admin** | Super Admin | `admin@marketplace.com` | `admin123` | Full governance & moderation access |
| **Approved Seller** | Dawit Bekele (Addis Electronics) | `dawit@addisstore.com` | `seller123` | Active store, published catalog |
| **Pending Seller** | Tigist Alemu (Crafted Heritage) | `tigist@heritage.com` | `seller123` | Awaiting admin review |
| **Rejected Seller** | Kebede Tadesse (Kebede Supplies) | `kebede@supplies.com` | `seller123` | Rejected with recorded reason |
| **Suspended Seller** | Almaz Wolde (Almaz Textiles) | `almaz@textiles.com` | `seller123` | Suspended due to safety reports |
| **Buyer / Customer** | Bethlehem Tadesse | `bethlehem@gmail.com` | `buyer123` | Active customer with delivery location |

You can also use the **"Reset Demo Data"** action in the header or bottom banner to instantly restore the mock database to clean factory seed data at any time.

---

## 🛠️ Tech Stack & Scripts

- **Framework:** React 19 + TypeScript + Vite 8
- **Styling:** Tailwind CSS 4 + Lucide React Icons + Sonner Toasts
- **Routing:** React Router 7 with declarative layout hierarchies and role-based guards
- **Mock Service Architecture:** Strongly typed mock API services (`src/services/api/*`) backed by `localStorage` persistence and simulated async latency.

### Commands

```bash
# Install dependencies
npm install

# Start development server on port 5173
npm run dev

# Run TypeScript check and production build
npm run build

# Run linter
npm run lint

# Preview production build
npm run preview
```

> **Note on Windows PowerShell:** When executing npm commands in PowerShell environments with restricted execution policies, prepend `cmd /c` (e.g. `cmd /c npm run build`).

---

## 📋 Requirements Traceability

See [requirements-traceability.md](docs/requirements-traceability.md) for the complete 25-requirement mapping matrix covering all sections of the Project Requirements Document.
