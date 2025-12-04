// pages/UserManagement.jsx
import { useState, useEffect } from "react";
import { useAuthContext } from "../contexts/AuthContext";
import { supabase } from "../utils/supabaseClient";
import {
  Users,
  Shield,
  Mail,
  Phone,
  Building,
  UserCheck,
  UserX,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Edit,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const UserManagement = () => {
  const { user } = useAuthContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function at the top of your component
  const safeToLowerCase = (str) => {
    return (str || "").toString().toLowerCase();
  };

  // Then in your filter:
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      safeToLowerCase(user.email).includes(safeToLowerCase(searchTerm)) ||
      safeToLowerCase(user.full_name).includes(safeToLowerCase(searchTerm)) ||
      safeToLowerCase(user.department).includes(safeToLowerCase(searchTerm));

    const matchesRole = filterRole === "all" || user.role === filterRole;

    const matchesStatus =
      filterStatus === "all" || user.status === filterStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleDeactivateUser = async (userId, email) => {
    if (!window.confirm(`Deactivate user ${email}?`)) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/deactivate-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            action: "deactivate",
            reason: "Admin action",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Deactivation failed");

      alert(`✅ User ${email} deactivated`);
      fetchUsers();
    } catch (error) {
      console.error("Deactivation error:", error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleReactivateUser = async (userId, email) => {
    if (!window.confirm(`Reactivate user ${email}?`)) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/deactivate-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            action: "reactivate",
            reason: "Admin action",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Reactivation failed");

      alert(`✅ User ${email} reactivated`);
      fetchUsers();
    } catch (error) {
      console.error("Reactivation error:", error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleChangeRole = async (userId, currentRole, email) => {
    const newRole = prompt(
      `Change role for ${email}\nCurrent: ${currentRole}\n\nEnter new role (employee/manager/admin):`,
      currentRole
    );

    if (
      !newRole ||
      !["employee", "manager", "admin", "super_admin"].includes(newRole)
    ) {
      alert("Invalid role selected");
      return;
    }

    const reason = prompt("Enter reason for role change (optional):");

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/change-user-role`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            new_role: newRole,
            reason: reason,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Role change failed");

      alert(`✅ Role changed to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error("Role change error:", error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  const handleResetPassword = async (userId, email) => {
    if (!window.confirm(`Send password reset to ${email}?`)) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            send_email: true,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok)
        throw new Error(result.error || "Password reset failed");

      alert(`✅ Password reset email sent to ${email}`);
    } catch (error) {
      console.error("Password reset error:", error);
      alert(`❌ Error: ${error.message}`);
    }
  };

  const getToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const exportToCSV = () => {
    const csvContent = [
      [
        "Name",
        "Email",
        "Phone",
        "Department",
        "Position",
        "Role",
        "Status",
        "Created At",
      ],
      ...users.map((user) => [
        user.full_name || "",
        user.email || "",
        user.phone || "",
        user.department || "",
        user.position || "",
        user.role || "",
        user.status || "active",
        new Date(user.created_at).toLocaleString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const viewUserDetails = (user) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  if (loading) {
    return (
      <div className="user-management-loading">
        <div className="loading-spinner"></div>
        <p>Loading users...</p>
      </div>
    );
  }

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <div>
          <h1>
            <Users size={28} /> User Management
          </h1>
          <p>Manage user accounts, roles, and permissions</p>
        </div>
        <div className="header-actions">
          <button onClick={exportToCSV} className="btn-secondary">
            <Download size={18} /> Export CSV
          </button>
          <button onClick={fetchUsers} className="btn-primary">
            <RefreshCw size={18} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div>
            <h3>Total Users</h3>
            <p className="stat-value">{users.length}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <UserCheck size={24} />
          </div>
          <div>
            <h3>Active Users</h3>
            <p className="stat-value">
              {users.filter((u) => u.status !== "inactive").length}
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Shield size={24} />
          </div>
          <div>
            <h3>Admins</h3>
            <p className="stat-value">
              {
                users.filter(
                  (u) => u.role === "admin" || u.role === "super_admin"
                ).length
              }
            </p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <UserX size={24} />
          </div>
          <div>
            <h3>Inactive</h3>
            <p className="stat-value">
              {users.filter((u) => u.status === "inactive").length}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search users by name, email, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-controls">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
          <button className="btn-outline">
            <Filter size={18} /> More Filters
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    selectedUsers.length === currentUsers.length &&
                    currentUsers.length > 0
                  }
                  onChange={() => {
                    if (selectedUsers.length === currentUsers.length) {
                      setSelectedUsers([]);
                    } else {
                      setSelectedUsers(currentUsers.map((u) => u.id));
                    }
                  }}
                />
              </th>
              <th>User</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                  />
                </td>
                <td>
                  <div className="user-info-cell">
                    <div className="user-avatar">
                      {user.full_name?.charAt(0) || user.email.charAt(0)}
                    </div>
                    <div>
                      <div className="user-name">
                        {user.full_name || "No Name Provided"}
                      </div>
                      <div className="user-email">
                        <Mail size={12} /> {user.email || "No Email"}
                      </div>
                      {user.phone && (
                        <div className="user-phone">
                          <Phone size={12} /> {user.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    <Shield size={12} /> {user.role}
                  </span>
                </td>
                <td>
                  <div className="department-cell">
                    {user.department || "Not assigned"}
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${user.status || "active"}`}>
                    {user.status === "inactive" ? (
                      <UserX size={12} />
                    ) : (
                      <UserCheck size={12} />
                    )}
                    {user.status || "active"}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="action-buttons">
                    <button
                      onClick={() => viewUserDetails(user)}
                      className="action-btn view"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() =>
                        handleChangeRole(user.id, user.role, user.email)
                      }
                      className="action-btn edit"
                      title="Change Role"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleResetPassword(user.id, user.email)}
                      className="action-btn reset"
                      title="Reset Password"
                    >
                      <RefreshCw size={16} />
                    </button>
                    {user.status === "active" ? (
                      <button
                        onClick={() =>
                          handleDeactivateUser(user.id, user.email)
                        }
                        className="action-btn deactivate"
                        title="Deactivate"
                      >
                        <UserX size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          handleReactivateUser(user.id, user.email)
                        }
                        className="action-btn activate"
                        title="Activate"
                      >
                        <UserCheck size={16} />
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
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="pagination-btn"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              )
              .map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`page-btn ${currentPage === page ? "active" : ""}`}
                >
                  {page}
                </button>
              ))}
          </div>

          <button
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
            className="pagination-btn"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>User Details</h2>
              <button
                onClick={() => setShowUserDetails(false)}
                className="close-btn"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="user-details-grid">
                <div className="detail-item">
                  <label>Full Name</label>
                  <p>{selectedUser.full_name || "Not provided"}</p>
                </div>
                <div className="detail-item">
                  <label>Email</label>
                  <p>
                    <Mail size={14} /> {selectedUser.email}
                  </p>
                </div>
                <div className="detail-item">
                  <label>Phone</label>
                  <p>
                    <Phone size={14} /> {selectedUser.phone || "Not provided"}
                  </p>
                </div>
                <div className="detail-item">
                  <label>Department</label>
                  <p>
                    <Building size={14} />{" "}
                    {selectedUser.department || "Not assigned"}
                  </p>
                </div>
                <div className="detail-item">
                  <label>Position</label>
                  <p>{selectedUser.position || "Not specified"}</p>
                </div>
                <div className="detail-item">
                  <label>Role</label>
                  <span className={`role-badge ${selectedUser.role}`}>
                    {selectedUser.role}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <span
                    className={`status-badge ${
                      selectedUser.status || "active"
                    }`}
                  >
                    {selectedUser.status || "active"}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Member Since</label>
                  <p>
                    {new Date(selectedUser.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() =>
                  handleChangeRole(
                    selectedUser.id,
                    selectedUser.role,
                    selectedUser.email
                  )
                }
                className="btn-primary"
              >
                Change Role
              </button>
              <button
                onClick={() =>
                  handleResetPassword(selectedUser.id, selectedUser.email)
                }
                className="btn-secondary"
              >
                Reset Password
              </button>
              {selectedUser.status === "active" ? (
                <button
                  onClick={() => {
                    handleDeactivateUser(selectedUser.id, selectedUser.email);
                    setShowUserDetails(false);
                  }}
                  className="btn-danger"
                >
                  Deactivate User
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleReactivateUser(selectedUser.id, selectedUser.email);
                    setShowUserDetails(false);
                  }}
                  className="btn-success"
                >
                  Activate User
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
