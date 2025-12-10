import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Plus, Wrench, Edit, Trash2, Search, Calendar, DollarSign, FileText } from 'lucide-react';

const CarRepairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    vehicle_id: '',
    repair_date: new Date().toISOString().split('T')[0],
    description: '',
    service_provider: '',
    cost: '',
    invoice_number: '',
    status: 'pending',
    notes: ''
  });
  const [editingRepair, setEditingRepair] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch vehicles for dropdown
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number, make, model')
        .order('registration_number');

      if (vehiclesError) throw vehiclesError;

      // Fetch repairs with vehicle details
      const { data: repairsData, error: repairsError } = await supabase
        .from('car_repairs')
        .select(`
          *,
          vehicles (registration_number, make, model)
        `)
        .order('repair_date', { ascending: false });

      if (repairsError) throw repairsError;

      setVehicles(vehiclesData || []);
      setRepairs(repairsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  // Update the handleSubmit function:
const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage('');

  if (!formData.vehicle_id || !formData.description || !formData.service_provider || !formData.cost) {
    setMessage('Please fill in all required fields');
    return;
  }

  try {
    if (editingRepair) {
      const { error } = await supabase
        .from('car_repairs')
        .update({
          ...formData,
          cost: parseFloat(formData.cost),
          status: formData.cost > 5000 ? 'pending' : formData.status // Auto-pending for expensive repairs
        })
        .eq('id', editingRepair.id);

      if (error) throw error;
      setMessage('Repair record updated successfully!');
    } else {
      const { error } = await supabase
        .from('car_repairs')
        .insert([{
          ...formData,
          cost: parseFloat(formData.cost),
          status: formData.cost > 5000 ? 'pending' : 'approved' // Auto-approve cheap repairs
        }]);

      if (error) throw error;
      
      if (formData.cost > 5000) {
        setMessage('Repair submitted for approval!');
      } else {
        setMessage('Repair record added successfully!');
      }
    }

    setShowForm(false);
    setEditingRepair(null);
    setFormData({
      vehicle_id: '',
      repair_date: new Date().toISOString().split('T')[0],
      description: '',
      service_provider: '',
      cost: '',
      invoice_number: '',
      status: 'pending',
      notes: ''
    });
    fetchData();
  } catch (error) {
    console.error('Error saving repair:', error);
    setMessage('Error saving repair: ' + error.message);
  }
};

// Add approval info helper:
const getApprovalInfo = (repair) => {
  if (repair.status === 'pending') {
    return <span className="status-badge status-pending">Awaiting Approval</span>;
  } else if (repair.status === 'approved') {
    return (
      <div>
        <span className="status-badge status-approved">Approved</span>
        {repair.approved_by && (
          <small style={{ display: 'block', color: '#6b7280' }}>
            by {repair.approved_by}
          </small>
        )}
      </div>
    );
  }
  return <span className={`status-badge status-${repair.status}`}>{repair.status}</span>;
};

// Update the status table cell:
<td>{getApprovalInfo(repairs)}</td>

  const handleEdit = (repair) => {
    setEditingRepair(repair);
    setFormData({
      vehicle_id: repair.vehicle_id,
      repair_date: repair.repair_date,
      description: repair.description,
      service_provider: repair.service_provider,
      cost: repair.cost.toString(),
      invoice_number: repair.invoice_number || '',
      status: repair.status,
      notes: repair.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (repairId) => {
  if (!window.confirm('Are you sure you want to delete this repair record?')) return;

  try {
    const { error } = await supabase
      .from('car_repairs')
      .delete()
      .eq('id', repairId);

    if (error) throw error;
    
    // Update the local state to remove the deleted item
    setRepairs(prev => prev.filter(repair => repair.id !== repairId));
    setMessage('Repair record deleted successfully!');
  } catch (error) {
    console.error('Error deleting repair:', error);
    setMessage('Error deleting repair: ' + error.message);
  }
};

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      approved: { color: 'bg-blue-100 text-blue-800', label: 'Approved' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`status-badge ${config.color}`}>{config.label}</span>;
  };

  const filteredRepairs = repairs.filter(repair =>
    repair.vehicles?.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.service_provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (repair.invoice_number && repair.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalRepairCost = filteredRepairs.reduce((sum, repair) => sum + parseFloat(repair.cost || 0), 0);

  if (loading) {
    return (
      <div className="page">
        <h1>Car Repairs</h1>
        <div className="loading">Loading repairs...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Car Repairs</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingRepair(null);
            setFormData({
              vehicle_id: '',
              repair_date: new Date().toISOString().split('T')[0],
              description: '',
              service_provider: '',
              cost: '',
              invoice_number: '',
              status: 'pending',
              notes: ''
            });
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          Log Repair
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Repair Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingRepair ? 'Edit Repair Record' : 'Log New Repair'}</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vehicle_id">Vehicle *</label>
                <select
                  id="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  required
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration_number} - {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="repair_date">Repair Date *</label>
                <div className="input-with-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    id="repair_date"
                    value={formData.repair_date}
                    onChange={(e) => setFormData({ ...formData, repair_date: e.target.value })}
                    required
                  />
                </div>
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
                  <option value="approved">Approved</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Repair Description *</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the repair work done..."
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="service_provider">Service Provider *</label>
                <input
                  type="text"
                  id="service_provider"
                  value={formData.service_provider}
                  onChange={(e) => setFormData({ ...formData, service_provider: e.target.value })}
                  placeholder="Garage or mechanic name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="cost">Cost (KSH) *</label>
                <div className="input-with-icon">
                  <DollarSign size={16} />
                  <input
                    type="number"
                    id="cost"
                    step="0.01"
                    min="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="invoice_number">Invoice Number</label>
                <div className="input-with-icon">
                  <FileText size={16} />
                  <input
                    type="text"
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Additional Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information..."
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingRepair(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingRepair ? 'Update Repair' : 'Log Repair'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <h4>Total Repairs</h4>
          <p className="stat-number">{filteredRepairs.length}</p>
          <small>All time</small>
        </div>
        <div className="stat-card">
          <h4>Total Cost</h4>
          <p className="stat-number">KSH{totalRepairCost.toFixed(2)}</p>
          <small>Total spent on repairs</small>
        </div>
        <div className="stat-card">
          <h4>Pending Repairs</h4>
          <p className="stat-number">
            {filteredRepairs.filter(r => r.status === 'pending').length}
          </p>
          <small>Awaiting completion</small>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search repairs by vehicle, description, provider, or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Repairs List */}
      <div className="table-card">
        <h3>Repair History ({filteredRepairs.length})</h3>
        
        {filteredRepairs.length === 0 ? (
          <div className="empty-state">
            <Wrench size={48} />
            <p>No repair records found</p>
            {searchTerm && <p>Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Repair Date</th>
                  <th>Description</th>
                  <th>Service Provider</th>
                  <th>Cost(KSH)</th>
                  <th>Invoice #</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRepairs.map((repair) => (
                  <tr key={repair.id}>
                    <td>
                      <strong>{repair.vehicles?.registration_number}</strong>
                      <br />
                      <small>{repair.vehicles?.make} {repair.vehicles?.model}</small>
                    </td>
                    <td>{new Date(repair.repair_date).toLocaleDateString()}</td>
                    <td>
                      <div style={{ maxWidth: '200px' }}>
                        {repair.description}
                      </div>
                    </td>
                    <td>{repair.service_provider}</td>
                    <td>
                      <strong>KSH{parseFloat(repair.cost).toFixed(2)}</strong>
                    </td>
                    <td>{repair.invoice_number || '-'}</td>
                    <td>{getStatusBadge(repair.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(repair)}
                          className="icon-button edit"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(repair.id)}
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

export default CarRepairs;
