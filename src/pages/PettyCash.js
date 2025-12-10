/* eslint-disable no-unused-vars */
// pages/PettyCash.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useUserRoles } from '../hooks/useUserRoles';
import { emailService } from '../services/emailService';
import { Plus, DollarSign, Edit, Trash2, Search, Calendar, User } from 'lucide-react';

const PettyCash = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { isAdmin, isSuperAdmin } = useUserRoles();
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'office_supplies',
    description: '',
    status: 'pending'
  });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [message, setMessage] = useState('');
  const [balance, setBalance] = useState(0);

  const categories = [
    { value: 'office_supplies', label: 'Office Supplies' },
    { value: 'transport', label: 'Transport' },
    { value: 'meals', label: 'Meals & Entertainment' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('petty_cash')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
      calculateBalance(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setMessage('Error loading transactions');
    } finally {
      setLoading(false);
    }
  };

  const calculateBalance = (transactions) => {
    const total = transactions.reduce((sum, transaction) => {
      return sum + parseFloat(transaction.amount || 0);
    }, 0);
    setBalance(total);
  };

  // ✅ UPDATED: Form submission with email notification
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      if (!formData.amount || !formData.description) {
        throw new Error('Amount and description are required');
      }

      const transactionData = {
        transaction_date: formData.transaction_date,
        amount: parseFloat(formData.amount),
        category: formData.category,
        description: formData.description,
        status: 'pending',
        submitted_by_user_id: user?.id,
        created_at: new Date().toISOString()
      };

      let result;
      if (editingTransaction) {
        const { data, error } = await supabase
          .from('petty_cash')
          .update(transactionData)
          .eq('id', editingTransaction.id)
          .select();

        if (error) throw error;
        result = data;
        setMessage('Transaction updated successfully!');
      } else {
        const { data, error } = await supabase
          .from('petty_cash')
          .insert([transactionData])
          .select();

        if (error) throw error;
        result = data;
        setMessage('Transaction submitted successfully!');

        // ✅ NEW: Notify admins via email
        try {
          await emailService.notifyNewPettyCashRequest(transactionData);
          console.log('✅ Admin notification sent for petty cash request');
        } catch (emailError) {
          console.warn('⚠️ Email notification failed, but transaction was saved:', emailError);
        }
      }

      setShowForm(false);
      setEditingTransaction(null);
      setFormData({
        transaction_date: new Date().toISOString().split('T')[0],
        amount: '',
        category: 'office_supplies',
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

    if (!window.confirm('Approve this petty cash transaction?')) return;

    try {
      const { data: transaction, error: fetchError } = await supabase
        .from('petty_cash')
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
        .from('petty_cash')
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
              'petty cash request',
              'approved',
              {
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

      setMessage('Transaction approved successfully!');
      await fetchTransactions();

    } catch (error) {
      console.error('❌ Error approving transaction:', error);
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
        .from('petty_cash')
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
        .from('petty_cash')
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
              'petty cash request',
              'rejected',
              {
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

      setMessage('Transaction rejected successfully!');
      await fetchTransactions();

    } catch (error) {
      console.error('❌ Error rejecting transaction:', error);
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      transaction_date: transaction.transaction_date,
      amount: transaction.amount.toString(),
      category: transaction.category,
      description: transaction.description,
      status: transaction.status
    });
    setShowForm(true);
  };

  const handleDelete = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const { error } = await supabase
        .from('petty_cash')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => prev.filter(transaction => transaction.id !== transactionId));
      setMessage('Transaction deleted successfully!');
      calculateBalance(transactions.filter(transaction => transaction.id !== transactionId));
    } catch (error) {
      console.error('Error deleting transaction:', error);
      setMessage('Error deleting transaction: ' + error.message);
    }
  };

  const getApprovalInfo = (transaction) => {
    if (transaction.status === 'pending') {
      return <span className="status-badge status-pending">Awaiting Approval</span>;
    } else if (transaction.status === 'approved') {
      return (
        <div>
          <span className="status-badge status-approved">Approved</span>
          {transaction.approved_by && (
            <small style={{ display: 'block', color: '#6b7280' }}>
              by {transaction.approved_by}
            </small>
          )}
        </div>
      );
    } else if (transaction.status === 'rejected') {
      return (
        <div>
          <span className="status-badge status-rejected">Rejected</span>
          {transaction.approved_by && (
            <small style={{ display: 'block', color: '#6b7280' }}>
              by {transaction.approved_by}
            </small>
          )}
          {transaction.rejection_reason && (
            <small style={{ display: 'block', color: '#ef4444', fontStyle: 'italic' }}>
              Reason: {transaction.rejection_reason}
            </small>
          )}
        </div>
      );
    }
    return <span className="status-badge status-paid">Paid</span>;
  };

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  const filteredTransactions = transactions.filter(transaction =>
    transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (transaction.approved_by && transaction.approved_by.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
  const totalSpent = transactions.reduce((sum, transaction) => sum + parseFloat(transaction.amount || 0), 0);

  if (loading) {
    return (
      <div className="page">
        <h1>Petty Cash</h1>
        <div className="loading">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Petty Cash Management</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingTransaction(null);
            setFormData({
              transaction_date: new Date().toISOString().split('T')[0],
              amount: '',
              category: 'office_supplies',
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

      {/* Petty Cash Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}</h3>
          <form onSubmit={handleFormSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="transaction_date">Date *</label>
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

              <div className="form-group">
                <label htmlFor="category">Category *</label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                >
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the purpose of this expense..."
                required
                rows="3"
              />
            </div>

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
          <h4>Current Balance</h4>
          <p className="stat-number">KSH {balance.toFixed(2)}</p>
          <small>Total petty cash</small>
        </div>
        <div className="stat-card">
          <h4>Total Spent</h4>
          <p className="stat-number">KSH {totalSpent.toFixed(2)}</p>
          <small>All transactions</small>
        </div>
        <div className="stat-card">
          <h4>Pending Approval</h4>
          <p className="stat-number">{pendingTransactions}</p>
          <small>Awaiting review</small>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search transactions by description, category, or approver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="table-card">
        <h3>Petty Cash Transactions ({filteredTransactions.length})</h3>

        {filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <DollarSign size={48} />
            <p>No transactions found</p>
            {searchTerm && <p>Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount (KSH)</th>
                  <th>Approved By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.transaction_date).toLocaleDateString()}</td>
                    <td>
                      <div style={{ maxWidth: '200px' }}>
                        {transaction.description}
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">
                        {getCategoryLabel(transaction.category)}
                      </span>
                    </td>
                    <td>
                      <strong>KSH {parseFloat(transaction.amount).toFixed(2)}</strong>
                    </td>
                    <td>{transaction.approved_by || '-'}</td>
                    <td>{getApprovalInfo(transaction)}</td>
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

export default PettyCash;
