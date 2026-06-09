import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Editor } from './pages/Editor';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import InvitePage from './pages/InvitePage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { BuilderEmbed } from './pages/BuilderEmbed';
import { CustomEmbed } from './pages/CustomEmbed';
import { AdminUsers } from './pages/AdminUsers';
import { AdminCustomers } from './pages/AdminCustomers';
import { AdminSettings } from './pages/AdminSettings';
import { AdminCustomerDetail } from './pages/AdminCustomerDetail';
import FunnelRunner from './pages/FunnelRunner';
import { FunnelEditor } from './pages/FunnelEditor';
import { FunnelLeads } from './pages/FunnelLeads';
import DashboardLayout from './pages/customer/DashboardLayout';
import Overview from './pages/customer/Overview';
import PotenzialanalyseEmbed from './pages/customer/PotenzialanalyseEmbed';
import Leitfaden from './pages/customer/Leitfaden';
import Account from './pages/customer/Account';
import Rechtliches from './pages/customer/Rechtliches';
import FunnelEmbed from './pages/customer/FunnelEmbed';
import Plans from './pages/customer/Plans';
import Profile from './pages/Profile';
import DashboardsManager from './pages/DashboardsManager';
import FunnelsManager from './pages/FunnelsManager';
import AdminOrganizations from './pages/AdminOrganizations';
import PlatformOverview from './pages/PlatformOverview';
import AgencyConsole from './pages/AgencyConsole';
import { AgencyRoute } from './components/AgencyRoute';
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { IndexRedirect } from './components/IndexRedirect';
import { LegalPage } from './components/LegalPage';
import { CookieNotice } from './components/CookieNotice';
import { IMPRESSUM, DATENSCHUTZ, AGB } from './lib/legalContent';
import { Unsubscribe, ConfirmEmail } from './pages/MailAction';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="/passwort-vergessen" element={<ForgotPassword />} />
          <Route path="/passwort-zuruecksetzen/:token" element={<ResetPassword />} />

          {/* Embed routes (public, no auth required) */}
          <Route path="/embed/:id" element={<BuilderEmbed />} />
          <Route path="/embed/custom/:slug" element={<CustomEmbed />} />
          <Route path="/funnel/:slug" element={<FunnelRunner />} />

          {/* Legal pages (public, required without login) */}
          <Route path="/impressum" element={<LegalPage doc={IMPRESSUM} />} />
          <Route path="/datenschutz" element={<LegalPage doc={DATENSCHUTZ} />} />
          <Route path="/agb" element={<LegalPage doc={AGB} />} />

          {/* Email link actions (public) */}
          <Route path="/abmelden" element={<Unsubscribe />} />
          <Route path="/mail-bestaetigen" element={<ConfirmEmail />} />

          {/* Root: role-based redirect to /admin or /dashboard */}
          <Route path="/" element={<IndexRedirect />} />

          {/* Profile + settings (all authenticated roles, standalone) */}
          <Route
            path="/profil"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Customer dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="potenzialanalyse" element={<PotenzialanalyseEmbed />} />
            <Route path="leitfaden" element={<Leitfaden />} />
            <Route path="account" element={<Account />} />
            <Route path="rechtliches" element={<Rechtliches />} />
            <Route path="funnel/:slug" element={<FunnelEmbed />} />
            <Route path="plan" element={<Plans />} />
          </Route>

          {/* Admin (super_admin only): platform overview is the landing; the
              legacy calculator builder moves to /admin/rechner */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <PlatformOverview />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/rechner"
            element={
              <AdminRoute>
                <Home />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/customers"
            element={
              <AdminRoute>
                <AdminCustomers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/customers/:id"
            element={
              <AdminRoute>
                <AdminCustomerDetail />
              </AdminRoute>
            }
          />
          <Route
            path="/editor/:id"
            element={
              <AdminRoute>
                <Editor />
              </AdminRoute>
            }
          />
          {/* Funnel editor + leads — org content, lives in the agency UI */}
          <Route
            path="/agency/funnels/:id"
            element={
              <AgencyRoute>
                <FunnelEditor />
              </AgencyRoute>
            }
          />
          <Route
            path="/agency/funnels/:id/leads"
            element={
              <AgencyRoute>
                <FunnelLeads />
              </AgencyRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <AdminRoute>
                <AdminSettings />
              </AdminRoute>
            }
          />

          {/* Funnels manager — org content, lives in the agency UI */}
          <Route
            path="/agency/funnels"
            element={
              <AgencyRoute>
                <FunnelsManager />
              </AgencyRoute>
            }
          />

          {/* White-label tenant management (platform admin) */}
          <Route
            path="/admin/organizations"
            element={
              <AdminRoute>
                <AdminOrganizations />
              </AdminRoute>
            }
          />

          {/* Agency / org workspace (white-label): console + dashboards + funnels */}
          <Route
            path="/agency"
            element={
              <AgencyRoute>
                <AgencyConsole />
              </AgencyRoute>
            }
          />
          <Route
            path="/agency/dashboards"
            element={
              <AgencyRoute>
                <DashboardsManager />
              </AgencyRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <CookieNotice />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
