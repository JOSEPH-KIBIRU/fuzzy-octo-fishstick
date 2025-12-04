// components/RegistrationRequest.jsx
import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';

const RegistrationRequest = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    department: '',
    position: '',
    requestedRole: 'employee'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('user_registration_requests')
        .insert([formData])
        .select();

      if (error) throw error;

      setMessage('✅ Registration request submitted! An admin will review it shortly.');
      setFormData({
        email: '',
        fullName: '',
        phone: '',
        department: '',
        position: '',
        requestedRole: 'employee'
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Registration error:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Request Access</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded"
              placeholder="your.email@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="w-full p-2 border rounded"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="+254 712 345 678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Department</option>
              <option value="Management">Management</option>
              <option value="Valuation">Valuation</option>
              <option value="IT">IT</option>
              <option value="Finance">Finance</option>
              <option value="HR">Human Resource</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Position</label>
            <input
              type="text"
              name="position"
              value={formData.position}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Your position"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Requested Role</label>
            <select
              name="requestedRole"
              value={formData.requestedRole}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Admins will review your role request</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-3 rounded ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <p className="mt-4 text-sm text-gray-600">
        Your request will be reviewed by an administrator. You'll receive an email once approved.
      </p>
    </div>
  );
};

export default RegistrationRequest;