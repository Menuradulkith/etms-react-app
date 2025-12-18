import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { DepartmentProvider } from './context/DepartmentContext';
import Welcome from './components/Welcome/Welcome';
import Login from './components/Login';
import AdminDashboard from './components/Admin/AdminDashboard';
import ManagerDashboard from './components/Manager/ManagerDashboard';
import StaffDashboard from './components/Staff/StaffDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <DepartmentProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute role="Admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/manager/*"
                element={
                  <ProtectedRoute role="Manager">
                    <ManagerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/*"
                element={
                  <ProtectedRoute role="Staff">
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </DepartmentProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
