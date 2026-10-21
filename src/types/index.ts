export type UserRole = 'admin' | 'seller' | 'buyer';

export type AccountStatus = 'active' | 'pending' | 'rejected' | 'suspended';

export type SellerApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type ProductStatus = 'pending' | 'approved' | 'rejected';

export type ProductCondition = 'new' | 'like_new' | 'good' | 'fair';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  avatarUrl?: string;
}

export interface BuyerProfile {
  userId: string;
  bio?: string;
  deliveryAddress?: string;
  deliveryCity?: string;
  deliverySubcity?: string;
  deliveryNotes?: string;
  locationCoordinates?: {
    latitude: number;
    longitude: number;
  };
  updatedAt: string;
}

export interface SellerProfile {
  id: string; // matches userId
  userId: string;
  storeName: string;
  businessDescription: string;
  phone: string;
  email?: string;
  location: string;
  logoUrl?: string;
  status: SellerApprovalStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconName?: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerPhone: string;
  sellerLocation: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  categoryName: string;
  condition: ProductCondition;
  quantity: number;
  images: string[];
  status: ProductStatus;
  rejectionReason?: string;
  isFeatured?: boolean;
  viewsCount: number;
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

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  content: string;
  createdAt: string;
  deliveryLocationSnippet?: LocationSnippet;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  buyerId: string;
  buyerName: string;
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
  | 'seller_approved'
  | 'seller_rejected'
  | 'seller_suspended'
  | 'seller_reinstated'
  | 'product_approved'
  | 'product_rejected'
  | 'new_message'
  | 'order_request'
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

export interface ReportedItem {
  id: string;
  targetType: 'product' | 'user';
  targetId: string;
  targetName: string;
  reporterName: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolutionAction?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  details: string;
  createdAt: string;
}

export interface AdminStats {
  totalSellers: number;
  totalBuyers: number;
  totalProducts: number;
  pendingSellerApprovals: number;
  pendingProductApprovals: number;
  approvedProducts: number;
  rejectedProducts: number;
  activeConversations: number;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  condition?: ProductCondition | 'all';
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  location?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
}
