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
import { AuthProvider } from './components/AuthProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { IndexRedirect } from './components/IndexRedirect';

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

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
