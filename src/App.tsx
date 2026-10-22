import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { AuthProvider } from './features/auth/AuthContext';
import { ProtectedRoute } from './app/ProtectedRoute';

// Layouts
import { PublicLayout } from './layouts/PublicLayout';
import { BuyerLayout } from './layouts/BuyerLayout';
import { SellerLayout } from './layouts/SellerLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Public & Auth Pages
import { HomePage } from './features/marketplace/HomePage';
import { ProductListingPage } from './features/marketplace/ProductListingPage';
import { ProductDetailPage } from './features/marketplace/ProductDetailPage';
import { CategoryBrowsePage } from './features/marketplace/CategoryBrowsePage';
import { SellerProfileViewPage } from './features/sellers/SellerProfileViewPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterBuyerPage } from './features/auth/RegisterBuyerPage';
import { RegisterSellerPage } from './features/auth/RegisterSellerPage';

// Buyer Pages
import { BuyerDashboardPage } from './features/buyers/BuyerDashboardPage';
import { BuyerProfilePage } from './features/buyers/BuyerProfilePage';

// Seller Pages
import { SellerDashboardPage } from './features/sellers/SellerDashboardPage';
import { MyProductsPage } from './features/sellers/MyProductsPage';
import { AddProductPage } from './features/sellers/AddProductPage';
import { EditProductPage } from './features/sellers/EditProductPage';
import { SellerProfileEditPage } from './features/sellers/SellerProfileEditPage';

// Messaging & Notifications
import { ConversationListPage } from './features/messaging/ConversationListPage';
import { ConversationDetailPage } from './features/messaging/ConversationDetailPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';

// Admin Pages
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { SellerApprovalQueuePage } from './features/admin/SellerApprovalQueuePage';
import { ProductApprovalQueuePage } from './features/admin/ProductApprovalQueuePage';
import { SellerManagementPage } from './features/admin/SellerManagementPage';
import { ProductManagementPage } from './features/admin/ProductManagementPage';
import { CategoryManagementPage } from './features/admin/CategoryManagementPage';
import { BuyerManagementPage } from './features/admin/BuyerManagementPage';
import { UserManagementPage } from './features/admin/UserManagementPage';
import { AdminManagementPage } from './features/admin/AdminManagementPage';
import { AdminReportsPage } from './features/admin/AdminReportsPage';
import { ReportedItemsPage } from './features/admin/ReportedItemsPage';

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
            <Route path="/categories" element={<CategoryBrowsePage />} />
            <Route path="/sellers/:id" element={<SellerProfileViewPage />} />
            <Route path="/register/buyer" element={<RegisterBuyerPage />} />
            <Route path="/register/seller" element={<RegisterSellerPage />} />
          </Route>

          {/* Buyer Application Routes */}
          <Route
            path="/buyer"
            element={
              <ProtectedRoute allowedRoles={['buyer', 'admin']}>
                <BuyerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/buyer/dashboard" replace />} />
            <Route path="dashboard" element={<BuyerDashboardPage />} />
            <Route path="profile" element={<BuyerProfilePage />} />
            <Route path="messages" element={<ConversationListPage />} />
            <Route path="messages/:id" element={<ConversationDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

          {/* Seller Application Routes */}
          <Route
            path="/seller"
            element={
              <ProtectedRoute allowedRoles={['seller', 'admin']}>
                <SellerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/seller/dashboard" replace />} />
            <Route path="dashboard" element={<SellerDashboardPage />} />
            <Route path="products" element={<MyProductsPage />} />
            <Route
              path="products/new"
              element={
                <ProtectedRoute allowedRoles={['seller', 'admin']} requireApprovedSeller>
                  <AddProductPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="products/edit/:id"
              element={
                <ProtectedRoute allowedRoles={['seller', 'admin']} requireApprovedSeller>
                  <EditProductPage />
                </ProtectedRoute>
              }
            />
            <Route path="profile" element={<SellerProfileEditPage />} />
            <Route path="messages" element={<ConversationListPage />} />
            <Route path="messages/:id" element={<ConversationDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>

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
            <Route path="sellers/approvals" element={<SellerApprovalQueuePage />} />
            <Route path="products/approvals" element={<ProductApprovalQueuePage />} />
            <Route path="sellers" element={<SellerManagementPage />} />
            <Route path="products" element={<ProductManagementPage />} />
            <Route path="categories" element={<CategoryManagementPage />} />
            <Route path="buyers" element={<BuyerManagementPage />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="reports/items" element={<ReportedItemsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
