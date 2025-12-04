// contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext({});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Auth functions
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating password:', error);
      throw error;
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      setProfile(data);
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // Check if user has specific role
  const hasRole = (requiredRole) => {
    if (!profile) return false;
    
    const roleHierarchy = {
      'super_admin': 4,
      'admin': 3,
      'manager': 2,
      'employee': 1,
      'user': 0
    };

    const userRoleLevel = roleHierarchy[profile.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;
    
    return userRoleLevel >= requiredRoleLevel;
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole('admin');
  };

  // Check if user is super admin
  const isSuperAdmin = () => {
    return profile?.role === 'super_admin';
  };

  // Check if user can approve items
  const canApprove = (itemType) => {
    if (!profile) return false;
    
    const approvalPermissions = {
      'super_admin': ['all'],
      'admin': ['petty_cash', 'employee_transactions', 'leave_requests', 'car_repairs', 'valuation_payments'],
      'manager': ['petty_cash', 'employee_transactions', 'leave_requests'],
      'employee': []
    };

    if (profile.role === 'super_admin') return true;
    
    return approvalPermissions[profile.role]?.includes('all') || 
           approvalPermissions[profile.role]?.includes(itemType);
  };

  // Get user permissions
  const getPermissions = () => {
    if (!profile) return [];
    
    const permissions = {
      'super_admin': ['manage_users', 'approve_all', 'view_reports', 'system_settings'],
      'admin': ['manage_users', 'approve_transactions', 'view_reports'],
      'manager': ['approve_transactions', 'view_department_reports'],
      'employee': ['submit_requests', 'view_own_data'],
      'user': ['view_own_data']
    };

    return permissions[profile.role] || ['view_own_data'];
  };

  const fetchUserProfile = async (userId, isMounted) => {
    console.log(`🔍 AuthContext: Fetching profile for ${userId} (non-blocking)`);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('⚠️ Profile fetch warning:', error.message);
        
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116' && user) {
          console.log('Creating default profile...');
          const defaultProfile = {
            id: userId,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email.split('@')[0],
            role: 'employee',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          if (isMounted) {
            setProfile(defaultProfile);
          }
          return;
        }
        
        throw error;
      }

      console.log('✅ Profile fetched:', data);
      if (isMounted && data) {
        setProfile(data);
      }
    } catch (error) {
      console.warn('⚠️ Error fetching profile:', error.message);
    }
  };

  useEffect(() => {
    console.log('🔍 AuthContext: Starting initialization...');
    
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          if (isMounted) {
            setLoading(false);
            setInitialized(true);
          }
          return;
        }

        console.log('🔍 AuthContext: Session found?', !!session?.user);
        console.log('🔍 AuthContext: User email:', session?.user?.email);
        
        if (isMounted) {
          setUser(session?.user ?? null);
        }
        
        if (session?.user) {
          // Set loading to false immediately since we have a user
          if (isMounted) {
            setLoading(false);
            setInitialized(true);
          }
          
          // Fetch profile in background (non-blocking)
          fetchUserProfile(session.user.id, isMounted);
        } else {
          console.log('🔍 AuthContext: No user session');
          if (isMounted) {
            setLoading(false);
            setInitialized(true);
          }
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        if (isMounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`🔍 AuthContext: Auth event - ${event}`);
        
        if (!isMounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('🔍 AuthContext: User found');
          setLoading(false);
          setInitialized(true);
          fetchUserProfile(session.user.id, isMounted);
        } else {
          console.log('🔍 AuthContext: No user, clearing profile');
          setProfile(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    // State
    user,
    profile,
    loading,
    initialized,
    
    // Auth actions
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile: () => user && fetchUserProfile(user.id, true),
    
    // Permission checks
    hasRole,
    isAdmin,
    isSuperAdmin,
    canApprove,
    getPermissions,
    
    // Helper functions
    getCurrentUserRole: () => profile?.role || 'user',
    getUserDisplayName: () => profile?.full_name || user?.email || 'User',
    getUserEmail: () => user?.email || '',
    isAuthenticated: () => !!user,
    requiresProfileSetup: () => !profile && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};