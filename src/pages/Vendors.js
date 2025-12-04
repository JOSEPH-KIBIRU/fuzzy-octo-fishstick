import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import {
  Plus,
  Building,
  Edit,
  Trash2,
  Search,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    vendor_name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    service_type: "supplies",
    tax_id: "",
    payment_terms: "",
    bank_account: "",
    notes: "",
    status: "active",
  });
  const [editingVendor, setEditingVendor] = useState(null);
  const [message, setMessage] = useState("");

  const serviceTypes = [
    { value: "supplies", label: "Office Supplies" },
    { value: "maintenance", label: "Maintenance" },
    { value: "insurance", label: "Insurance" },
    { value: "utilities", label: "Utilities" },
    { value: "transport", label: "Transport" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("vendor_name");

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
      setMessage("Error loading vendors");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!formData.vendor_name) {
      setMessage("Vendor name is required");
      return;
    }

    try {
      if (editingVendor) {
        const { error } = await supabase
          .from("vendors")
          .update(formData)
          .eq("id", editingVendor.id);

        if (error) throw error;
        setMessage("Vendor updated successfully!");
      } else {
        const { error } = await supabase.from("vendors").insert([formData]);

        if (error) throw error;
        setMessage("Vendor added successfully!");
      }

      setShowForm(false);
      setEditingVendor(null);
      setFormData({
        vendor_name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        service_type: "supplies",
        tax_id: "",
        payment_terms: "",
        bank_account: "",
        notes: "",
        status: "active",
      });
      fetchVendors();
    } catch (error) {
      console.error("Error saving vendor:", error);
      setMessage("Error saving vendor: " + error.message);
    }
  };

  const handleEdit = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      vendor_name: vendor.vendor_name,
      contact_person: vendor.contact_person || "",
      email: vendor.email || "",
      phone: vendor.phone || "",
      address: vendor.address || "",
      service_type: vendor.service_type,
      tax_id: vendor.tax_id || "",
      payment_terms: vendor.payment_terms || "",
      bank_account: vendor.bank_account || "",
      notes: vendor.notes || "",
      status: vendor.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (vendorId) => {
  if (!window.confirm('Are you sure you want to delete this vendor?')) return;

  try {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId);

    if (error) throw error;
    
    // Update the local state to remove the deleted item
    setVendors(prev => prev.filter(vendor => vendor.id !== vendorId));
    setMessage('Vendor deleted successfully!');
  } catch (error) {
    console.error('Error deleting vendor:', error);
    setMessage('Error deleting vendor: ' + error.message);
  }
};

  const getServiceTypeLabel = (serviceValue) => {
    const service = serviceTypes.find((s) => s.value === serviceValue);
    return service ? service.label : serviceValue;
  };

  const getStatusBadge = (status) => {
    return status === "active" ? (
      <span className="status-badge status-active">Active</span>
    ) : (
      <span className="status-badge status-inactive">Inactive</span>
    );
  };

  const filteredVendors = vendors.filter(
    (vendor) =>
      vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.service_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeVendors = vendors.filter((v) => v.status === "active").length;

  if (loading) {
    return (
      <div className="page">
        <h1>Vendors</h1>
        <div className="loading">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Vendor Management</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingVendor(null);
            setFormData({
              vendor_name: "",
              contact_person: "",
              email: "",
              phone: "",
              address: "",
              service_type: "supplies",
              tax_id: "",
              payment_terms: "",
              bank_account: "",
              notes: "",
              status: "active",
            });
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Vendor
        </button>
      </div>

      {message && (
        <div
          className={`message ${
            message.includes("Error") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}

      {/* Vendor Form */}
      {showForm && (
        <div className="form-card">
          <h3>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vendor_name">Vendor Name *</label>
                <input
                  type="text"
                  id="vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) =>
                    setFormData({ ...formData, vendor_name: e.target.value })
                  }
                  placeholder="Company name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="service_type">Service Type</label>
                <select
                  id="service_type"
                  value={formData.service_type}
                  onChange={(e) =>
                    setFormData({ ...formData, service_type: e.target.value })
                  }
                >
                  {serviceTypes.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="contact_person">Contact Person</label>
                <input
                  type="text"
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_person: e.target.value })
                  }
                  placeholder="Contact name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <div className="input-with-icon">
                  <Mail size={16} />
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@company.com"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <div className="input-with-icon">
                  <Phone size={16} />
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Address</label>
              <div className="input-with-icon">
                <MapPin size={16} />
                <textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Full address"
                  rows="2"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tax_id">Tax ID</label>
                <input
                  type="text"
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_id: e.target.value })
                  }
                  placeholder="Tax identification number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="payment_terms">Payment Terms</label>
                <input
                  type="text"
                  id="payment_terms"
                  value={formData.payment_terms}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_terms: e.target.value })
                  }
                  placeholder="e.g., Net 30, COD"
                />
              </div>

              <div className="form-group">
                <label htmlFor="bank_account">Bank Account</label>
                <input
                  type="text"
                  id="bank_account"
                  value={formData.bank_account}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_account: e.target.value })
                  }
                  placeholder="Bank account details"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes about this vendor..."
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingVendor(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingVendor ? "Update Vendor" : "Add Vendor"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <h4>Total Vendors</h4>
          <p className="stat-number">{vendors.length}</p>
          <small>All vendors</small>
        </div>
        <div className="stat-card">
          <h4>Active Vendors</h4>
          <p className="stat-number">{activeVendors}</p>
          <small>Currently active</small>
        </div>
        <div className="stat-card">
          <h4>Service Types</h4>
          <p className="stat-number">
            {new Set(vendors.map((v) => v.service_type)).size}
          </p>
          <small>Different services</small>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search vendors by name, contact person, or service type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Vendors List */}
      <div className="table-card">
        <h3>Vendors ({filteredVendors.length})</h3>

        {filteredVendors.length === 0 ? (
          <div className="empty-state">
            <Building size={48} />
            <p>No vendors found</p>
            {searchTerm && <p>Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Contact Person</th>
                  <th>Contact Info</th>
                  <th>Service Type</th>
                  <th>Payment Terms</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <div style={{ minWidth: "150px" }}>
                        {vendor.email && (
                          <div>
                            <Mail
                              size={12}
                              style={{ display: "inline", marginRight: "4px" }}
                            />
                            {vendor.email}
                          </div>
                        )}
                        {vendor.phone && (
                          <div>
                            <Phone
                              size={12}
                              style={{ display: "inline", marginRight: "4px" }}
                            />
                            {vendor.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="service-badge">
                        {getServiceTypeLabel(vendor.service_type)}
                      </span>
                    </td>
                    <td>{vendor.payment_terms || "-"}</td>
                    <td>{getStatusBadge(vendor.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => handleEdit(vendor)}
                          className="icon-button edit"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(vendor.id)}
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

export default Vendors;
