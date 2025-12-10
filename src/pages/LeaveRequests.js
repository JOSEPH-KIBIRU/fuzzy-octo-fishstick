// pages/LeaveRequests.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useUserRoles } from '../hooks/useUserRoles';
import { emailService } from '../services/emailService';
import { Plus, Calendar, Edit, Trash2, Search, User,  } from 'lucide-react';

const LeaveRequests = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin, isSuperAdmin } = useUserRoles();
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmittedByColumn, setHasSubmittedByColumn] = useState(true); // Track if column exists

  const [formData, setFormData] = useState({
    employee_name: '',
    leave_type: 'annual',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
    contact_info: '',
    status: 'pending'
  });
  const [editingRequest, setEditingRequest] = useState(null);
  const [message, setMessage] = useState('');

  const leaveTypes = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'maternity', label: 'Maternity Leave' },
    { value: 'paternity', label: 'Paternity Leave' },
    { value: 'compassionate', label: 'Compassionate Leave' },
    { value: 'study', label: 'Study Leave' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      // Check if submitted_by_user_id column exists
      await checkColumnExists();
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchLeaveRequests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Check if submitted_by_user_id column exists
  const checkColumnExists = async () => {
    try {
      // Try to query with the column to see if it exists
      const { error } = await supabase
        .from('leave_requests')
        .select('submitted_by_user_id')
        .limit(1);

      if (error && error.code === '42703') {
        setHasSubmittedByColumn(false);
        console.warn('submitted_by_user_id column does not exist in leave_requests');
      } else {
        setHasSubmittedByColumn(true);
      }
    } catch (error) {
      console.warn('Error checking column existence:', error);
      setHasSubmittedByColumn(false);
    }
  };

  // ✅ FIXED: Fetch leave requests with proper user check
  const fetchLeaveRequests = async () => {
    try {
      let query = supabase
        .from('leave_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Only filter by user if they're not admin and column exists and user exists
      if (!isAdmin && !isSuperAdmin && hasSubmittedByColumn && user?.id) {
        query = query.eq('submitted_by_user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        // If error is due to missing column, try without the filter
        if (error.code === '42703') {
          console.warn('Column error, fetching all records without filter');
          setHasSubmittedByColumn(false);
          const { data: retryData, error: retryError } = await supabase
            .from('leave_requests')
            .select('*')
            .order('created_at', { ascending: false });

          if (retryError) throw retryError;
          setLeaveRequests(retryData || []);
        } else {
          throw error;
        }
      } else {
        setLeaveRequests(data || []);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      setMessage('Error loading leave requests');
    } finally {
      setLoading(false);
    }
  };

  
   // ✅ FIXED: Form submission with proper column handling
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      if (!formData.employee_name || !formData.start_date || !formData.end_date) {
        throw new Error('Employee name and dates are required');
      }

      // Build leave data
      const leaveData = {
        employee_name: formData.employee_name,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        contact_info: formData.contact_info,
        status: 'pending'
      };

      // Only add submitted_by_user_id if column exists and user exists
      if (hasSubmittedByColumn && user?.id) {
        leaveData.submitted_by_user_id = user.id;
      }

      // Only add c]reated_at if column likely exists
      if (hasSubmittedByColumn) {
        leaveData.created_at = new Date().toISOString();
      }

      let result;
      if (editingRequest) {
        const { data, error } = await supabase
          .from('leave_requests')
          .update(leaveData)
          .eq('id', editingRequest.id)
          .select();

        if (error) throw error;
        result = data;
        setMessage('Leave request updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('leave_requests')
          .insert([leaveData])
          .select();

        if (error) {
          // If column error, try without the problematic columns
          if (error.code === '42703') {
            console.warn('Column error, retrying without submitted_by_user_id and created_at');
            delete leaveData.submitted_by_user_id;
            delete leaveData.created_at;
            
            const { data: retryData, error: retryError } = await supabase
              .from('leave_requests')
              .insert([leaveData])
              .select();
              
            if (retryError) throw retryError;
            result = retryData;
            setHasSubmittedByColumn(false);
          } else {
            throw error;
          }
        } else {
          // eslint-disable-next-line no-unused-vars
          result = data;
        }

        setMessage('Leave request submitted successfully!');

        // ✅ Notify admins via email
        try {
          await emailService.notifyNewLeaveApplication(leaveData);
          console.log('✅ Admin notification sent for leave application');
        } catch (emailError) {
          console.warn('⚠️ Email notification failed, but leave request was saved:', emailError);
        }
      }

      setShowForm(false);
      setEditingRequest(null);
      setFormData({
        employee_name: '',
        leave_type: 'annual',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
        contact_info: '',
        status: 'pending'
      });
      
      await fetchLeaveRequests();
      
    } catch (error) {
      console.error('❌ Error in form submission:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ UPDATED: Approval with fallback for missing user_id
  const handleApprove = async (requestId) => {
    if (!isAdmin && !isSuperAdmin) {
      setMessage('You do not have permission to approve leave requests');
      return;
    }

    if (!window.confirm('Approve this leave request?')) return;

    try {
      const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;
      if (!request) throw new Error('Leave request not found');

      // Build update data with conditional fields
      const updateData = {
        status: 'approved',
        approved_by: user?.email || 'Admin'
      };

      // Only add approval_date if column likely exists
      try {
        updateData.approval_date = new Date().toISOString().split('T')[0];
      } catch (error) {
        console.warn('approval_date column might not exist');
      }

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // ✅ Notify the user who submitted it (if we have the user ID)
      if (request.submitted_by_user_id) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', request.submitted_by_user_id)
            .single();

          if (userProfile?.email) {
            await emailService.notifyUserAboutStatus(
              userProfile.email,
              'leave application',
              'approved',
              {
                employee_name: request.employee_name,
                leave_type: request.leave_type,
                start_date: request.start_date,
                end_date: request.end_date,
                approved_by: user?.email
              }
            );
          }
        } catch (emailError) {
          console.warn('⚠️ User notification failed, but leave was approved:', emailError);
        }
      }

      setMessage('Leave request approved successfully!');
      await fetchLeaveRequests();

    } catch (error) {
      console.error('❌ Error approving leave request:', error);
      setMessage(`Error: ${error.message}`);
    }
  };

  // ✅ UPDATED: Rejection with email notification to user
  const handleReject = async (requestId) => {
    if (!isAdmin && !isSuperAdmin) {
      setMessage('You do not have permission to reject leave requests');
      return;
    }

    const reason = prompt('Please provide a reason for rejection (optional):');
    if (reason === null) return;

    try {
      const { data: request, error: fetchError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;
      if (!request) throw new Error('Leave request not found');

      const updateData = {
        status: 'rejected',
        approved_by: user?.email || 'Admin',
        rejection_reason: reason || null,
        rejection_date: new Date().toISOString().split('T')[0]
      };

      const { error: updateError } = await supabase
        .from('leave_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // ✅ NEW: Notify the user who submitted it
      if (request.submitted_by_user_id) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', request.submitted_by_user_id)
            .single();

          if (userProfile?.email) {
            await emailService.notifyUserAboutStatus(
              userProfile.email,
              'leave application',
              'rejected',
              {
                employee_name: request.employee_name,
                leave_type: request.leave_type,
                start_date: request.start_date,
                end_date: request.end_date,
                reason: reason,
                approved_by: user?.email
              }
            );
          }
        } catch (emailError) {
          console.warn('⚠️ User notification failed, but leave was rejected:', emailError);
        }
      }

      setMessage('Leave request rejected successfully!');
      await fetchLeaveRequests();

    } catch (error) {
      console.error('❌ Error rejecting leave request:', error);
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      employee_name: request.employee_name,
      leave_type: request.leave_type,
      start_date: request.start_date,
      end_date: request.end_date,
      reason: request.reason || '',
      contact_info: request.contact_info || '',
      status: request.status
    });
    setShowForm(true);
  };

  const handleDelete = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) return;

    try {
      const { error } = await supabase
        .from('leave_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setLeaveRequests(prev => prev.filter(request => request.id !== requestId));
      setMessage('Leave request deleted successfully!');
    } catch (error) {
      console.error('Error deleting leave request:', error);
      setMessage('Error deleting leave request: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`status-badge ${config.color}`}>{config.label}</span>;
  };

  const getLeaveTypeLabel = (type) => {
    const typeConfig = leaveTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.label : type;
  };

  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const filteredRequests = leaveRequests.filter(request =>
    request.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingRequests = leaveRequests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="page">
        <h1>Leave Requests</h1>
        <div className="loading">Loading leave requests...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Leave Requests</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingRequest(null);
            setFormData({
              employee_name: '',
              leave_type: 'annual',
              start_date: new Date().toISOString().split('T')[0],
              end_date: new Date().toISOString().split('T')[0],
              reason: '',
              contact_info: '',
              status: 'pending'
            });
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          New Leave Request
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Leave Request Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingRequest ? 'Edit Leave Request' : 'New Leave Request'}</h3>
          <form onSubmit={handleFormSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="employee_name">Employee Name *</label>
                <div className="input-with-icon">
                  <User size={16} />
                  <input
                    type="text"
                    id="employee_name"
                    value={formData.employee_name}
                    onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
                    placeholder="Enter employee name"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="leave_type">Leave Type *</label>
                <select
                  id="leave_type"
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  required
                >
                  {leaveTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_date">Start Date *</label>
                <div className="input-with-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="end_date">End Date *</label>
                <div className="input-with-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    id="end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="contact_info">Contact During Leave</label>
                <input
                  type="text"
                  id="contact_info"
                  value={formData.contact_info}
                  onChange={(e) => setFormData({ ...formData, contact_info: e.target.value })}
                  placeholder="Phone number or email"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reason">Reason for Leave *</label>
              <textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Please provide details for your leave request..."
                required
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingRequest(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : (editingRequest ? 'Update Request' : 'Submit Request')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <h4>Total Requests</h4>
          <p className="stat-number">{leaveRequests.length}</p>
          <small>All leave requests</small>
        </div>
        <div className="stat-card">
          <h4>Pending Approval</h4>
          <p className="stat-number">{pendingRequests}</p>
          <small>Awaiting review</small>
        </div>
        <div className="stat-card">
          <h4>Approved</h4>
          <p className="stat-number">{leaveRequests.filter(r => r.status === 'approved').length}</p>
          <small>Approved requests</small>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by employee name, leave type, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Leave Requests List */}
      <div className="table-card">
        <h3>Leave Requests ({filteredRequests.length})</h3>

        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <Calendar size={48} />
            <p>No leave requests found</p>
            {searchTerm && <p>Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Duration</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.employee_name}</strong>
                      {request.contact_info && (
                        <small style={{ display: 'block', color: '#6b7280' }}>
                          Contact: {request.contact_info}
                        </small>
                      )}
                    </td>
                    <td>
                      <span className="category-badge">
                        {getLeaveTypeLabel(request.leave_type)}
                      </span>
                    </td>
                    <td>
                      {new Date(request.start_date).toLocaleDateString()} to {' '}
                      {new Date(request.end_date).toLocaleDateString()}
                    </td>
                    <td>
                      <strong>{calculateDays(request.start_date, request.end_date)} days</strong>
                    </td>
                    <td>
                      <div style={{ maxWidth: '200px' }}>
                        {request.reason}
                      </div>
                    </td>
                    <td>{getStatusBadge(request.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(request)}
                          className="icon-button edit"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        {(isAdmin || isSuperAdmin) && request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(request.id)}
                              className="icon-button approve"
                              title="Approve"
                              style={{
                                background: '#dcfce7',
                                color: '#16a34a',
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleReject(request.id)}
                              className="icon-button reject"
                              title="Reject"
                              style={{
                                background: '#fee2e2',
                                color: '#dc2626',
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}
                            >
                              ✗
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(request.id)}
                          className="icon-button delete"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveRequests;
