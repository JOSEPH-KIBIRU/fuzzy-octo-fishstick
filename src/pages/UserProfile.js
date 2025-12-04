import React, { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { useUserRoles } from "../hooks/useUserRoles";
import { supabase } from "../utils/supabaseClient";
import { emailService } from "../services/emailService";
import {
  User,
  Mail,
  Phone,
  Building,
  Shield,
  Save,
  Edit,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Wrench,
  Calendar,
} from "lucide-react";

const UserProfile = () => {
  const { user } = useAuthContext();
  const { isAdmin, isSuperAdmin, loading: rolesLoading } = useUserRoles();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    department: "",
    phone: "",
    email: "",
    role: "user",
  });

  // Stats state
  const [userStats, setUserStats] = useState({
    recordsCreated: 0,
    recentActivity: 0,
    pendingApprovals: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  // Enhanced debug logging
  console.log("🔍 UserProfile Debug:", {
    user: user ? "Logged in" : "No user",
    rolesLoading,
    isAdmin,
    isSuperAdmin,
    profile: profile ? "Loaded" : "Not loaded",
    loading,
  });

 // In your fetchProfile function, add better error handling
const fetchProfile = useCallback(async () => {
  console.log("🔍 fetchProfile called, user:", user?.id);

  if (!user) {
    console.log("🔍 No user, skipping profile fetch");
    setLoading(false);
    return;
  }

  try {
    console.log("🔍 Fetching profile from Supabase...");
    
    // Use the raw user ID without cleaning first
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id) // Try with original ID first
      .single();

    if (error) {
      console.error("🔍 Error fetching profile:", error);
      
      // If it's a policy error, try alternative approaches
      if (error.code === '42501') {
        console.log("🔍 RLS policy error, trying public profiles...");
        // You might need to adjust your RLS policies
        setMessage("Permission error. Please contact administrator.");
        return;
      }
      
      // If profile doesn't exist, create one
      if (error.code === "PGRST116") {
        console.log("🔍 Profile not found, creating new profile...");
        await createProfile();
        return;
      }
      throw error;
    }

    setProfile(data);
    setFormData({
      full_name: data.full_name || "",
      email: data.email || user?.email || "",
      department: data.department || "",
      phone: data.phone || "",
      role: data.role || "user",
    });
  } catch (error) {
    console.error("🔍 Error in fetchProfile:", error);
    setMessage("Error loading profile: " + error.message);
  } finally {
    setLoading(false);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [user]);
 // Create profile if it doesn't exist
const createProfile = async () => {
  try {
    console.log("🔍 Creating new profile for user:", user.id);
    
    // Clean user ID
    const cleanUserId = user.id.split('@')[0];
    
    const { data, error } = await supabase
      .from("profiles")
      .insert([
        {
          id: cleanUserId, // Use cleaned ID
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
          email: user.email, // Make sure email is stored
          role: "user",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      // If it's a duplicate key error, try fetching again
      if (error.code === '23505') {
        console.log("🔍 Profile already exists, fetching...");
        await fetchProfile();
        return;
      }
      throw error;
    }

    console.log("🔍 New profile created:", data);
    setProfile(data);
    setFormData({
      full_name: data.full_name || "",
      department: data.department || "",
      phone: data.phone || "",
      role: data.role || "user",
    });
  } catch (error) {
    console.error("🔍 Error creating profile:", error);
    setMessage("Error creating profile: " + error.message);
  }
};

  // Fetch pending approvals (super admin only)
  const fetchPendingApprovals = useCallback(async () => {
    console.log("🔍 fetchPendingApprovals called, isSuperAdmin:", isSuperAdmin);

    if (!isSuperAdmin) {
      console.log("🔍 Not super admin, skipping approvals fetch");
      return;
    }

    console.log("🔍 Fetching approvals for super admin...");
    setApprovalsLoading(true);
    try {
      const [
        { data: pettyCashData, error: pettyCashError },
        { data: repairsData, error: repairsError },
        { data: employeeData, error: employeeError },
        { data: leaveData, error: leaveError },
      ] = await Promise.all([
        supabase
          .from("petty_cash")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("car_repairs")
          .select("*, vehicles(registration_number, make, model)")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("employee_transactions")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("leave_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      if (pettyCashError) throw pettyCashError;
      if (repairsError) throw repairsError;
      if (employeeError) throw employeeError;
      if (leaveError) throw leaveError;

      const approvals = [
        ...(pettyCashData || []).map((item) => ({
          ...item,
          type: "petty_cash",
          title: `Petty Cash: ${item.description}`,
          amount: item.amount,
          date: item.transaction_date,
        })),
        ...(repairsData || []).map((item) => ({
          ...item,
          type: "car_repair",
          title: `Car Repair: ${item.vehicles?.registration_number} - ${item.description}`,
          amount: item.cost,
          date: item.repair_date,
        })),
        ...(employeeData || []).map((item) => ({
          ...item,
          type: "employee_transaction",
          title: `${
            item.transaction_type === "advance" ? "Advance" : "Reimbursement"
          }: ${item.employee_name}`,
          amount: item.amount,
          date: item.transaction_date,
        })),
        ...(leaveData || []).map((item) => ({
          ...item,
          type: "leave_request",
          title: `Leave Request: ${item.employee_name} - ${item.leave_type} Leave`,
          amount: 0,
          date: item.start_date,
        })),
      ];

      console.log("🔍 Combined approvals:", approvals);
      setPendingApprovals(approvals);
    } catch (error) {
      console.error("🔍 Error fetching pending approvals:", error);
      setMessage("Error loading approvals: " + error.message);
    } finally {
      setApprovalsLoading(false);
    }
  }, [isSuperAdmin]);

  // Fetch user statistics
  const fetchUserStats = useCallback(async () => {
    if (!user) return;

    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = oneWeekAgo.toISOString().split("T")[0];

      const [
        { count: pettyCashCount },
        { count: repairsCount },
        { count: insuranceCount },
        { count: valuationCount },
        { count: employeeCount },
        { count: recentPettyCash },
        { count: recentRepairs },
        { count: recentInsurance },
        { count: recentValuation },
        { count: recentEmployee },
      ] = await Promise.all([
        supabase
          .from("petty_cash")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id),
        supabase
          .from("car_repairs")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id),
        supabase
          .from("insurance_policies")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id),
        supabase
          .from("valuation_payments")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id),
        supabase
          .from("employee_transactions")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id),
        supabase
          .from("petty_cash")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id)
          .gte("created_at", oneWeekAgoStr),
        supabase
          .from("car_repairs")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id)
          .gte("created_at", oneWeekAgoStr),
        supabase
          .from("insurance_policies")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id)
          .gte("created_at", oneWeekAgoStr),
        supabase
          .from("valuation_payments")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id)
          .gte("created_at", oneWeekAgoStr),
        supabase
          .from("employee_transactions")
          .select("*", { count: "exact", head: true })
          .eq("recorded_by", user.id)
          .gte("created_at", oneWeekAgoStr),
      ]);

      const totalRecords =
        (pettyCashCount || 0) +
        (repairsCount || 0) +
        (insuranceCount || 0) +
        (valuationCount || 0) +
        (employeeCount || 0);

      const recentActivity =
        (recentPettyCash || 0) +
        (recentRepairs || 0) +
        (recentInsurance || 0) +
        (recentValuation || 0) +
        (recentEmployee || 0);

      setUserStats({
        recordsCreated: totalRecords,
        recentActivity: recentActivity,
        pendingApprovals: pendingApprovals.length,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    } finally {
      setStatsLoading(false);
    }
  }, [user, pendingApprovals.length]);

  // Effect: Initial load
  useEffect(() => {
    console.log("🔍 useEffect - fetchProfile triggered");
    fetchProfile();
  }, [fetchProfile]);

  // Effect: Approvals for super admin
  useEffect(() => {
    console.log("🔍 useEffect - approvals check", {
      rolesLoading,
      isSuperAdmin,
    });
    if (!rolesLoading && isSuperAdmin) {
      console.log("🔍 Roles loaded, fetching approvals...");
      fetchPendingApprovals();
    }
  }, [isSuperAdmin, rolesLoading, fetchPendingApprovals]);

  // Effect: Fetch stats after profile loads
  useEffect(() => {
    if (user && !loading) {
      fetchUserStats();
    }
  }, [user, loading, fetchUserStats]);

  // Effect: Update pending count in stats when approvals change
  useEffect(() => {
    if (user && !statsLoading) {
      setUserStats((prev) => ({
        ...prev,
        pendingApprovals: pendingApprovals.length,
      }));
    }
  }, [pendingApprovals.length, user, statsLoading]);

  // Fallback timeout to avoid infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.warn("🔍 Loading timeout - forcing stop");
        setLoading(false);
        setMessage("Profile loading timed out. Please refresh the page.");
      }
    }, 10000); // 10s

    return () => clearTimeout(timer);
  }, [loading]);

  // Handle form changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Save profile updates
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          department: formData.department,
          phone: formData.phone,
          role: formData.role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage("Profile updated successfully!");
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("Error updating profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle approval (approve/reject)
// In your UserProfile.js - Update the handleApproval function
const handleApproval = async (approval, newStatus) => {
  try {
    let tableName = "";
    let updateData = { status: newStatus };

    const commonUpdates = {
      status: newStatus,
      approved_by: user?.email,
      approval_date: new Date().toISOString().split('T')[0],
    };

    switch (approval.type) {
      case "petty_cash":
        tableName = "petty_cash";
        updateData = commonUpdates;
        break;
      case "car_repair":
        tableName = "car_repairs";
        updateData = commonUpdates;
        break;
      case "employee_transaction":
        tableName = "employee_transactions";
        updateData = commonUpdates;
        break;
      case "leave_request":
        tableName = "leave_requests";
        updateData = commonUpdates;
        if (newStatus === "rejected") {
          const reason = prompt("Please enter reason for rejection:");
          if (reason) {
            updateData.rejection_reason = reason;
          }
        }
        break;
      default:
        return;
    }

    const { error } = await supabase
      .from(tableName)
      .update(updateData)
      .eq("id", approval.id);

    if (error) {
      if (error.code === "42703") {
        const { error: simpleError } = await supabase
          .from(tableName)
          .update({ status: newStatus })
          .eq("id", approval.id);
        if (simpleError) throw simpleError;
      } else {
        throw error;
      }
    }

    // ✅ NEW: Notify the user who submitted the request
    if (approval.submitted_by_user_id) {
      try {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', approval.submitted_by_user_id)
          .single();

        if (userProfile?.email) {
          await emailService.notifyUserAboutStatus(
            userProfile.email,
            approval.type,
            newStatus,
            {
              amount: approval.amount,
              description: approval.description || approval.title,
              reason: updateData.rejection_reason,
              approved_by: user?.email
            }
          );
        }
      } catch (emailError) {
        console.warn('⚠️ User notification failed, but approval was processed:', emailError);
      }
    }

    setMessage(`Request ${newStatus} successfully!`);
    fetchPendingApprovals();
  } catch (error) {
    console.error("Error updating approval:", error);
    setMessage(`Error: ${error.message}`);
  }
};
  // Helper: Role badge color
  const getRoleBadgeColor = (role) => {
    const colors = {
      super_admin: "bg-red-100 text-red-800",
      admin: "bg-purple-100 text-purple-800",
      manager: "bg-blue-100 text-blue-800",
      user: "bg-gray-100 text-gray-800",
    };
    return colors[role] || colors.user;
  };

  // Helper: Approval icon
  const getApprovalIcon = (type) => {
    switch (type) {
      case "petty_cash":
        return <DollarSign size={16} />;
      case "car_repair":
        return <Wrench size={16} />;
      case "employee_transaction":
        return <User size={16} />;
      case "leave_request":
        return <Calendar size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  // Helper: Approval badge
  const getApprovalBadge = (type) => {
    const typeConfig = {
      petty_cash: { color: "bg-blue-100 text-blue-800", label: "Petty Cash" },
      car_repair: {
        color: "bg-orange-100 text-orange-800",
        label: "Car Repair",
      },
      employee_transaction: {
        color: "bg-purple-100 text-purple-800",
        label: "Employee",
      },
      leave_request: {
        color: "bg-cyan-100 text-cyan-800",
        label: "Leave Request",
      },
    };
    const config = typeConfig[type] || typeConfig.petty_cash;
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  // RENDER
  if (loading) {
    return (
      <div className="page">
        <h1>User Profile</h1>
        <div className="loading">
          <div>Loading profile...</div>
          <small>If this takes too long, try refreshing the page</small>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="profile-header">
        <h1>User Profile</h1>
        {!editing && profile && (
          <button onClick={() => setEditing(true)} className="btn-primary">
            <Edit size={16} />
            Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div
          className={`message ${
            message.toLowerCase().includes("error") ? "error" : "success"
          }`}
        >
          {message}
        </div>
      )}

      {!profile ? (
        <div className="message error">
          <p>Unable to load profile data.</p>
          <button onClick={fetchProfile} className="btn-primary mt-2">
            Retry Loading Profile
          </button>
        </div>
      ) : (
        <>
          {/* Profile Card */}
          <div className="profile-card">
            <div className="profile-avatar">
              <User size={64} />
            </div>

            <div className="profile-info">
              {editing ? (
                <form onSubmit={handleSave} className="profile-form">
                  <div className="form-group">
                    <label htmlFor="full_name">Full Name</label>
                    <input
                      type="text"
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="disabled-input"
                    />
                    <small>Email is managed by authentication system</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      placeholder="e.g., Finance, Operations"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  {isAdmin && (
                    <div className="form-group">
                      <label htmlFor="role">Role</label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          full_name: profile.full_name || "",
                          department: profile.department || "",
                          phone: profile.phone || "",
                          role: profile.role || "user",
                        });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary"
                    >
                      <Save size={16} />
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="profile-details">
                  <div className="detail-item">
                    <User size={20} />
                    <div>
                      <label>Full Name</label>
                      <p>{profile.full_name || "Not set"}</p>
                    </div>
                  </div>

                  <div className="detail-item">
                    <Mail size={20} />
                    <div>
                      <label>Email</label>
                      <p>{user?.email}</p>
                    </div>
                  </div>

                  <div className="detail-item">
                    <Building size={20} />
                    <div>
                      <label>Department</label>
                      <p>{profile.department || "Not set"}</p>
                    </div>
                  </div>

                  <div className="detail-item">
                    <Phone size={20} />
                    <div>
                      <label>Phone</label>
                      <p>{profile.phone || "Not set"}</p>
                    </div>
                  </div>

                  <div className="detail-item">
                    <Shield size={20} />
                    <div>
                      <label>Role</label>
                      <span
                        className={`px-2 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                          profile.role
                        )}`}
                      >
                        {profile.role || "user"}
                      </span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <div>
                      <label>User ID</label>
                      <p className="text-xs text-gray-500 font-mono">
                        {user?.id}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pending Approvals (Super Admin Only) */}
          {!rolesLoading && isSuperAdmin && (
            <div className="approvals-section">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                }}
              >
                <h3>Pending Approvals</h3>
                <button
                  onClick={fetchPendingApprovals}
                  className="btn-secondary"
                  style={{ padding: "8px 12px" }}
                  title="Refresh list"
                >
                  Refresh
                </button>
              </div>

              {approvalsLoading ? (
                <div className="loading">Loading approvals...</div>
              ) : pendingApprovals.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle size={48} className="text-green-500" />
                  <p>No pending approvals</p>
                  <small>All requests have been processed</small>
                </div>
              ) : (
                <div className="approvals-list">
                  {pendingApprovals.map((approval) => (
                    <div
                      key={`${approval.type}-${approval.id}`}
                      className="approval-item"
                    >
                      <div className="approval-header">
                        <div className="approval-type">
                          {getApprovalIcon(approval.type)}
                          {getApprovalBadge(approval.type)}
                        </div>
                        <div className="approval-amount">
                          {approval.amount > 0
                            ? `KSH ${parseFloat(approval.amount).toFixed(2)}`
                            : "—"}
                        </div>
                      </div>

                      <div className="approval-content">
                        <h4 className="font-medium">{approval.title}</h4>
                        <p className="approval-date text-sm text-gray-600">
                          Date: {new Date(approval.date).toLocaleDateString()}
                        </p>
                        {approval.description && (
                          <p className="approval-description text-gray-700">
                            {approval.description}
                          </p>
                        )}
                      </div>

                      <div className="approval-actions">
                        <button
                          onClick={() => handleApproval(approval, "approved")}
                          className="btn-success flex items-center gap-1"
                          title="Approve"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval(approval, "rejected")}
                          className="btn-danger flex items-center gap-1"
                          title="Reject"
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* User Statistics */}
          <div className="profile-stats">
            <h3>Quick Statistics</h3>
            {statsLoading ? (
              <div className="loading">Loading statistics...</div>
            ) : (
              <div className="stats-grid">
                <div className="stat-card">
                  <h4>Records Created</h4>
                  <p className="stat-number">{userStats.recordsCreated}</p>
                  <small>Total entries added</small>
                </div>
                <div className="stat-card">
                  <h4>Pending Approvals</h4>
                  <p className="stat-number">{userStats.pendingApprovals}</p>
                  <small>Awaiting review</small>
                </div>
                <div className="stat-card">
                  <h4>Recent Activity</h4>
                  <p className="stat-number">{userStats.recentActivity}</p>
                  <small>Last 7 days</small>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UserProfile;
