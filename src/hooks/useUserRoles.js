import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { useState, useEffect } from 'react';

export const useUserRoles = () => {
  const { user } = useAuthContext();
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUserProfile(data);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const getCurrentUserRole = () => {
    if (!userProfile) return 'user';
    return userProfile.role || 'user';
  };

  const hasRole = (requiredRole) => {
    const userRole = getCurrentUserRole();
    
    const roleHierarchy = {
      'super_admin': 4,
      'admin': 3,
      'manager': 2,
      'user': 1
    };

    const userLevel = roleHierarchy[userRole] || 1;
    const requiredLevel = roleHierarchy[requiredRole] || 1;

    return userLevel >= requiredLevel;
  };

  const canEdit = (resourceUserId) => {
    if (!user) return false;
    
    const userRole = getCurrentUserRole();
    
    // Super admins and admins can edit anything
    if (['super_admin', 'admin'].includes(userRole)) return true;
    
    // Managers can edit most things
    if (userRole === 'manager') return true;
    
    // Regular users can only edit their own records
    return user.id === resourceUserId;
  };

  return {
    hasRole,
    canEdit,
    getCurrentUserRole,
    isSuperAdmin: hasRole('super_admin'),
    isAdmin: hasRole('admin'),
    isManager: hasRole('manager'),
    isRegularUser: hasRole('user'),
    loading
  };
};