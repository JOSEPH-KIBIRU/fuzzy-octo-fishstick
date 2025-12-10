// contexts/CompanyContext.jsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

const CompanyContext = createContext();

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within CompanyProvider');
  }
  return context;
};

export const CompanyProvider = ({ children }) => {
  const [currentCompany, setCurrentCompany] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCompanyFromStorage();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('currentCompany');
          setCurrentCompany(null);
          setUserRole(null);
        } else if (event === 'SIGNED_IN') {
          await loadCompanyFromStorage();
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const loadCompanyFromStorage = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is logged in
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error in CompanyContext:', authError);
        setError('Authentication error');
        setLoading(false);
        return;
      }

      if (!user) {
        console.log('No user logged in');
        setLoading(false);
        return;
      }

      console.log('Loading company for user:', user.email);

      // Load company from localStorage
      const storedCompany = localStorage.getItem('currentCompany');
      if (storedCompany) {
        const companyData = JSON.parse(storedCompany);
        
        // Verify the company still exists and user has access
        const { data: membership, error: membershipError } = await supabase
          .from('company_members')
          .select('role, status')
          .eq('company_id', companyData.id)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (membershipError) {
          console.log('Membership verification failed:', membershipError);
          localStorage.removeItem('currentCompany');
        } else if (membership) {
          console.log('Found valid stored company:', companyData.name);
          setCurrentCompany(companyData);
          setUserRole(membership.role);
        }
      }
      
      setLoading(false);

    } catch (err) {
      console.error('Error loading company:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // FIXED: Add switchCompany function
  const switchCompany = async (company) => {
    try {
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user logged in');

      // Verify membership
      const { data: membership, error } = await supabase
        .from('company_members')
        .select('role, status')
        .eq('company_id', company.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      if (error || !membership) {
        throw new Error('Access denied to this company');
      }

      const companyData = {
        id: company.id,
        name: company.name,
        slug: company.slug,
        plan_id: company.plan_id
      };

      localStorage.setItem('currentCompany', JSON.stringify(companyData));
      setCurrentCompany(companyData);
      setUserRole(membership.role);

      return { success: true };
    } catch (err) {
      console.error('Error switching company:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const clearCompany = () => {
    localStorage.removeItem('currentCompany');
    setCurrentCompany(null);
    setUserRole(null);
  };

  const hasPermission = (permission) => {
    if (!userRole) return false;
    
    const rolePermissions = {
      owner: ['all'],
      admin: ['manage_users', 'manage_settings', 'view_reports', 'manage_content'],
      manager: ['manage_content', 'view_reports'],
      member: ['view_content']
    };

    return rolePermissions[userRole]?.includes(permission) || 
           rolePermissions[userRole]?.includes('all');
  };

  return (
    <CompanyContext.Provider
      value={{
        currentCompany,
        userRole,
        loading,
        error,
        switchCompany, // MAKE SURE THIS IS INCLUDED
        clearCompany,
        hasPermission
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};