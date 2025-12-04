import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Plus, Car, Edit, Trash2, Search } from 'lucide-react';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    registration_number: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    assigned_driver: '',
    status: 'active'
  });
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setMessage('Error loading vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      if (editingVehicle) {
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update(formData)
          .eq('id', editingVehicle.id);

        if (error) throw error;
        setMessage('Vehicle updated successfully!');
      } else {
        // Add new vehicle
        const { error } = await supabase
          .from('vehicles')
          .insert([formData]);

        if (error) throw error;
        setMessage('Vehicle added successfully!');
      }

      // Reset form and refresh data
      setShowForm(false);
      setEditingVehicle(null);
      setFormData({
        registration_number: '',
        make: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        assigned_driver: '',
        status: 'active'
      });
      fetchVehicles();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      setMessage('Error saving vehicle: ' + error.message);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      registration_number: vehicle.registration_number,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      assigned_driver: vehicle.assigned_driver,
      status: vehicle.status
    });
    setShowForm(true);
  };

 const handleDelete = async (vehicleId) => {
  if (!window.confirm('Are you sure you want to delete this vehicle?')) return;

  try {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', vehicleId);

    if (error) throw error;
    
    // Update the local state to remove the deleted item
    setVehicles(prev => prev.filter(vehicle => vehicle.id !== vehicleId));
    setMessage('Vehicle deleted successfully!');
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    setMessage('Error deleting vehicle: ' + error.message);
  }
};
  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (vehicle.assigned_driver && vehicle.assigned_driver.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="page">
        <h1>Vehicle Management</h1>
        <div className="loading">Loading vehicles...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Vehicle Management</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingVehicle(null);
            setFormData({
              registration_number: '',
              make: '',
              model: '',
              year: new Date().getFullYear(),
              color: '',
              assigned_driver: '',
              status: 'active'
            });
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Vehicle
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Vehicle Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="registration_number">Registration Number *</label>
                <input
                  type="text"
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="make">Make *</label>
                <input
                  type="text"
                  id="make"
                  value={formData.make}
                  onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="model">Model *</label>
                <input
                  type="text"
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="year">Year</label>
                <input
                  type="number"
                  id="year"
                  min="2000"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="color">Color</label>
                <input
                  type="text"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="maintenance">Under Maintenance</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="assigned_driver">Assigned Driver</label>
              <input
                type="text"
                id="assigned_driver"
                value={formData.assigned_driver}
                onChange={(e) => setFormData({ ...formData, assigned_driver: e.target.value })}
                placeholder="Driver's name"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingVehicle(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search vehicles by registration, make, model, or driver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Vehicles List */}
      <div className="table-card">
        <h3>Vehicle List ({filteredVehicles.length})</h3>
        
        {filteredVehicles.length === 0 ? (
          <div className="empty-state">
            <Car size={48} />
            <p>No vehicles found</p>
            {searchTerm && <p>Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Make & Model</th>
                  <th>Year</th>
                  <th>Color</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id}>
                    <td>
                      <strong>{vehicle.registration_number}</strong>
                    </td>
                    <td>
                      {vehicle.make} {vehicle.model}
                    </td>
                    <td>{vehicle.year}</td>
                    <td>
                      <span className="color-badge" style={{ backgroundColor: vehicle.color?.toLowerCase() }}>
                        {vehicle.color}
                      </span>
                    </td>
                    <td>{vehicle.assigned_driver || '-'}</td>
                    <td>
                      <span className={`status-badge status-${vehicle.status}`}>
                        {vehicle.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="icon-button edit"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
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

export default VehicleManagement;