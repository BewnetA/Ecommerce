/**
 * Unified-member marketplace types.
 *
 * There is ONE member account type. Every approved member can browse, contact
 * other members, publish listings and manage their own listings. A member is a
 * "buyer" in one conversation and a "seller" in another — never a permanent
 * role. Administrators are the only separate role.
 */
export type UserRole = 'admin' | 'member';

/**
 * One-time member verification state, controlled by the backend/admin only.
 * New members start as `pending`.
 */
export type MemberStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

/** How the member is connected to the mobile phone repair industry. */
export type IndustryRole =
  | 'repair_technician'
  | 'repair_shop_owner'
  | 'spare_parts_supplier'
  | 'tools_equipment_supplier'
  | 'trainer_instructor'
  | 'other_industry_connection';

export type VerificationIdType = 'national_id' | 'kebele_id' | 'passport' | 'driving_license';

/** Details collected once, during initial member registration. */
export interface MemberVerificationDetails {
  industryRole: IndustryRole;
  yearsOfExperience: number;
  workplaceName?: string;
  industryDescription: string;
  idType: VerificationIdType;
  idNumber: string;
  tradeLicenseNumber?: string;
  referenceName?: string;
  referencePhone?: string;
  submittedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  /** Verification status. Administrators are always `approved`. */
  status: MemberStatus;
  /** Explanation from the review team for a rejected or suspended account. */
  verificationNote?: string;
  verification?: MemberVerificationDetails;
  createdAt: string;
  avatarUrl?: string;
}

export type ServiceCoverage = 'atLocation' | 'travelsToCustomer' | 'selectedAreas';

/**
 * The single member profile: public business/workshop details, the shop/work
 * location used as the default location of the member's ads, and an optional
 * current location used for nearby discovery and sharing in chats.
 *
 * It carries NO approval status of its own — `User.status` governs access.
 */
export interface MemberProfile {
  id: string;
  userId: string;
  businessName: string;
  businessDescription: string;
  bio?: string;
  phone: string;
  email?: string;
  city: string;
  subCity: string;
  addressDescription?: string;
  /** Display text, e.g. "Bole, Addis Ababa". */
  location: string;
  latitude?: number;
  longitude?: number;
  serviceCoverage?: ServiceCoverage;
  logoUrl?: string;
  currentAddress?: string;
  currentCity?: string;
  currentSubcity?: string;
  currentNotes?: string;
  currentCoordinates?: {
    latitude: number;
    longitude: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type ListingType = 'New spares' | 'Used spares' | 'Repair tools' | 'Services' | 'Posts';

/** Physical product condition. Required for products, absent for services. */
export type ProductCondition = 'new' | 'used';

/**
 * Listing lifecycle. Ordinary listings are published immediately as `active`
 * (no per-listing admin approval). `hidden` can be set by the owner or by a
 * moderator; `suspended` and `removed` are moderation outcomes after a report.
 */
export type ListingStatus = 'active' | 'hidden' | 'suspended' | 'removed';

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerLocation: string;
  name: string;
  description: string;
  price: number;
  listingType: ListingType;
  /** Only set for physical products (never for services or posts). */
  condition?: ProductCondition;
  quantity: number;
  isSoldOut?: boolean;
  images: string[];
  status: ListingStatus;
  /** Explanation from moderators when a listing is hidden/suspended/removed. */
  moderationNote?: string;
  isFeatured?: boolean;
  viewsCount: number;
  locationCity: string;
  locationSubCity: string;
  addressDescription?: string;
  latitude?: number;
  longitude?: number;
  isStartingPrice?: boolean;
  serviceCoverage?: ServiceCoverage;
  serviceCoverageNote?: string;
  /** Computed client-side when the viewer's location is known. */
  distanceKm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationSnippet {
  address: string;
  city?: string;
  subcity?: string;
  notes?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/** Side of a member in ONE conversation (listing owner vs. enquirer). */
export type ConversationRole = 'buyer' | 'seller';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: ConversationRole | 'admin';
  content: string;
  createdAt: string;
  deliveryLocationSnippet?: LocationSnippet;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  /** Member who enquired about the listing in this conversation. */
  buyerId: string;
  buyerName: string;
  /** Member who owns the listing in this conversation. */
  sellerId: string;
  sellerName: string;
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  lastMessage: string;
  lastMessageAt: string;
  unreadCountBuyer: number;
  unreadCountSeller: number;
  createdAt: string;
}

export type NotificationType =
  | 'member_approved'
  | 'member_rejected'
  | 'member_suspended'
  | 'member_reinstated'
  | 'listing_hidden'
  | 'listing_suspended'
  | 'listing_removed'
  | 'listing_restored'
  | 'report_received'
  | 'new_message'
  | 'system';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  linkTo?: string;
  createdAt: string;
}

export type ReportReasonCode =
  | 'fake_or_misleading'
  | 'incorrect_price'
  | 'incorrect_information'
  | 'duplicate_listing'
  | 'suspicious_activity'
  | 'other';

export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed';

export type ModerationAction =
  | 'no_action'
  | 'hide_listing'
  | 'suspend_listing'
  | 'remove_listing'
  | 'restore_listing';

/**
 * A moderation record. Creating a report never hides or removes a listing;
 * only an administrator can act on it.
 */
export interface ReportedItem {
  id: string;
  targetType: 'product' | 'user';
  targetId: string;
  targetName: string;
  listingOwnerId?: string;
  reporterId?: string;
  reporterName: string;
  reasonCode: ReportReasonCode;
  /** Human-readable reason (label, or free text on legacy records). */
  reason: string;
  details?: string;
  status: ReportStatus;
  resolutionAction?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorName: string;
  /** Role at the time of the action (historical entries may say seller/buyer). */
  actorRole: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface AdminStats {
  totalMembers: number;
  pendingVerifications: number;
  approvedMembers: number;
  suspendedMembers: number;
  totalListings: number;
  activeListings: number;
  moderatedListings: number;
  openReports: number;
  activeConversations: number;
}

export type ListingKindFilter = 'all' | 'product' | 'service';

export interface ProductFilters {
  search?: string;
  /** Product (physical item) versus service. */
  kind?: ListingKindFilter;
  listingType?: ListingType | 'all';
  /** New/Used — applies to physical products only. */
  condition?: ProductCondition | 'all';
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  location?: string;
  /** Reference point for nearby results (current or manually selected). */
  nearLatitude?: number;
  nearLongitude?: number;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'nearest';
}
