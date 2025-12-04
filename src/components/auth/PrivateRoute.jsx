// components/auth/PrivateRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

const PrivateRoute = ({ children, allowedRoles }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setProfile(profileData);
    }
    setUser(user);
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(profile?.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Access Denied</h2>
          <p className="text-yellow-600">
            You need {allowedRoles.join(' or ')} privileges to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;