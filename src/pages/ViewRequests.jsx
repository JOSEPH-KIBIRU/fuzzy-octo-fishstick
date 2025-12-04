/* eslint-disable no-unused-vars */
// pages/ViewRequests.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { 
  User, Mail, Phone, Building, Briefcase, Clock,
  CheckCircle, XCircle, Search, Filter,
  RefreshCw, Download, Users, Eye, 
  TrendingUp, TrendingDown, Calendar
} from 'lucide-react';

const ViewRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
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
const handleApprove = async (requestId, email) => {
  if (!window.confirm('Approve this registration request?')) return;

  try {
    const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/approve-request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ request_id: requestId })
    })

    const result = await response.json()
    
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Approval failed')
    }
    
    // Send invitation email separately
    try {
      await sendInvitationEmail(email)
    } catch (emailErr) {
      console.warn('Email failed:', emailErr)
    }
    
    await fetchRequests()
    alert('✅ Request approved! User account created.')
    
  } catch (error) {
    console.error('Approval error:', error)
    alert('❌ Error: ' + error.message)
  }
}

  const handleReject = async (requestId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    const { error } = await supabase
      .from('user_registration_requests')
      .update({ 
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (!error) {
      fetchRequests();
      alert('❌ Request rejected.');
    }
  };

  const sendInvitationEmail = async (email) => {
    try {
      const invitationLink = `${window.location.origin}/signup?invite=${btoa(email)}`;
      
      await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: '🎉 Your Account Has Been Approved!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; color: white; text-align: center;">
                <h1 style="margin: 0; font-size: 28px;">Welcome to Office Manager!</h1>
                <p style="opacity: 0.9; margin-top: 10px;">Your registration request has been approved</p>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="color: #666; line-height: 1.6;">Hello,</p>
                <p style="color: #666; line-height: 1.6;">Congratulations! Your account has been approved by the administrator.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${invitationLink}" 
                     style="display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    🚀 Create Your Account
                  </a>
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #666; margin: 0; font-size: 14px;">
                    <strong>Important:</strong> This link will expire in 24 hours.
                  </p>
                </div>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  If you have any questions, please contact the system administrator.
                </p>
              </div>
            </div>
          `
        })
      });
    } catch (error) {
      console.error('Error sending invitation:', error);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.department?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || request.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Department', 'Position', 'Requested Role', 'Status', 'Date', 'Reviewed At'],
      ...requests.map(req => [
        req.full_name || '',
        req.email || '',
        req.phone || '',
        req.department || '',
        req.position || '',
        req.requested_role || '',
        req.status || '',
        new Date(req.created_at).toLocaleString(),
        req.reviewed_at ? new Date(req.reviewed_at).toLocaleString() : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registration-requests-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-skeleton">
          <div className="loading-title"></div>
          <div className="loading-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="loading-card"></div>
            ))}
          </div>
          <div className="loading-bar"></div>
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="loading-row"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-requests-container">
      <div className="container-wrapper">
        {/* Header */}
        <div className="view-requests-header">
          <div className="header-top">
            <div>
              <h1 className="view-requests-title">Registration Approvals</h1>
              <p className="view-requests-subtitle">Manage and review user registration requests</p>
            </div>
            <div className="header-actions">
              <button
                onClick={exportToCSV}
                className="btn btn-outline"
              >
                <Download size={18} />
                Export CSV
              </button>
              <button
                onClick={fetchRequests}
                className="btn btn-primary"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <div>
                <p className="stat-label">Total Requests</p>
                <p className="stat-value">{stats.total}</p>
              </div>
              <div className="stat-icon">
                <Users className="text-blue-600" size={24} />
              </div>
            </div>
            <div className="stat-trend">
              <TrendingUp className="text-green-500" size={16} />
              <span className="text-green-600 font-medium">+12% </span>
              <span className="text-gray-500">from last week</span>
            </div>
          </div>
          
          <div className="stat-card yellow">
            <div className="stat-card-header">
              <div>
                <p className="stat-label">Pending Review</p>
                <p className="stat-value">{stats.pending}</p>
              </div>
              <div className="stat-icon">
                <Clock className="text-yellow-600" size={24} />
              </div>
            </div>
            <div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(stats.pending / Math.max(stats.total, 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="stat-card green">
            <div className="stat-card-header">
              <div>
                <p className="stat-label">Approved</p>
                <p className="stat-value">{stats.approved}</p>
              </div>
              <div className="stat-icon">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
            <div className="stat-trend">
              <span className="text-gray-500">Approval rate: </span>
              <span className="font-bold text-green-600">
                {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
              </span>
            </div>
          </div>
          
          <div className="stat-card red">
            <div className="stat-card-header">
              <div>
                <p className="stat-label">Rejected</p>
                <p className="stat-value">{stats.rejected}</p>
              </div>
              <div className="stat-icon">
                <XCircle className="text-red-600" size={24} />
              </div>
            </div>
            <div className="stat-trend">
              <TrendingDown className="text-red-500" size={16} />
              <span className="text-red-600 font-medium">-5% </span>
              <span className="text-gray-500">from last week</span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="filters-card">
          <div className="filters-row">
            <div className="search-container">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search by name, email, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-controls">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="select-filter"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <div className="relative group">
                <button className="btn btn-outline">
                  <Filter size={18} />
                  More Filters
                </button>
              </div>
            </div>
          </div>
          
          <div className="filter-tags">
            {['employee', 'manager', 'admin'].map(role => (
              <button
                key={role}
                className="filter-tag"
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="filter-tag active"
              >
                Clear: "{searchTerm}"
                <XCircle size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Requests Table */}
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={32} />
            </div>
            <h3 className="empty-title">No requests found</h3>
            <p className="empty-description">
              {searchTerm 
                ? `No results for "${searchTerm}". Try a different search term.`
                : "There are no registration requests at the moment."}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="btn btn-primary"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="table-container">
            <div className="table-wrapper">
              <table className="requests-table">
                <thead>
                  <tr>
                    <th>Applicant Details</th>
                    <th>Department & Role</th>
                    <th>Request Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((request) => (
                    <tr 
                      key={request.id} 
                      onClick={() => viewRequestDetails(request)}
                    >
                      <td>
                        <div className="applicant-info">
                          <div className="avatar">
                            <User className="avatar-icon" size={24} />
                          </div>
                          <div className="applicant-details">
                            <p className="applicant-name">{request.full_name || 'No Name'}</p>
                            <p className="applicant-email">
                              <Mail size={14} /> {request.email}
                            </p>
                            {request.phone && (
                              <p className="applicant-phone">
                                <Phone size={14} /> {request.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Building size={16} className="text-gray-400" />
                            <span>{request.department || 'Not specified'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Briefcase size={16} className="text-gray-400" />
                            <span>{request.position || 'Not specified'}</span>
                          </div>
                          <span className={`role-badge ${
                            request.requested_role === 'admin' ? 'role-admin' :
                            request.requested_role === 'manager' ? 'role-manager' :
                            'role-employee'
                          }`}>
                            {request.requested_role || 'employee'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div>
                          {new Date(request.created_at).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {request.reviewed_at && (
                          <div className="text-xs text-gray-400 mt-2">
                            Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge ${
                          request.status === 'pending' ? 'status-pending' :
                          request.status === 'approved' ? 'status-approved' :
                          'status-rejected'
                        }`}>
                          {request.status === 'pending' && <Clock size={14} />}
                          {request.status === 'approved' && <CheckCircle size={14} />}
                          {request.status === 'rejected' && <XCircle size={14} />}
                          {request.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          {request.status === 'pending' ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApprove(request.id, request.email);
                                }}
                                className="btn btn-success"
                              >
                                <CheckCircle size={16} />
                                Approve
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReject(request.id);
                                }}
                                className="btn btn-danger"
                              >
                                <XCircle size={16} />
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                viewRequestDetails(request);
                              }}
                              className="btn btn-outline"
                            >
                              <Eye size={16} />
                              View Details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-info">
                Showing <span className="font-semibold">{filteredRequests.length}</span> of{' '}
                <span className="font-semibold">{requests.length}</span> requests
              </div>
              <div className="pagination-buttons">
                <button className="pagination-btn">Previous</button>
                <button className="pagination-btn active">1</button>
                <button className="pagination-btn">2</button>
                <button className="pagination-btn">Next</button>
              </div>
            </div>
          </div>
        )}

        {/* Request Details Modal */}
        {showDetails && selectedRequest && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">Request Details</h2>
                  <p className="modal-subtitle">Complete information about this registration request</p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="modal-close"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="modal-body">
                <div className="space-y-6">
                  {/* Applicant Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <User className="text-white" size={28} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{selectedRequest.full_name}</h3>
                        <p className="text-gray-600 flex items-center gap-2">
                          <Mail size={16} /> {selectedRequest.email}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <span className={`status-badge ${
                          selectedRequest.status === 'pending' ? 'status-pending' :
                          selectedRequest.status === 'approved' ? 'status-approved' :
                          'status-rejected'
                        }`}>
                          {selectedRequest.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Phone size={16} />
                          {selectedRequest.phone || 'Not provided'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Building size={16} />
                          {selectedRequest.department || 'Not specified'}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Position</label>
                        <div className="flex items-center gap-2 text-gray-900">
                          <Briefcase size={16} />
                          {selectedRequest.position || 'Not specified'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Requested Role</label>
                        <span className={`role-badge ${
                          selectedRequest.requested_role === 'admin' ? 'role-admin' :
                          selectedRequest.requested_role === 'manager' ? 'role-manager' :
                          'role-employee'
                        }`}>
                          {selectedRequest.requested_role || 'employee'}
                        </span>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Request Date</label>
                        <div className="text-gray-900 flex items-center gap-2">
                          <Calendar size={16} />
                          {new Date(selectedRequest.created_at).toLocaleString()}
                        </div>
                      </div>
                      
                      {selectedRequest.reviewed_at && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Reviewed Date</label>
                          <div className="text-gray-900">
                            {new Date(selectedRequest.reviewed_at).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rejection Reason */}
                  {selectedRequest.rejection_reason && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <XCircle className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Rejection Reason</h3>
                          <div className="mt-2 text-sm text-red-700">
                            <p>{selectedRequest.rejection_reason}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {selectedRequest.status === 'pending' && (
                    <div className="flex gap-3 pt-6 border-t">
                      <button
                        onClick={() => {
                          handleApprove(selectedRequest.id, selectedRequest.email);
                          setShowDetails(false);
                        }}
                        className="btn btn-success flex-1"
                      >
                        <CheckCircle size={20} />
                        Approve Request
                      </button>
                      <button
                        onClick={() => {
                          handleReject(selectedRequest.id);
                          setShowDetails(false);
                        }}
                        className="btn btn-danger flex-1"
                      >
                        <XCircle size={20} />
                        Reject Request
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewRequests;