// components/InvitedSignup.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';

const InvitedSignup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: ''
  });

  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    if (inviteParam) {
      try {
        const decodedEmail = atob(inviteParam);
        setEmail(decodedEmail);
        
        // Check if invite is valid
        checkInviteStatus(decodedEmail);
      } catch (e) {
        setError('Invalid invitation link');
      }
    } else {
      setError('No invitation found');
    }
  }, [searchParams]);

  const checkInviteStatus = async (emailToCheck) => {
    try {
      const { data, error } = await supabase
        .from('user_registration_requests')
        .select('status, full_name, phone')
        .eq('email', emailToCheck)
        .single();

      if (error || data?.status !== 'approved') {
        setError('This invitation is no longer valid or has expired');
      } else {
        // Pre-fill user data
        setFormData(prev => ({
          ...prev,
          fullName: data.full_name || '',
          phone: data.phone || ''
        }));
      }
    } catch (error) {
      setError('Error validating invitation');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      // 1. Create auth user
      // eslint-disable-next-line no-unused-vars
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone
          }
        }
      });

      if (authError) throw authError;

      // 2. Update registration request
      const { error: updateError } = await supabase
        .from('user_registration_requests')
        .update({ status: 'completed' })
        .eq('email', email);

      if (updateError) console.warn('Could not update request status:', updateError);

      // 3. Show success and redirect
      alert('Account created successfully! You can now log in.');
      navigate('/login');
      
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Invalid Invitation</h2>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Complete Your Registration</h2>
      <p className="text-gray-600 mb-4">Welcome! Your email <strong>{email}</strong> has been approved.</p>
      
      <form onSubmit={handleSignup}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              required
              className="w-full p-2 border rounded"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="+254 712 345 678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
              className="w-full p-2 border rounded"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
              className="w-full p-2 border rounded"
              placeholder="Confirm your password"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-2 bg-red-50 text-red-800 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};

export default InvitedSignup;