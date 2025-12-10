// components/Debug/AuthDebug.jsx
import React from 'react';
import { useAuthContext } from '../../contexts/AuthContext';

const AuthDebug = () => {
  const { user, profile, loading } = useAuthContext();

  console.log('=== AUTH DEBUG ===');
  console.log('Loading:', loading);
  console.log('User:', user);
  console.log('Profile:', profile);
  console.log('LocalStorage auth:', localStorage.getItem('supabase.auth.token'));
  console.log('=== END DEBUG ===');

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'white',
      padding: '10px',
      border: '1px solid #ccc',
      zIndex: 9999,
      fontSize: '12px'
    }}>
      <div><strong>Auth Debug</strong></div>
      <div>Loading: {loading ? '✅' : '❌'}</div>
      <div>User: {user ? '✅' : '❌'}</div>
      <div>Profile: {profile ? '✅' : '❌'}</div>
      <div>Email: {user?.email || 'None'}</div>
    </div>
  );
};

export default AuthDebug;