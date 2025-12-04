// components/auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthContext } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, initialized } = useAuthContext();

  console.log('🔍 ProtectedRoute:', { 
    loading, 
    initialized,
    user: user?.email,
    hasUser: !!user 
  });

  // Show loading only on initial load
  if (loading && !initialized && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing application...</p>
        </div>
      </div>
    );
  }

  // If we have a user, render content regardless of loading state
  if (user) {
    console.log('✅ ProtectedRoute: User authenticated, rendering');
    return children || <Outlet />;
  }

  // No user after initialization
  console.log('🔍 ProtectedRoute: No user, redirecting to login');
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;