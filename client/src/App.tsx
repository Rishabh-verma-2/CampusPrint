import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Spinner } from './components/ui';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import StudentLayout from './layouts/StudentLayout';
import VendorLayout from './layouts/VendorLayout';
import AdminLayout from './layouts/AdminLayout';

// Public pages
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const RegisterPage = lazy(() => import('./pages/public/RegisterPage'));
const VendorLoginPage = lazy(() => import('./pages/public/VendorLoginPage'));
const AdminLoginPage = lazy(() => import('./pages/public/AdminLoginPage'));

// Student pages
const StudentHome = lazy(() => import('./pages/student/HomePage'));
const PrintWizard = lazy(() => import('./pages/student/PrintWizard'));
const StudentOrders = lazy(() => import('./pages/student/OrdersPage'));
const StudentOrderDetail = lazy(() => import('./pages/student/OrderDetailPage'));
const StudentProfile = lazy(() => import('./pages/student/ProfilePage'));
const StudentNotifications = lazy(() => import('./pages/student/NotificationsPage'));
const PaymentReturnPage = lazy(() => import('./pages/student/PaymentReturnPage'));

// Vendor pages
const VendorDashboard = lazy(() => import('./pages/vendor/DashboardPage'));
const VendorQueue = lazy(() => import('./pages/vendor/QueuePage'));
const VendorPricing = lazy(() => import('./pages/vendor/PricingPage'));
const VendorAnalytics = lazy(() => import('./pages/vendor/AnalyticsPage'));
const VendorEarnings = lazy(() => import('./pages/vendor/EarningsPage'));
const VendorProfile = lazy(() => import('./pages/vendor/ProfilePage'));
const VendorOrderDetail = lazy(() => import('./pages/vendor/OrderDetailPage'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'));
const AdminVendors = lazy(() => import('./pages/admin/VendorsPage'));
const AdminStudents = lazy(() => import('./pages/admin/StudentsPage'));
const AdminOrders = lazy(() => import('./pages/admin/OrdersPage'));
const AdminUniversities = lazy(() => import('./pages/admin/UniversitiesPage'));
const AdminPayments = lazy(() => import('./pages/admin/PaymentsPage'));
const AdminAnalytics = lazy(() => import('./pages/admin/AnalyticsPage'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AuditLogsPage'));
const AdminComplaints = lazy(() => import('./pages/admin/ComplaintsPage'));
const AdminSettings = lazy(() => import('./pages/admin/SettingsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
});

// ─── Route Guards ─────────────────────────────────────────────────────────────

const LoadingScreen = () => (
  <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spinner size="lg" />
  </div>
);

const RequireAuth: React.FC<{ children: React.ReactNode; role?: string }> = ({ children, role }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) {
    if (role === 'VENDOR') return <Navigate to="/vendor/login" replace />;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return <Navigate to="/admin/login" replace />;
    return <Navigate to="/login" replace />;
  }
  if (role && user?.role !== role && !(role === 'ADMIN' && user?.role === 'SUPER_ADMIN')) {
    // Wrong role — redirect to correct dashboard
    const redirectMap: Record<string, string> = {
      STUDENT: '/student',
      VENDOR: '/vendor',
      ADMIN: '/admin',
      SUPER_ADMIN: '/admin',
    };
    return <Navigate to={redirectMap[user?.role ?? 'STUDENT']} replace />;
  }
  return <>{children}</>;
};

const RequireGuest: React.FC<{ children: React.ReactNode; forRole?: string }> = ({ children, forRole }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (user) {
    // Only redirect if already logged in with the matching role
    const isTargetRole = !forRole || user.role === forRole || (forRole === 'ADMIN' && user.role === 'SUPER_ADMIN');
    if (isTargetRole) {
      const map: Record<string, string> = { STUDENT: '/student', VENDOR: '/vendor', ADMIN: '/admin', SUPER_ADMIN: '/admin' };
      return <Navigate to={map[user.role]} replace />;
    }
  }
  return <>{children}</>;
};

// ─── App ──────────────────────────────────────────────────────────────────────

const AppRoutes: React.FC = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Dedicated Print Route */}
      <Route
        path="/print"
        element={
          <RequireAuth role="STUDENT">
            <StudentLayout />
          </RequireAuth>
        }
      >
        <Route index element={<PrintWizard />} />
      </Route>

      {/* Public / Auth */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<RequireGuest forRole="STUDENT"><LoginPage /></RequireGuest>} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/vendor/login" element={<RequireGuest forRole="VENDOR"><VendorLoginPage /></RequireGuest>} />
        <Route path="/admin/login" element={<RequireGuest forRole="ADMIN"><AdminLoginPage /></RequireGuest>} />
      </Route>

      {/* Student */}
      <Route path="/student" element={<RequireAuth role="STUDENT"><StudentLayout /></RequireAuth>}>
        <Route index element={<StudentHome />} />
        <Route path="print" element={<Navigate to="/print" replace />} />
        <Route path="orders" element={<StudentOrders />} />
        <Route path="orders/:id" element={<StudentOrderDetail />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="notifications" element={<StudentNotifications />} />
      </Route>

      {/* Payment Return — standalone page (no sidebar) */}
      <Route
        path="/payment/return"
        element={
          <RequireAuth role="STUDENT">
            <PaymentReturnPage />
          </RequireAuth>
        }
      />

      {/* Vendor */}
      <Route path="/vendor" element={<RequireAuth role="VENDOR"><VendorLayout /></RequireAuth>}>
        <Route index element={<VendorDashboard />} />
        <Route path="queue" element={<VendorQueue />} />
        <Route path="orders/:id" element={<VendorOrderDetail />} />
        <Route path="analytics" element={<VendorAnalytics />} />
        <Route path="earnings" element={<Navigate to="/vendor/analytics" replace />} />
        <Route path="pricing" element={<VendorPricing />} />
        <Route path="profile" element={<VendorProfile />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth role="ADMIN"><AdminLayout /></RequireAuth>}>
        <Route index element={<AdminDashboard />} />
        <Route path="universities" element={<AdminUniversities />} />
        <Route path="vendors" element={<AdminVendors />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="audit-logs" element={<AdminAuditLogs />} />
        <Route path="complaints" element={<AdminComplaints />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </Suspense>
);

const App: React.FC = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: 'var(--surface-card)',
                border: '1px solid var(--surface-border)',
                color: 'var(--text-primary)',
              },
            }}
          />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
