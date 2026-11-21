import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './app/ProtectedRoute';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { MemberLayout } from './layouts/MemberLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Public & Auth Pages
import { HomePage } from './features/marketplace/HomePage';
import { ProductListingPage } from './features/marketplace/ProductListingPage';
import { ProductDetailPage } from './features/marketplace/ProductDetailPage';
import { MemberProfileViewPage } from './features/members/MemberProfileViewPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterMemberPage } from './features/auth/RegisterMemberPage';
import { VerificationStatusPage } from './features/auth/VerificationStatusPage';

// Member Pages (one account: profile, My Ads, Post Ad, messages)
import { MemberProfilePage } from './features/members/MemberProfilePage';
import { MyAdsPage } from './features/listings/MyAdsPage';
import { ListingFormPage } from './features/listings/ListingFormPage';

// Messaging & Notifications
import { ConversationListPage } from './features/messaging/ConversationListPage';
import { ConversationDetailPage } from './features/messaging/ConversationDetailPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';

// Admin Pages
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { MemberVerificationQueuePage } from './features/admin/MemberVerificationQueuePage';
import { MemberManagementPage } from './features/admin/MemberManagementPage';
import { ProductManagementPage } from './features/admin/ProductManagementPage';
import { AdminManagementPage } from './features/admin/AdminManagementPage';
import { AdminReportsPage } from './features/admin/AdminReportsPage';
import { ReportedItemsPage } from './features/admin/ReportedItemsPage';

/** Keeps old links (notifications, bookmarks) working after the redesign. */
function LegacyMessageRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/account/messages/${id}` : '/account/messages'} replace />;
}

function LegacyEditRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/account/ads/${id}/edit` : '/account/ads'} replace />;
}

function LegacyMemberRedirect() {
  const { id } = useParams();
  return <Navigate to={`/members/${id}`} replace />;
}

export function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" richColors theme="dark" />
      <BrowserRouter>
        <Routes>
          {/* Standalone Login Route (No Navbar, No Footer) */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Public Marketplace Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/products" element={<ProductListingPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/members/:id" element={<MemberProfileViewPage />} />
            <Route path="/sellers/:id" element={<LegacyMemberRedirect />} />
            {/* One registration process for every member */}
            <Route path="/register" element={<RegisterMemberPage />} />
            <Route path="/register/buyer" element={<Navigate to="/register" replace />} />
            <Route path="/register/seller" element={<Navigate to="/register" replace />} />
            <Route
              path="/verification-status"
              element={
                <ProtectedRoute allowedRoles={['member']}>
                  <VerificationStatusPage />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Unified Member Area (approved members; admins may also post) */}
          <Route
            path="/account"
            element={
              <ProtectedRoute allowedRoles={['member', 'admin']} requireApprovedMember>
                <MemberLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/account/profile" replace />} />
            <Route path="profile" element={<MemberProfilePage />} />
            <Route path="ads" element={<MyAdsPage />} />
            <Route path="ads/new" element={<ListingFormPage />} />
            <Route path="ads/:id/edit" element={<ListingFormPage />} />
            <Route path="messages" element={<ConversationListPage />} />
            <Route path="messages/:id" element={<ConversationDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Legacy buyer/seller URLs now point to the unified member area */}
          <Route path="/buyer" element={<Navigate to="/account/profile" replace />} />
          <Route path="/buyer/dashboard" element={<Navigate to="/account/profile" replace />} />
          <Route path="/buyer/profile" element={<Navigate to="/account/profile" replace />} />
          <Route path="/buyer/messages" element={<Navigate to="/account/messages" replace />} />
          <Route path="/buyer/messages/:id" element={<LegacyMessageRedirect />} />
          <Route path="/buyer/notifications" element={<Navigate to="/account/notifications" replace />} />
          <Route path="/seller" element={<Navigate to="/account/ads" replace />} />
          <Route path="/seller/dashboard" element={<Navigate to="/account/profile" replace />} />
          <Route path="/seller/products" element={<Navigate to="/account/ads" replace />} />
          <Route path="/seller/products/new" element={<Navigate to="/account/ads/new" replace />} />
          <Route path="/seller/products/edit/:id" element={<LegacyEditRedirect />} />
          <Route path="/seller/profile" element={<Navigate to="/account/profile" replace />} />
          <Route path="/seller/messages" element={<Navigate to="/account/messages" replace />} />
          <Route path="/seller/messages/:id" element={<LegacyMessageRedirect />} />
          <Route path="/seller/notifications" element={<Navigate to="/account/notifications" replace />} />

          {/* Administrator Application Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="admins" element={<AdminManagementPage />} />
            {/* A. One-time member verification */}
            <Route path="members/verification" element={<MemberVerificationQueuePage />} />
            <Route path="members" element={<MemberManagementPage />} />
            {/* B. Report-driven listing moderation */}
            <Route path="reports/items" element={<ReportedItemsPage />} />
            <Route path="products" element={<ProductManagementPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            {/* Retired routes from the buyer/seller model */}
            <Route path="sellers/approvals" element={<Navigate to="/admin/members/verification" replace />} />
            <Route path="products/approvals" element={<Navigate to="/admin/reports/items" replace />} />
            <Route path="sellers" element={<Navigate to="/admin/members" replace />} />
            <Route path="buyers" element={<Navigate to="/admin/members" replace />} />
            <Route path="users" element={<Navigate to="/admin/members" replace />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
