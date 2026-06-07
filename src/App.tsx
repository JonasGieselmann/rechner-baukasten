import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Editor } from './pages/Editor';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
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
import DashboardsManager from './pages/DashboardsManager';
import FunnelsManager from './pages/FunnelsManager';
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

          {/* Admin (super_admin only): old calculator builder + funnel editor */}
          <Route
            path="/admin"
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
          <Route
            path="/funnels/:id"
            element={
              <AdminRoute>
                <FunnelEditor />
              </AdminRoute>
            }
          />
          <Route
            path="/funnels/:id/leads"
            element={
              <AdminRoute>
                <FunnelLeads />
              </AdminRoute>
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

          {/* Funnels manager */}
          <Route
            path="/admin/funnels"
            element={
              <AdminRoute>
                <FunnelsManager />
              </AdminRoute>
            }
          />

          {/* Dashboards manager (platform admin) + agency landing (white-label) */}
          <Route
            path="/admin/dashboards"
            element={
              <AdminRoute>
                <DashboardsManager />
              </AdminRoute>
            }
          />
          <Route
            path="/agency"
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
