import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { isLoggedIn } from './store/auth';
import MainLayout from './layouts/MainLayout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Patients = lazy(() => import('./pages/Patients'));
const PatientDetail = lazy(() => import('./pages/PatientDetail'));
const Staff = lazy(() => import('./pages/Staff'));
const Shifts = lazy(() => import('./pages/Shifts'));
const Departments = lazy(() => import('./pages/Departments'));
const Beds = lazy(() => import('./pages/Beds'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Visits = lazy(() => import('./pages/Visits'));
const VisitDetail = lazy(() => import('./pages/VisitDetail'));
const Pharmacy = lazy(() => import('./pages/Pharmacy'));
const Laboratory = lazy(() => import('./pages/Laboratory'));
const Radiology = lazy(() => import('./pages/Radiology'));
const Billing = lazy(() => import('./pages/Billing'));
const Hospitals = lazy(() => import('./pages/Hospitals'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? <>{children}</> : <Navigate to="/login" replace />;
}

const loading = (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <Spin size="large" tip="Loading..." />
  </div>
);

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={loading}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="hospitals" element={<Hospitals />} />
            <Route path="departments" element={<Departments />} />
            <Route path="beds" element={<Beds />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="visits" element={<Visits />} />
            <Route path="visits/:id" element={<VisitDetail />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="staff" element={<Staff />} />
            <Route path="shifts" element={<Shifts />} />
            <Route path="pharmacy" element={<Pharmacy />} />
            <Route path="laboratory" element={<Laboratory />} />
            <Route path="radiology" element={<Radiology />} />
            <Route path="billing" element={<Billing />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
