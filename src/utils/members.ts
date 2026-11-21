import type {
  IndustryRole,
  ListingStatus,
  ListingType,
  MemberStatus,
  ProductCondition,
  ReportReasonCode,
  ReportStatus,
  UserRole,
  VerificationIdType,
} from '../types';

// ---------------------------------------------------------------------------
// Member roles & verification status
// ---------------------------------------------------------------------------

/** Any non-admin account (legacy `buyer`/`seller` rows included) is a member. */
export function normalizeRole(raw: unknown): UserRole {
  return String(raw || '').toLowerCase() === 'admin' ? 'admin' : 'member';
}

/**
 * Parses backend verification values. `active` is the legacy value for an
 * approved account. Unknown values are treated as pending — never approved.
 */
export function normalizeMemberStatus(raw: unknown): MemberStatus {
  switch (String(raw || '').toLowerCase()) {
    case 'approved':
    case 'active':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'suspended':
      return 'suspended';
    default:
      return 'pending';
  }
}

/** Value for the current `profiles.status` column (uses legacy `active`). */
export function memberStatusToDb(status: MemberStatus): string {
  return status === 'approved' ? 'active' : status;
}

export const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  pending: 'Pending Verification',
  approved: 'Verified Member',
  rejected: 'Verification Rejected',
  suspended: 'Account Suspended',
};

export const INDUSTRY_ROLE_LABELS: Record<IndustryRole, string> = {
  repair_technician: 'Mobile Phone Repair Technician',
  repair_shop_owner: 'Repair Shop Owner / Manager',
  spare_parts_supplier: 'Spare Parts Supplier / Importer',
  tools_equipment_supplier: 'Repair Tools & Equipment Supplier',
  trainer_instructor: 'Repair Trainer / Instructor',
  other_industry_connection: 'Other Repair-Industry Connection',
};

export const ID_TYPE_LABELS: Record<VerificationIdType, string> = {
  national_id: 'National ID (Fayda)',
  kebele_id: 'Kebele ID',
  passport: 'Passport',
  driving_license: 'Driving License',
};

export function maskIdNumber(idNumber: string): string {
  const clean = (idNumber || '').trim();
  if (clean.length <= 4) return clean;
  return `${'•'.repeat(clean.length - 4)}${clean.slice(-4)}`;
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export const LISTING_TYPES: ListingType[] = ['New spares', 'Used spares', 'Repair tools', 'Services', 'Posts'];

export function isServiceListing(type: ListingType | undefined): boolean {
  return type === 'Services';
}

/** Physical items: spare parts and repair tools. */
export function isProductListing(type: ListingType | undefined): boolean {
  return type === 'New spares' || type === 'Used spares' || type === 'Repair tools';
}

export function normalizeListingType(raw: unknown): ListingType {
  const clean = String(raw || '').toLowerCase().replace(/[\s_-]/g, '');
  if (clean === 'usedspares') return 'Used spares';
  if (clean === 'repairtools' || clean === 'tools') return 'Repair tools';
  if (clean === 'services' || clean === 'service') return 'Services';
  if (clean === 'posts' || clean === 'post') return 'Posts';
  return 'New spares';
}

/** Condition implied by a listing type when none is stored. */
export function defaultConditionFor(type: ListingType): ProductCondition | undefined {
  if (type === 'New spares') return 'new';
  if (type === 'Used spares') return 'used';
  return undefined;
}

/**
 * Normalizes stored conditions to New/Used. Legacy values (`like_new`, `good`,
 * `fair`) are pre-owned items and become `used`. Services and posts never have
 * a condition.
 */
export function normalizeCondition(raw: unknown, type: ListingType): ProductCondition | undefined {
  if (!isProductListing(type)) return undefined;
  const clean = String(raw || '').toLowerCase();
  if (clean === 'new' || clean === 'brandnew') return 'new';
  if (clean === 'used' || clean === 'like_new' || clean === 'good' || clean === 'fair') return 'used';
  return defaultConditionFor(type);
}

/** Value written to the `condition` column (shared with the mobile app). */
export function conditionToDb(condition: ProductCondition | undefined): string | null {
  if (condition === 'new') return 'brandNew';
  if (condition === 'used') return 'used';
  return null;
}

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: 'New',
  used: 'Used',
};

/**
 * Parses new and legacy listing statuses. Legacy `approved` and `pending`
 * listings are active (ordinary listings no longer need admin approval);
 * legacy `rejected` is treated as removed and `draft` as hidden.
 */
export function normalizeListingStatus(raw: unknown): ListingStatus {
  switch (String(raw || '').toLowerCase()) {
    case 'hidden':
    case 'draft':
      return 'hidden';
    case 'suspended':
      return 'suspended';
    case 'removed':
    case 'rejected':
      return 'removed';
    default:
      return 'active';
  }
}

/** Fallback value for databases still using the legacy status constraint. */
export function listingStatusToLegacyDb(status: ListingStatus): string {
  if (status === 'active') return 'approved';
  if (status === 'hidden') return 'draft';
  return 'rejected';
}

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  active: 'Active',
  hidden: 'Hidden',
  suspended: 'Suspended',
  removed: 'Removed',
};

/** Statuses set by moderators that the owner cannot change. */
export function isModeratedStatus(status: ListingStatus): boolean {
  return status === 'suspended' || status === 'removed';
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const REPORT_REASONS: { code: ReportReasonCode; label: string }[] = [
  { code: 'fake_or_misleading', label: 'Fake or misleading listing' },
  { code: 'incorrect_price', label: 'Incorrect price' },
  { code: 'incorrect_information', label: 'Incorrect information' },
  { code: 'duplicate_listing', label: 'Duplicate listing' },
  { code: 'suspicious_activity', label: 'Suspicious activity' },
  { code: 'other', label: 'Other' },
];

export function reportReasonLabel(code: ReportReasonCode): string {
  return REPORT_REASONS.find((r) => r.code === code)?.label || 'Other';
}

/** Reads a reason code, falling back to matching legacy free-text reasons. */
export function normalizeReasonCode(rawCode: unknown, rawText?: unknown): ReportReasonCode {
  const code = String(rawCode || '').toLowerCase();
  const byCode = REPORT_REASONS.find((r) => r.code === code);
  if (byCode) return byCode.code;
  const text = String(rawText || '').toLowerCase();
  const byLabel = REPORT_REASONS.find((r) => text.startsWith(r.label.toLowerCase()));
  if (byLabel) return byLabel.code;
  if (text.includes('counterfeit') || text.includes('fake') || text.includes('replica')) return 'fake_or_misleading';
  if (text.includes('price')) return 'incorrect_price';
  return 'other';
}

export function normalizeReportStatus(raw: unknown): ReportStatus {
  switch (String(raw || '').toLowerCase()) {
    case 'under_review':
      return 'under_review';
    case 'resolved':
      return 'resolved';
    case 'dismissed':
      return 'dismissed';
    default:
      return 'pending';
  }
}

export function isOpenReport(status: ReportStatus): boolean {
  return status === 'pending' || status === 'under_review';
}

// ---------------------------------------------------------------------------
// Ethiopian locations & distance
// ---------------------------------------------------------------------------

export const ETHIOPIAN_CITIES = [
  'Addis Ababa',
  'Hawassa',
  'Adama (Nazret)',
  'Bahir Dar',
  'Dire Dawa',
  'Mekelle',
  'Gondar',
  'Bishoftu (Debre Zeyit)',
];

export const ADDIS_ABABA_AREAS = [
  'Bole',
  'Kirkos',
  'Kazanchis',
  'Yeka',
  'Arada (Piazza)',
  'Lideta',
  'Sarbet / Old Airport',
  'CMC / Ayat',
  'Nifas Silk-Lafto',
  'Kolfe Keranio',
  'Gullele',
  'Akaki Kality',
  'Shiro Meda',
  'Merkato',
  'Megenagna',
];

/** Approximate area centres used when a listing or member has no GPS pin. */
export const AREA_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  'Addis Ababa': { latitude: 9.0108, longitude: 38.7613 },
  Bole: { latitude: 8.995, longitude: 38.788 },
  Kirkos: { latitude: 9.0054, longitude: 38.7636 },
  Kazanchis: { latitude: 9.018, longitude: 38.769 },
  Yeka: { latitude: 9.035, longitude: 38.81 },
  'Arada (Piazza)': { latitude: 9.035, longitude: 38.752 },
  Piazza: { latitude: 9.035, longitude: 38.752 },
  Lideta: { latitude: 9.0105, longitude: 38.7375 },
  'Sarbet / Old Airport': { latitude: 8.993, longitude: 38.741 },
  'CMC / Ayat': { latitude: 9.02, longitude: 38.86 },
  'Nifas Silk-Lafto': { latitude: 8.96, longitude: 38.735 },
  'Kolfe Keranio': { latitude: 9.02, longitude: 38.705 },
  Gullele: { latitude: 9.06, longitude: 38.735 },
  'Akaki Kality': { latitude: 8.885, longitude: 38.78 },
  'Shiro Meda': { latitude: 9.06, longitude: 38.765 },
  Merkato: { latitude: 9.031, longitude: 38.737 },
  Megenagna: { latitude: 9.02, longitude: 38.8 },
  Hawassa: { latitude: 7.062, longitude: 38.476 },
  'Adama (Nazret)': { latitude: 8.54, longitude: 39.27 },
  'Bahir Dar': { latitude: 11.594, longitude: 37.39 },
  'Dire Dawa': { latitude: 9.6, longitude: 41.85 },
  Mekelle: { latitude: 13.497, longitude: 39.475 },
  Gondar: { latitude: 12.6, longitude: 37.467 },
  'Bishoftu (Debre Zeyit)': { latitude: 8.752, longitude: 38.978 },
};

export function coordinatesForArea(area: string | undefined): { latitude: number; longitude: number } | undefined {
  if (!area) return undefined;
  if (AREA_COORDINATES[area]) return AREA_COORDINATES[area];
  const lower = area.toLowerCase();
  const key = Object.keys(AREA_COORDINATES).find(
    (k) => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
  );
  return key ? AREA_COORDINATES[key] : undefined;
}

/** Great-circle distance in km (Haversine). */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number | undefined): string | undefined {
  if (km === undefined || Number.isNaN(km)) return undefined;
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

/** Validates a 9-digit Ethiopian mobile number (after the +251 prefix). */
export function isValidEthiopianMobile(raw: string): boolean {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length > 9) digits = digits.slice(3);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  return /^[79]\d{8}$/.test(digits);
}

/** Formats a phone number as "+251 9X XXX XXXX". */
export function formatEthiopianPhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('251') && digits.length > 9) digits = digits.slice(3);
  if (digits.startsWith('0') && digits.length === 10) digits = digits.slice(1);
  if (digits.length !== 9) return raw.trim();
  return `+251 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

/** Formats an amount in Ethiopian Birr, e.g. "ETB 12,500" or "From ETB 800". */
export function formatETB(amount: number, options: { startingPrice?: boolean } = {}): string {
  const value = `ETB ${Math.round(Number(amount) || 0).toLocaleString('en-US')}`;
  return options.startingPrice ? `From ${value}` : value;
}
