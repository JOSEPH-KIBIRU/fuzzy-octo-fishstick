import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useUserRoles } from '../hooks/useUserRoles';
import { emailService } from '../services/emailService';
import { Plus, DollarSign, Edit, Trash2, Search, Calendar, User,} from 'lucide-react';

const EmployeeTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin, isSuperAdmin } = useUserRoles();
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasPurposeColumn, setHasPurposeColumn] = useState(true);
  const [hasDescriptionColumn, setHasDescriptionColumn] = useState(true);
  const [hasSubmittedByColumn, setHasSubmittedByColumn] = useState(true);

  const [formData, setFormData] = useState({
    employee_name: '',
    transaction_type: 'advance',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    purpose: '', // ✅ ADD purpose field
    description: '',
    status: 'pending'
  });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [message, setMessage] = useState('');

  const transactionTypes = [
    { value: 'advance', label: 'Salary Advance' },
    { value: 'reimbursement', label: 'Expense Reimbursement' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'allowance', label: 'Allowance' }
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      await checkColumnsExist();
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Check which columns exist in the table
  const checkColumnsExist = async () => {
    try {
      // Check purpose column
      const { error: purposeError } = await supabase
        .from('employee_transactions')
        .select('purpose')
        .limit(1);

      if (purposeError && purposeError.code === '42703') {
        setHasPurposeColumn(false);
        console.warn('purpose column does not exist');
      }

      // Check description column
      const { error: descError } = await supabase
        .from('employee_transactions')
        .select('description')
        .limit(1);

      if (descError && descError.code === '42703') {
        setHasDescriptionColumn(false);
        console.warn('description column does not exist');
      }

      // Check submitted_by_user_id column
      const { error: userError } = await supabase
        .from('employee_transactions')
        .select('submitted_by_user_id')
        .limit(1);

      if (userError && userError.code === '42703') {
        setHasSubmittedByColumn(false);
        console.warn('submitted_by_user_id column does not exist');
      }

    } catch (error) {
      console.warn('Error checking columns:', error);
    }
  };


 const fetchTransactions = async () => {
    try {
      let query = supabase
        .from('employee_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (!isAdmin && !isSuperAdmin && hasSubmittedByColumn && user?.id) {
        query = query.eq('submitted_by_user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        if (error.code === '42703') {
          console.warn('Column error, fetching all records without filter');
          setHasSubmittedByColumn(false);
          const { data: retryData, error: retryError } = await supabase
            .from('employee_transactions')
            .select('*')
            .order('transaction_date', { ascending: false });

          if (retryError) throw retryError;
          setTransactions(retryData || []);
        } else {
          throw error;
        }
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error fetching employee transactions:', error);
      setMessage('Error loading transactions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Form submission with email notification
   const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      if (!formData.employee_name || !formData.amount) {
        throw new Error('Employee name and amount are required');
      }

      // Build transaction data with required fields
      const transactionData = {
        employee_name: formData.employee_name,
        transaction_type: formData.transaction_type,
        transaction_date: formData.transaction_date,
        amount: parseFloat(formData.amount),
        status: 'pending'
      };

      // Add purpose if column exists (and ensure it has a value)
      if (hasPurposeColumn) {
        transactionData.purpose = formData.purpose || 'General transaction';
      }

      // Add description if column exists
      if (hasDescriptionColumn && formData.description) {
        transactionData.description = formData.description;
      }

      // Add user tracking if column exists
      if (hasSubmittedByColumn && user?.id) {
        transactionData.submitted_by_user_id = user.id;
        transactionData.created_at = new Date().toISOString();
      }

      let result;
      if (editingTransaction) {
        const { data, error } = await supabase
          .from('employee_transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id)
          .select();

        if (error) throw error;
        result = data;
        setMessage('Employee transaction updated successfully!');
      } else {
        console.log('Inserting transaction data:', transactionData);

        const { data, error } = await supabase
          .from('employee_transactions')
          .insert([transactionData])
          .select();

        if (error) {
          console.error('Insert error:', error);
          
          // If column error, try without optional columns
          if (error.code === '42703') {
            console.warn('Column error, retrying without optional columns');
            
            // Remove optional columns and try again
            delete transactionData.submitted_by_user_id;
            delete transactionData.created_at;
            delete transactionData.description;
            
            // If purpose is still causing issues, provide a default
            if (hasPurposeColumn && (!transactionData.purpose || transactionData.purpose.trim() === '')) {
              transactionData.purpose = 'General transaction';
            }
            
            const { data: retryData, error: retryError } = await supabase
              .from('employee_transactions')
              .insert([transactionData])
              .select();
              
            if (retryError) {
              console.error('Retry error:', retryError);
              throw retryError;
            }
            result = retryData;
            setHasSubmittedByColumn(false);
            setHasDescriptionColumn(false);
          } else {
            throw error;
          }
        } else {
          // eslint-disable-next-line no-unused-vars
          result = data;
        }

        setMessage('Employee transaction submitted successfully!');

        // ✅ Notify admins via email
        try {
          await emailService.notifyNewEmployeeTransaction(transactionData);
          console.log('✅ Admin notification sent for employee transaction');
        } catch (emailError) {
          console.warn('⚠️ Email notification failed, but transaction was saved:', emailError);
        }
      }

      setShowForm(false);
      setEditingTransaction(null);
      setFormData({
        employee_name: '',
        transaction_type: 'advance',
        transaction_date: new Date().toISOString().split('T')[0],
        amount: '',
        purpose: '',
        description: '',
        status: 'pending'
      });
      
      await fetchTransactions();
      
    } catch (error) {
      console.error('❌ Error in form submission:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };


  // ✅ UPDATED: Approval with email notification to user
  const handleApprove = async (transactionId) => {
    if (!isAdmin && !isSuperAdmin) {
      setMessage('You do not have permission to approve transactions');
      return;
    }

    if (!window.confirm('Approve this employee transaction?')) return;

    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('employee_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) throw fetchError;
      if (!transaction) throw new Error('Transaction not found');

      const updateData = {
        status: 'approved',
        approved_by: user?.email || 'Admin',
        approval_date: new Date().toISOString().split('T')[0]
      };

      const { error: updateError } = await supabase
        .from('employee_transactions')
        .update(updateData)
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // ✅ NEW: Notify the user who submitted it
      if (transaction.submitted_by_user_id) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', transaction.submitted_by_user_id)
            .single();

          if (userProfile?.email) {
            await emailService.notifyUserAboutStatus(
              userProfile.email,
              'employee transaction',
              'approved',
              {
                employee_name: transaction.employee_name,
                transaction_type: transaction.transaction_type,
                amount: transaction.amount,
                description: transaction.description,
                approved_by: user?.email
              }
            );
          }
        } catch (emailError) {
          console.warn('⚠️ User notification failed, but transaction was approved:', emailError);
        }
      }

      setMessage('Employee transaction approved successfully!');
      await fetchTransactions();

    } catch (error) {
      console.error('❌ Error approving employee transaction:', error);
      setMessage(`Error: ${error.message}`);
    }
  };

  // ✅ UPDATED: Rejection with email notification to user
  const handleReject = async (transactionId) => {
    if (!isAdmin && !isSuperAdmin) {
      setMessage('You do not have permission to reject transactions');
      return;
    }

    const reason = prompt('Please provide a reason for rejection (optional):');
    if (reason === null) return;

    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('employee_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError) throw fetchError;
      if (!transaction) throw new Error('Transaction not found');

      const updateData = {
        status: 'rejected',
        approved_by: user?.email || 'Admin',
        rejection_reason: reason || null,
        rejection_date: new Date().toISOString().split('T')[0]
      };

      const { error: updateError } = await supabase
        .from('employee_transactions')
        .update(updateData)
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // ✅ NEW: Notify the user who submitted it
      if (transaction.submitted_by_user_id) {
        try {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', transaction.submitted_by_user_id)
            .single();

          if (userProfile?.email) {
            await emailService.notifyUserAboutStatus(
              userProfile.email,
              'employee transaction',
              'rejected',
              {
                employee_name: transaction.employee_name,
                transaction_type: transaction.transaction_type,
                amount: transaction.amount,
                description: transaction.description,
                reason: reason,
                approved_by: user?.email
              }
            );
          }
        } catch (emailError) {
          console.warn('⚠️ User notification failed, but transaction was rejected:', emailError);
        }
      }

      setMessage('Employee transaction rejected successfully!');
      await fetchTransactions();

    } catch (error) {
      console.error('❌ Error rejecting employee transaction:', error);
      setMessage(`Error: ${error.message}`);
    }
  };

 const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      employee_name: transaction.employee_name,
      transaction_type: transaction.transaction_type,
      transaction_date: transaction.transaction_date,
      amount: transaction.amount.toString(),
      purpose: transaction.purpose || '', // ✅ Include purpose
      description: transaction.description || '',
      status: transaction.status
    });
    setShowForm(true);
  };

  const handleDelete = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this employee transaction?')) return;

    try {
      const { error } = await supabase
        .from('employee_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => prev.filter(transaction => transaction.id !== transactionId));
      setMessage('Employee transaction deleted successfully!');
    } catch (error) {
      console.error('Error deleting employee transaction:', error);
      setMessage('Error deleting transaction: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      paid: { color: 'bg-blue-100 text-blue-800', label: 'Paid' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`status-badge ${config.color}`}>{config.label}</span>;
  };

  const getTransactionTypeLabel = (type) => {
    const typeConfig = transactionTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.label : type;
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.transaction_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.purpose && transaction.purpose.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (transaction.description && transaction.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

  if (loading) {
    return (
      <div className="page">
        <h1>Employee Transactions</h1>
        <div className="loading">Loading employee transactions...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Employee Transactions</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingTransaction(null);
            setFormData({
              employee_name: '',
              transaction_type: 'advance',
              transaction_date: new Date().toISOString().split('T')[0],
              amount: '',
              purpose: '',
              description: '',
              status: 'pending'
            });
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Transaction
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Employee Transaction Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingTransaction ? 'Edit Employee Transaction' : 'Add New Employee Transaction'}</h3>
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
                    placeholder="Enter employee name..."
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="transaction_type">Transaction Type *</label>
                <select
                  id="transaction_type"
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
                  required
                >
                  {transactionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="transaction_date">Transaction Date *</label>
                <div className="input-with-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    id="transaction_date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="amount">Amount (KSH) *</label>
                <div className="input-with-icon">
                  <DollarSign size={16} />
                  <input
                    type="number"
                    id="amount"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              {/* ✅ ADD purpose field */}
              {hasPurposeColumn && (
                <div className="form-group">
                  <label htmlFor="purpose">Purpose *</label>
                  <input
                    type="text"
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Purpose of this transaction..."
                    required={hasPurposeColumn}
                  />
                </div>
              )}

              {(isAdmin || isSuperAdmin || editingTransaction) && (
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              )}
            </div>

            {/* Description field (optional) */}
            {hasDescriptionColumn && (
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this transaction..."
                  rows="3"
                />
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTransaction(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : (editingTransaction ? 'Update Transaction' : 'Add Transaction')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <h4>Total Transactions</h4>
          <p className="stat-number">{transactions.length}</p>
          <small>All employee transactions</small>
        </div>
        <div className="stat-card">
          <h4>Pending Approval</h4>
          <p className="stat-number">{pendingTransactions}</p>
          <small>Awaiting review</small>
        </div>
        <div className="stat-card">
          <h4>Total Amount</h4>
          <p className="stat-number">
            KSH {transactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0).toFixed(2)}
          </p>
          <small>All transactions</small>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search transactions by employee name, type, purpose, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="table-card">
        <h3>Employee Transactions ({filteredTransactions.length})</h3>

        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <User size={48} />
            <p>No employee transactions found</p>
            {searchTerm && <p>Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Amount (KSH)</th>
                  {hasPurposeColumn && <th>Purpose</th>}
                  {hasDescriptionColumn && <th>Description</th>}
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <strong>{transaction.employee_name}</strong>
                    </td>
                    <td>
                      <span className="category-badge">
                        {getTransactionTypeLabel(transaction.transaction_type)}
                      </span>
                    </td>
                    <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                    <td>
                      <strong>KSH {parseFloat(transaction.amount).toFixed(2)}</strong>
                    </td>
                    {hasPurposeColumn && (
                      <td>
                        <div style={{ maxWidth: '200px' }}>
                          {transaction.purpose || '-'}
                        </div>
                      </td>
                    )}
                    {hasDescriptionColumn && (
                      <td>
                        <div style={{ maxWidth: '200px' }}>
                          {transaction.description || '-'}
                        </div>
                      </td>
                    )}
                    <td>{getStatusBadge(transaction.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="icon-button edit"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        {(isAdmin || isSuperAdmin) && transaction.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(transaction.id)}
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
                              onClick={() => handleReject(transaction.id)}
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
                          onClick={() => handleDelete(transaction.id)}
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

export default EmployeeTransactions;
