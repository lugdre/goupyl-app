import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

import ProtectedRoute from './components/guards/ProtectedRoute';
import RoleRoute from './components/guards/RoleRoute';
import DashboardLayout from './components/layout/DashboardLayout';

import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import CoachPublicProfile from './pages/public/CoachPublicProfile';
import VerifyEmail from './pages/public/VerifyEmail';
import CGU from './pages/public/CGU';
import Confidentialite from './pages/public/Confidentialite';

import ClientDashboard from './pages/client/ClientDashboard';
import MyAppointments from './pages/client/MyAppointments';
import SearchIntervenants from './pages/client/SearchIntervenants';
import BookAppointment from './pages/client/BookAppointment';
import MyEmployerPlan from './pages/client/MyEmployerPlan';
import B2BServiceCatalog from './pages/client/B2BServiceCatalog';
import ClientProfile from './pages/client/ClientProfile';

import IntervenantDashboard from './pages/intervenant/IntervenantDashboard';
import MyAgenda from './pages/intervenant/MyAgenda';
import MyReviews from './pages/intervenant/MyReviews';
import IntervenantProfile from './pages/intervenant/IntervenantProfile';
import StripeOnboarding from './pages/intervenant/StripeOnboarding';
import MyEarnings from './pages/intervenant/MyEarnings';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageServices from './pages/admin/ManageServices';
import ManageVerifications from './pages/admin/ManageVerifications';

import EntrepriseDashboard from './pages/entreprise/EntrepriseDashboard';
import EntrepriseProfile from './pages/entreprise/EntrepriseProfile';
import ManageEmployees from './pages/entreprise/ManageEmployees';
import EntrepriseAnalytics from './pages/entreprise/EntrepriseAnalytics';
import EntrepriseSubscription from './pages/entreprise/EntrepriseSubscription';

import UploadDocuments from './pages/shared/UploadDocuments';
import ResourcesLibrary from './pages/shared/ResourcesLibrary';

function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'CLIENT') return <Navigate to="/dashboard/client" replace />;
  if (user.role === 'ENTREPRISE') return <Navigate to="/dashboard/entreprise" replace />;
  if (user.role === 'INTERVENANT') return <Navigate to="/dashboard/intervenant" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/dashboard/admin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px' },
          }}
        />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<SearchIntervenants />} />
          <Route path="/coaches/:id" element={<CoachPublicProfile />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/cgu" element={<CGU />} />
          <Route path="/confidentialite" element={<Confidentialite />} />

          {/* Dashboard redirect */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />

          {/* Client routes */}
          <Route
            path="/dashboard/client"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['CLIENT']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<ClientDashboard />} />
            <Route path="appointments" element={<MyAppointments />} />
            <Route path="search" element={<SearchIntervenants />} />
            <Route path="book/:intervenantId" element={<BookAppointment />} />
            <Route path="employer-plan" element={<MyEmployerPlan />} />
            <Route path="services" element={<B2BServiceCatalog />} />
            <Route path="resources" element={<ResourcesLibrary />} />
            <Route path="profile" element={<ClientProfile />} />
          </Route>

          {/* Intervenant routes */}
          <Route
            path="/dashboard/intervenant"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['INTERVENANT']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<IntervenantDashboard />} />
            <Route path="agenda" element={<MyAgenda />} />
            <Route path="reviews" element={<MyReviews />} />
            <Route path="payments" element={<StripeOnboarding />} />
            <Route path="earnings" element={<MyEarnings />} />
            <Route path="profile" element={<IntervenantProfile />} />
            <Route path="documents" element={<UploadDocuments />} />
          </Route>

          {/* Entreprise routes */}
          <Route
            path="/dashboard/entreprise"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['ENTREPRISE']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<EntrepriseDashboard />} />
            <Route path="employees" element={<ManageEmployees />} />
            <Route path="search" element={<SearchIntervenants />} />
            <Route path="subscription" element={<EntrepriseSubscription />} />
            <Route path="analytics" element={<EntrepriseAnalytics />} />
            <Route path="resources" element={<ResourcesLibrary />} />
            <Route path="profile" element={<EntrepriseProfile />} />
          </Route>

          {/* Admin routes */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['ADMIN']}>
                  <DashboardLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="services" element={<ManageServices />} />
            <Route path="verifications" element={<ManageVerifications />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}
