// components/AdminApprovalPanel.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { notificationService } from '../services/notificationService';

const AdminApprovalPanel = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    checkUserRole();
    fetchRequests();
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setUserRole(profile?.role);
    }
  };

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('user_registration_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId, userEmail) => {
    try {
      // 1. Update request status
      const { error } = await supabase
        .from('user_registration_requests')
        .update({
          status: 'approved',
          reviewed_by: (await supabase.auth.getUser()).data.user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // 2. Send invitation email
      await sendInvitationEmail(userEmail);

      // 3. Refresh list
      fetchRequests();

      // 4. Notify admin
      notificationService.createReminderNotification({
        title: 'User Approved',
        message: `Access granted to ${userEmail}`,
        type: 'user_approval'
      });

    } catch (error) {
      console.error('Approval error:', error);
    }
  };

  const handleReject = async (requestId, userEmail, reason) => {
    const rejectionReason = prompt('Please provide a reason for rejection:', '');
    if (!rejectionReason) return;

    try {
      const { error } = await supabase
        .from('user_registration_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_by: (await supabase.auth.getUser()).data.user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      await sendRejectionEmail(userEmail, rejectionReason);
      fetchRequests();

    } catch (error) {
      console.error('Rejection error:', error);
    }
  };

  const sendInvitationEmail = async (email) => {
    try {
      const invitationLink = `${window.location.origin}/signup?invite=${btoa(email)}`;
      
      await notificationService.sendEmailViaEdgeFunction({
        to: email,
        subject: 'Your Account Has Been Approved',
        html: `
          <h1>Welcome to Office Management System</h1>
          <p>Your registration request has been approved!</p>
          <p>Click the link below to create your account:</p>
          <a href="${invitationLink}" style="display: inline-block; padding: 10px 20px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px;">
            Create Account
          </a>
          <p>This link will expire in 24 hours.</p>
        `,
        text: `Your account has been approved. Create your account here: ${invitationLink}`
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
    }
  };

  const sendRejectionEmail = async (email, reason) => {
    try {
      await notificationService.sendEmailViaEdgeFunction({
        to: email,
        subject: 'Registration Request Update',
        html: `
          <h1>Registration Request Status</h1>
          <p>Your registration request has been reviewed.</p>
          <p><strong>Status:</strong> Rejected</p>
          <p><strong>Reason:</strong> ${reason}</p>
          <p>Please contact the administrator if you have questions.</p>
        `,
        text: `Your registration was rejected. Reason: ${reason}`
      });
    } catch (error) {
      console.error('Error sending rejection:', error);
    }
  };

  // Restrict access to admins only
  if (!userRole || !['admin', 'super_admin'].includes(userRole)) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded">
        <h2 className="text-xl font-bold text-yellow-800">Access Denied</h2>
        <p className="text-yellow-600">Only administrators can access this panel.</p>
      </div>
    );
  }

  if (loading) return <div>Loading requests...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">User Registration Requests</h2>
      
      {requests.length === 0 ? (
        <p className="text-gray-500">No pending requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{request.full_name}</h3>
                  <p className="text-gray-600">{request.email}</p>
                  <div className="mt-2 space-x-4 text-sm">
                    <span>📞 {request.phone || 'Not provided'}</span>
                    <span>🏢 {request.department || 'Not specified'}</span>
                    <span>💼 {request.position || 'Not specified'}</span>
                    <span className={`px-2 py-1 rounded ${
                      request.requested_role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      request.requested_role === 'manager' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.requested_role}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Requested: {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  {request.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(request.id, request.email)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(request.id, request.email)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className={`px-3 py-1 rounded ${
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
              {request.rejection_reason && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                  <strong>Rejection Reason:</strong> {request.rejection_reason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminApprovalPanel;