import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import {
  Plus,
  Shield,
  Edit,
  Trash2,
  Search,
  Calendar,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

const Insurance = () => {
  const [policies, setPolicies] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    vehicle_id: "",
    provider_name: "",
    policy_number: "",
    coverage_type: "comprehensive",
    premium_amount: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    renewal_date: "",
  });
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch vehicles for dropdown
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("id, registration_number, make, model")
        .order("registration_number");

      if (vehiclesError) throw vehiclesError;

      // Fetch insurance policies with vehicle details
      const { data: policiesData, error: policiesError } = await supabase
        .from("insurance_policies")
        .select(
          `
          *,
          vehicles (registration_number, make, model)
        `
        )
        .order("end_date", { ascending: true }); // Sort by end date to see expiring soon first

      if (policiesError) throw policiesError;

      setVehicles(vehiclesData || []);
      setPolicies(policiesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const calculateRenewalDate = (endDate) => {
    if (!endDate) return "";
    const end = new Date(endDate);
    const renewal = new Date(end);
    renewal.setDate(renewal.getDate() - 30); // 30 days before end date for renewal reminder
    return renewal.toISOString().split("T")[0];
  };

  const handleDateChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };

    // Auto-calculate renewal date when end date changes
    if (field === "end_date" && value) {
      newFormData.renewal_date = calculateRenewalDate(value);
    }

    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    // Validate form
    if (
      !formData.vehicle_id ||
      !formData.provider_name ||
      !formData.policy_number ||
      !formData.premium_amount ||
      !formData.start_date ||
      !formData.end_date
    ) {
      setMessage("Please fill in all required fields");
      return;
    }

    // Validate dates
    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      setMessage("End date must be after start date");
      return;
    }

    try {
      if (editingPolicy) {
        // Update existing policy
        const { error } = await supabase
          .from("insurance_policies")
          .update({
            ...formData,
            premium_amount: parseFloat(formData.premium_amount),
          })
          .eq("id", editingPolicy.id);

        if (error) throw error;
        setMessage("Insurance policy updated successfully!");
      } else {
        // Add new policy
        const { error } = await supabase.from("insurance_policies").insert([
          {
            ...formData,
            premium_amount: parseFloat(formData.premium_amount),
          },
        ]);

        if (error) throw error;
        setMessage("Insurance policy added successfully!");
      }

      // Reset form and refresh data
      setShowForm(false);
      setEditingPolicy(null);
      setFormData({
        vehicle_id: "",
        provider_name: "",
        policy_number: "",
        coverage_type: "comprehensive",
        premium_amount: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        renewal_date: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error saving policy:", error);
      setMessage("Error saving policy: " + error.message);
    }
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      vehicle_id: policy.vehicle_id,
      provider_name: policy.provider_name,
      policy_number: policy.policy_number,
      coverage_type: policy.coverage_type,
      premium_amount: policy.premium_amount.toString(),
      start_date: policy.start_date,
      end_date: policy.end_date,
      renewal_date:
        policy.renewal_date || calculateRenewalDate(policy.end_date),
    });
    setShowForm(true);
  };

  const handleDelete = async (policyId) => {
  if (!window.confirm('Are you sure you want to delete this insurance policy?')) return;

  try {
    const { error } = await supabase
      .from('insurance_policies')
      .delete()
      .eq('id', policyId);

    if (error) throw error;
    
    // Update the local state to remove the deleted item
    setPolicies(prev => prev.filter(policy => policy.id !== policyId));
    setMessage('Insurance policy deleted successfully!');
  } catch (error) {
    console.error('Error deleting policy:', error);
    setMessage('Error deleting policy: ' + error.message);
  }
};

  const getDaysUntilExpiry = (endDate) => {
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (endDate) => {
    const daysUntilExpiry = getDaysUntilExpiry(endDate);

    if (daysUntilExpiry < 0)
      return {
        status: "expired",
        color: "bg-red-100 text-red-800",
        label: "Expired",
      };
    if (daysUntilExpiry <= 30)
      return {
        status: "expiring",
        color: "bg-orange-100 text-orange-800",
        label: "Expiring Soon",
      };
    if (daysUntilExpiry <= 90)
      return {
        status: "warning",
        color: "bg-yellow-100 text-yellow-800",
        label: "Renewal Due",
      };
    return {
      status: "active",
      color: "bg-green-100 text-green-800",
      label: "Active",
    };
  };

  const getCoverageBadge = (coverageType) => {
    const coverageConfig = {
      comprehensive: {
        color: "bg-blue-100 text-blue-800",
        label: "Comprehensive",
      },
      third_party: {
        color: "bg-purple-100 text-purple-800",
        label: "Third Party",
      },
      third_party_fire_theft: {
        color: "bg-indigo-100 text-indigo-800",
        label: "Third Party Fire & Theft",
      },
    };

    const config = coverageConfig[coverageType] || coverageConfig.comprehensive;
    return (
      <span className={`status-badge ${config.color}`}>{config.label}</span>
    );
  };

  const filteredPolicies = policies.filter(
    (policy) =>
      policy.vehicles?.registration_number
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      policy.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.policy_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.coverage_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const expiringSoon = policies.filter((policy) => {
    const daysUntilExpiry = getDaysUntilExpiry(policy.end_date);
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  });

  const totalAnnualPremium = policies.reduce(
    (sum, policy) => sum + parseFloat(policy.premium_amount || 0),
    0
  );

  if (loading) {
    return (
      <div className="page">
        <h1>Insurance Policies</h1>
        <div className="loading">Loading policies...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Insurance Policies</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingPolicy(null);
            setFormData({
              vehicle_id: "",
              provider_name: "",
              policy_number: "",
              coverage_type: "comprehensive",
              premium_amount: "",
              start_date: new Date().toISOString().split("T")[0],
              end_date: "",
              renewal_date: "",
            });
          }}
          className="btn-primary"
        >
          <Plus size={16} />
          Add Policy
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

      {/* Insurance Policy Form */}
      {showForm && (
        <div className="form-card">
          <h3>
            {editingPolicy
              ? "Edit Insurance Policy"
              : "Add New Insurance Policy"}
          </h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="vehicle_id">Vehicle *</label>
                <select
                  id="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select a vehicle</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registration_number} - {vehicle.make}{" "}
                      {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="coverage_type">Coverage Type *</label>
                <select
                  id="coverage_type"
                  value={formData.coverage_type}
                  onChange={(e) =>
                    setFormData({ ...formData, coverage_type: e.target.value })
                  }
                  required
                >
                  <option value="comprehensive">Comprehensive</option>
                  <option value="third_party">Third Party</option>
                  <option value="third_party_fire_theft">
                    Third Party Fire & Theft
                  </option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="provider_name">Insurance Provider *</label>
                <input
                  type="text"
                  id="provider_name"
                  value={formData.provider_name}
                  onChange={(e) =>
                    setFormData({ ...formData, provider_name: e.target.value })
                  }
                  placeholder="Insurance company name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="policy_number">Policy Number *</label>
                <input
                  type="text"
                  id="policy_number"
                  value={formData.policy_number}
                  onChange={(e) =>
                    setFormData({ ...formData, policy_number: e.target.value })
                  }
                  placeholder="Policy reference number"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="premium_amount">Premium Amount (KSH) *</label>
                <div className="input-with-icon">
                  <DollarSign size={16} />
                  <input
                    type="number"
                    id="premium_amount"
                    step="0.01"
                    min="0"
                    value={formData.premium_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        premium_amount: e.target.value,
                      })
                    }
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="start_date">Start Date *</label>
                <div className="input-with-icon">
                  <Calendar size={16} />
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) =>
                      handleDateChange("start_date", e.target.value)
                    }
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
                    onChange={(e) =>
                      handleDateChange("end_date", e.target.value)
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="renewal_date">Renewal Reminder Date</label>
              <div className="input-with-icon">
                <Calendar size={16} />
                <input
                  type="date"
                  id="renewal_date"
                  value={formData.renewal_date}
                  onChange={(e) =>
                    setFormData({ ...formData, renewal_date: e.target.value })
                  }
                  readOnly
                  className="disabled-input"
                />
              </div>
              <small>Automatically set to 30 days before end date</small>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPolicy(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingPolicy ? "Update Policy" : "Add Policy"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts Section */}
      {expiringSoon.length > 0 && (
        <div className="alert-card">
          <div className="alert-header">
            <AlertTriangle size={20} />
            <h4>Insurance Renewal Alerts</h4>
          </div>
          <div className="alert-content">
            <p>{expiringSoon.length} policy(s) expiring in the next 30 days:</p>
            <ul>
              {expiringSoon.map((policy) => (
                <li key={policy.id}>
                  <strong>{policy.vehicles?.registration_number}</strong> -
                  {policy.provider_name} (Expires:{" "}
                  {new Date(policy.end_date).toLocaleDateString()})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card">
          <h4>Active Policies</h4>
          <p className="stat-number">{policies.length}</p>
          <small>Total policies</small>
        </div>
        <div className="stat-card">
          <h4>Annual Premium</h4>
          <p className="stat-number">KSH {totalAnnualPremium.toFixed(2)}</p>
          <small>Total premium cost</small>
        </div>
        <div className="stat-card">
          <h4>Expiring Soon</h4>
          <p className="stat-number">{expiringSoon.length}</p>
          <small>Within 30 days</small>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container">
        <div className="search-bar">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search policies by vehicle, provider, policy number, or coverage..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Policies List */}
      <div className="table-card">
        <h3>Insurance Policies ({filteredPolicies.length})</h3>

        {filteredPolicies.length === 0 ? (
          <div className="empty-state">
            <Shield size={48} />
            <p>No insurance policies found</p>
            {searchTerm && <p>Try adjusting your search terms</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Provider</th>
                  <th>Policy Number</th>
                  <th>Coverage</th>
                  <th>Premium(KSH)</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((policy) => {
                  const expiryStatus = getExpiryStatus(policy.end_date);
                  return (
                    <tr
                      key={policy.id}
                      className={
                        expiryStatus.status === "expired" ? "expired-row" : ""
                      }
                    >
                      <td>
                        <strong>{policy.vehicles?.registration_number}</strong>
                        <br />
                        <small>
                          {policy.vehicles?.make} {policy.vehicles?.model}
                        </small>
                      </td>
                      <td>{policy.provider_name}</td>
                      <td>
                        <code>{policy.policy_number}</code>
                      </td>
                      <td>{getCoverageBadge(policy.coverage_type)}</td>
                      <td>
                        <strong>
                          KSH{parseFloat(policy.premium_amount).toFixed(2)}
                        </strong>
                      </td>
                      <td>
                        {new Date(policy.start_date).toLocaleDateString()}
                      </td>
                      <td>
                        <div
                          className={
                            expiryStatus.status !== "active"
                              ? "expiry-warning"
                              : ""
                          }
                        >
                          {new Date(policy.end_date).toLocaleDateString()}
                          {expiryStatus.status !== "active" && (
                            <>
                              <br />
                              <small>
                                ({getDaysUntilExpiry(policy.end_date)} days)
                              </small>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${expiryStatus.color}`}>
                          {expiryStatus.label}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => handleEdit(policy)}
                            className="icon-button edit"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(policy.id)}
                            className="icon-button delete"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Insurance;
