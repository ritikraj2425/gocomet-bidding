import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedLayout from './layouts/ProtectedLayout';
import BrandLogo from './components/BrandLogo';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RFQListPage = lazy(() => import('./pages/RFQListPage'));
const CreateRFQPage = lazy(() => import('./pages/CreateRFQPage'));
const EditRFQPage = lazy(() => import('./pages/EditRFQPage'));
const RFQDetailPage = lazy(() => import('./pages/RFQDetailPage'));
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<div className="route-loading"><BrandLogo compact /><span>Loading workspace…</span></div>}>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="rfqs" element={<RFQListPage />} />
          <Route path="rfqs/create" element={<CreateRFQPage />} />
          <Route path="rfqs/:id" element={<RFQDetailPage />} />
          <Route path="rfqs/:id/edit" element={<EditRFQPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

