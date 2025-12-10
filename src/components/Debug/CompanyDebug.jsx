// src/components/Debug/CompanyDebug.jsx
import React, { useEffect } from 'react';
import { useCompany } from '../../contexts/CompanyContext';
import { useAuthContext } from '../../contexts/AuthContext';

const CompanyDebug = () => {
  const { currentCompany, userRole, loading: companyLoading } = useCompany();
  const { user } = useAuthContext();

  useEffect(() => {
    console.log('🏢 Company Debug:', {
      companyLoading,
      currentCompany,
      userRole,
      localStorageCompany: localStorage.getItem('currentCompany'),
      userId: user?.id
    });
  }, [currentCompany, companyLoading, userRole, user]);

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '10px',
      background: 'rgba(59, 130, 246, 0.9)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: 9998,
      maxWidth: '300px',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ marginBottom: '5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
        🏢 Company Debug
      </div>
      <div>Loading: {companyLoading ? '🔄 Yes' : '✅ No'}</div>
      <div>Company: {currentCompany?.name || '❌ None'}</div>
      <div>Slug: {currentCompany?.slug || '❌ None'}</div>
      <div>Role: {userRole || '❌ None'}</div>
      <div>LocalStorage: {localStorage.getItem('currentCompany') ? '✅ Has' : '❌ Empty'}</div>
    </div>
  );
};

export default CompanyDebug;