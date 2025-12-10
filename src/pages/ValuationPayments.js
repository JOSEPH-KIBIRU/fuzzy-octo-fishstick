import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { 
  Plus, 
  Building, 
  Edit, 
  Trash2, 
  Search, 
  Calendar, 
  DollarSign, 
  FileText,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

const ValuationPayments = () => {
  const [valuations, setValuations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    property_name: '',
    property_type: 'residential',
    valuation_amount: '',
    payment_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    status: 'completed',
    due_date: '',
    notes: ''
  });
  const [editingValuation, setEditingValuation] = useState(null);
  const [message, setMessage] = useState('');

  const propertyTypes = [
    { value: 'residential', label: 'Residential' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'land', label: 'Land' },
    { value: 'agricultural', label: 'Agricultural' }
  ];

  const paymentMethods = [
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'cash', label: 'Cash' },
    { value: 'mobile_money', label: 'Mobile Money' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchValuations();
  }, []);

  const fetchValuations = async () => {
    try {
      const { data, error } = await supabase
        .from('valuation_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setValuations(data || []);
    } catch (error) {
      console.error('Error fetching valuation payments:', error);
      setMessage('Error loading valuation payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    // Validation
    if (!formData.property_name || !formData.valuation_amount || !formData.payment_amount || !formData.payment_date) {
      setMessage('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.payment_amount) > parseFloat(formData.valuation_amount)) {
      setMessage('Payment amount cannot exceed valuation amount');
      return;
    }

    try {
      if (editingValuation) {
        const { error } = await supabase
          .from('valuation_payments')
          .update({
            ...formData,
            valuation_amount: parseFloat(formData.valuation_amount),
            payment_amount: parseFloat(formData.payment_amount)
          })
          .eq('id', editingValuation.id);

        if (error) throw error;
        setMessage('Valuation payment updated successfully!');
      } else {
        const { error } = await supabase
          .from('valuation_payments')
          .insert([{
            ...formData,
            valuation_amount: parseFloat(formData.valuation_amount),
            payment_amount: parseFloat(formData.payment_amount)
          }]);

        if (error) throw error;
        setMessage('Valuation payment added successfully!');
      }

      // Reset form and refresh data
      setShowForm(false);
      setEditingValuation(null);
      setFormData({
        property_name: '',
        property_type: 'residential',
        valuation_amount: '',
        payment_amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference_number: '',
        status: 'completed',
        due_date: '',
        notes: ''
      });
      fetchValuations();
    } catch (error) {
      console.error('Error saving valuation payment:', error);
      setMessage('Error saving valuation payment: ' + error.message);
    }
  };

 // ✅ Fixed handleEdit for valuations
  const handleEdit = (valuation) => {
    console.log('🔍 Editing valuation:', {
      id: valuation.id,
      property_address: valuation.property_address,
      valuation_amount: valuation.valuation_amount
    });
    
    setEditingValuation(valuation);
    setFormData({
      property_address: valuation.property_address,
      valuation_amount: valuation.valuation_amount.toString(),
      payment_date: valuation.payment_date,
      payment_amount: valuation.payment_amount.toString(),
      status: valuation.status,
      notes: valuation.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (valuationId) => {
    if (!window.confirm('Are you sure you want to delete this valuation payment?')) return;

    try {
      const { error } = await supabase
        .from('valuation_payments')
        .delete()
        .eq('id', valuationId);

      if (error) throw error;
      
      setValuations(prev => prev.filter(valuation => valuation.id !== valuationId));
      setMessage('Valuation payment deleted successfully!');
    } catch (error) {
      console.error('Error deleting valuation payment:', error);
      setMessage('Error deleting valuation payment: ' + error.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed', icon: CheckCircle },
      overdue: { color: 'bg-red-100 text-red-800', label: 'Overdue', icon: XCircle },
      cancelled: { color: 'bg-gray-100 text-gray-800', label: 'Cancelled', icon: XCircle }
    };
    
    const config = statusConfig[status] || statusConfig.completed;
    const IconComponent = config.icon;
    
    return (
      <span className={`status-badge ${config.color} flex items-center gap-1`}>
        <IconComponent size={14} />
        {config.label}
      </span>
    );
  };

  const getPropertyTypeBadge = (type) => {
    const typeConfig = {
      residential: { color: 'bg-blue-100 text-blue-800', label: 'Residential' },
      commercial: { color: 'bg-purple-100 text-purple-800', label: 'Commercial' },
      industrial: { color: 'bg-orange-100 text-orange-800', label: 'Industrial' },
      land: { color: 'bg-green-100 text-green-800', label: 'Land' },
      agricultural: { color: 'bg-brown-100 text-brown-800', label: 'Agricultural' }
    };
    
    const config = typeConfig[type] || typeConfig.residential;
    return <span className={`status-badge ${config.color}`}>{config.label}</span>;
  };

  const getPaymentMethodBadge = (method) => {
    const methodConfig = {
      bank_transfer: { color: 'bg-indigo-100 text-indigo-800', label: 'Bank Transfer' },
      cheque: { color: 'bg-pink-100 text-pink-800', label: 'Cheque' },
      cash: { color: 'bg-emerald-100 text-emerald-800', label: 'Cash' },
      mobile_money: { color: 'bg-teal-100 text-teal-800', label: 'Mobile Money' },
      other: { color: 'bg-gray-100 text-gray-800', label: 'Other' }
    };
    
    const config = methodConfig[method] || methodConfig.other;
    return <span className={`status-badge ${config.color}`}>{config.label}</span>;
  };

  const filteredValuations = valuations.filter(valuation =>
    valuation.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    valuation.property_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (valuation.reference_number && valuation.reference_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate statistics
  const totalValuation = valuations.reduce((sum, valuation) => sum + parseFloat(valuation.valuation_amount || 0), 0);
  const totalPayments = valuations.reduce((sum, valuation) => sum + parseFloat(valuation.payment_amount || 0), 0);
  const pendingValuations = valuations.filter(v => v.status === 'pending').length;
  const overdueValuations = valuations.filter(v => v.status === 'overdue').length;

  if (loading) {
    return (
      <div className="page">
        <h1>Valuation Payments</h1>
        <div className="loading">Loading valuation payments...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Valuation Payments</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingValuation(null);
            setFormData({
              property_name: '',
              property_type: 'residential',
              valuation_amount: '',
              payment_amount: '',
              payment_date: new Date().toISOString().split('T')[0],
              payment_method: 'bank_transfer',
              reference_number: '',
              status: 'completed',
              due_date: '',
              notes: ''
            });
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Valuation Payment
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Valuation Payment Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingValuation ? 'Edit Valuation Payment' : 'Add New Valuation Payment'}</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="property_name">Property Name *</label>
                <div className="input-with-icon">
                  <Building size={16} />
                  <input
                    type="text"
                    id="property_name"
                    value={formData.property_name}
                    onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
                    placeholder="e.g., Office Building Downtown"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="property_type">Property Type *</label>
                <select
                  id="property_type"
                  value={formData.property_type}
                  onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                  required
                >
                  {propertyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="valuation_amount">Valuation Amount (KSH) *</label>
                <div className="input-with-icon">
                  <DollarSign size={16} />
                  <input
                    type="number"
                    id="valuation_amount"
                    step="0.01"
                    min="0"
                    value={formData.valuation_amount}
                    onChange={(e) => setFormData({ ...formData, valuation_amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="payment_amount">Payment Amount (KSH) *</label>
                <div className="input-with-icon">
                  <DollarSign size={16} />
                  <input
                    type="number"
                    id="payment_amount"
                    step="0.01"
                    min="0"
                    value={formData.payment_amount}
                    onChange={(e) => setFormData({ ...formData, payment_amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="payment_date">Payment Date *</label>
                <div className="input-with-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    id="payment_date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="payment_method">Payment Method</label>
                <select
                  id="payment_method"
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                >
                  {paymentMethods.map(method => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="reference_number">Reference Number</label>
                <div className="input-with-icon">
                  <FileText size={16} />
                  <input
                    type="text"
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="Transaction reference"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="due_date">Due Date</label>
                <div className="input-with-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    id="due_date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this valuation payment..."
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingValuation(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingValuation ? 'Update Payment' : 'Add Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <h4>Total Valuation</h4>
          <p className="stat-number">KSH {(totalValuation / 1000000).toFixed(2)}M</p>
          <small>Total property value</small>
        </div>
        <div className="stat-card">
          <h4>Total Payments</h4>
          <p className="stat-number">KSH {(totalPayments / 1000000).toFixed(2)}M</p>
          <small>Amount paid</small>
        </div>
        <div className="stat-card">
          <h4>Pending</h4>
          <p className="stat-number">{pendingValuations}</p>
          <small>Awaiting payment</small>
        </div>
        <div className="stat-card">
          <h4>Overdue</h4>
          <p className="stat-number">{overdueValuations}</p>
          <small>Late payments</small>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by property name, type, or reference number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Valuation Payments List */}
      <div className="table-card">
        <h3>Valuation Payments ({filteredValuations.length})</h3>
        
        {filteredValuations.length === 0 ? (
          <div className="empty-state">
            <Building size={48} />
            <p>No valuation payments found</p>
            {searchTerm && <p>Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Valuation (KSH)</th>
                  <th>Payment (KSH)</th>
                  <th>Payment Date</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredValuations.map((valuation) => (
                  <tr key={valuation.id}>
                    <td>
                      <strong>{valuation.property_name}</strong>
                      {valuation.reference_number && (
                        <><br /><small>Ref: {valuation.reference_number}</small></>
                      )}
                    </td>
                    <td>{getPropertyTypeBadge(valuation.property_type)}</td>
                    <td>
                      <strong>{(parseFloat(valuation.valuation_amount) / 1000000).toFixed(2)}M</strong>
                    </td>
                    <td>
                      <strong>{(parseFloat(valuation.payment_amount) / 1000000).toFixed(2)}M</strong>
                    </td>
                    <td>{new Date(valuation.payment_date).toLocaleDateString()}</td>
                    <td>{getPaymentMethodBadge(valuation.payment_method)}</td>
                    <td>{getStatusBadge(valuation.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(valuation)}
                          className="icon-button edit"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(valuation.id)}
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

export default ValuationPayments;
