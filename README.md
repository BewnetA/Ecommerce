# Modern E-Commerce Marketplace Application

A full-featured multi-vendor e-commerce marketplace frontend built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and **React Router**, implementing all initial-version specifications from the Project Requirements Document (PRD).

---

## 🌟 Architecture & Features Overview

### 1. Unified Member Marketplace (one account for everyone)
> This replaces the earlier separate Buyer / Seller roles. See [docs/UNIFIED_MEMBER_HANDOFF.md](docs/UNIFIED_MEMBER_HANDOFF.md).

- **Public / Guest:** marketplace home, search with product vs service, New/Used (products only), location and nearby filters, listing detail pages, public member profiles (`/members/:id`).
- **One registration (`/register`):** personal and contact details, repair-industry connection, one-time verification details, and shop/work location (map coordinates required, chosen on a map or from GPS). New members start as **pending**.
- **Verification status (`/verification-status`):** pending, rejected and suspended members see their status and cannot message, post or report.
- **Approved members (`/account/*`):** Profile (with My Ads), Post Ad, Messages and Notifications. Ads publish **immediately**. Owners can edit, hide/show, mark sold out and delete their own ads. Every listing has a **Report** option (reason + optional details); a report never removes a listing by itself.
- **Administrator (`/admin`):**
  - **Member Verification** (`/admin/members/verification`): one-time approve or reject.
  - **Members** (`/admin/members`): approve, reject, suspend, reinstate.
  - **Reported Listings** (`/admin/reports/items`): reasons, details, report history, listing and owner info, hide/suspend/remove/restore, resolve/dismiss.
  - **Listings** (`/admin/products`).
  - Admins, Reports & Audit.
  - The marketplace has no categories; listings are organised by listing type only.
  - There is no per-listing approval queue.
- Old `/buyer/*`, `/seller/*`, `/register/buyer`, `/register/seller` and `/sellers/:id` links redirect to the unified pages.

---

## 🚀 Demo Data

Mock data lives in `src/data/seedData.ts` and is stored in `localStorage` under a new key, so data from the old buyer/seller version is not reused. Demo members cover the approved, pending, rejected and suspended verification states. Use **"Reset Demo Data"** to restore the seed.

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
