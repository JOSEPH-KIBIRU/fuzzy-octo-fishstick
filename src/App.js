// App.js - UPDATED VERSION WITH USER MANAGEMENT
import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import PettyCash from "./pages/PettyCash";
import ValuationPayments from "./pages/ValuationPayments";
import VehicleManagement from "./pages/VehicleManagement";
import CarRepairs from "./pages/CarRepairs";
import Insurance from "./pages/Insurance";
import EmployeeTransactions from "./pages/EmployeeTransactions";
import LeaveRequests from "./pages/LeaveRequests";
import Vendors from "./pages/Vendors";
import UserProfile from "./pages/UserProfile";
import ScheduledTasks from "./components/ScheduledTasks";
import Login from "./components/auth/Login";
import RegistrationRequest from "./components/RegistrationRequest";
import AdminApprovalPanel from "./components/AdminApprovalPanel";
import InvitedSignup from "./components/InvitedSignup";
import PrivateRoute from "./components/auth/PrivateRoute";
import "./App.css";
import emailjs from "@emailjs/browser";
import SearchResults from "./pages/SearchResults";
import ViewRequests from "./pages/ViewRequests";
import UserManagement from "./pages/UserManagement"; // NEW IMPORT

// Initialize EmailJS
const initializeEmailJS = () => {
  if (process.env.REACT_APP_EMAILJS_PUBLIC_KEY) {
    emailjs.init(process.env.REACT_APP_EMAILJS_PUBLIC_KEY);
    console.log("✅ EmailJS initialized successfully");
    return true;
  } else {
    console.warn("⚠️ EmailJS public key not found.");
    return false;
  }
};

const AppContent = () => {
  const { user } = useAuthContext();

  useEffect(() => {
    if (user) {
      initializeEmailJS();
    }
  }, [user]);

  return (
    <>
      {user && <ScheduledTasks />}
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/request-access" element={<RegistrationRequest />} />
        <Route path="/signup" element={<InvitedSignup />} />

        {/* Protected routes with Layout wrapper */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Dashboard & Main Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/petty-cash" element={<PettyCash />} />
            <Route path="/valuation-payments" element={<ValuationPayments />} />
            <Route path="/vehicles" element={<VehicleManagement />} />
            <Route path="/vehicles/repairs" element={<CarRepairs />} />
            <Route path="/vehicles/insurance" element={<Insurance />} />
            <Route
              path="/employee-transactions"
              element={<EmployeeTransactions />}
            />
            <Route path="/leave-requests" element={<LeaveRequests />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/search" element={<SearchResults />} />

            {/* Registration Requests (Admin only) */}
            <Route 
              path="/view-requests" 
              element={
                <PrivateRoute allowedRoles={["admin", "super_admin"]}>
                  <ViewRequests />
                </PrivateRoute>
              } 
            />

            {/* User Management (Admin only) */}
            <Route 
              path="/user-management" 
              element={
                <PrivateRoute allowedRoles={["admin", "super_admin"]}>
                  <UserManagement />
                </PrivateRoute>
              } 
            />

            {/* Admin Panel (Admin only) */}
            <Route
              path="/admin/approvals"
              element={
                <PrivateRoute allowedRoles={["admin", "super_admin"]}>
                  <AdminApprovalPanel />
                </PrivateRoute>
              }
            />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <div className="App">
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </div>
    </Router>
  );
}

export default App;
