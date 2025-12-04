import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  DollarSign,
  Car,
  FileText,
  Wrench,
  Shield,
  Building,
  User,
  Users,
  UserCheck,
  Settings,
  Calendar,
  Eye,
} from "lucide-react";
import { useAuthContext } from "../../contexts/AuthContext"; // Add this import

const Sidebar = () => {
  const location = useLocation();
  const { profile } = useAuthContext(); // Get profile from context

  // Check if user is admin based on profile role
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  const menuItems = [
    { path: "/", icon: Home, label: "Dashboard" },
    { path: "/petty-cash", icon: DollarSign, label: "Petty Cash" },
    {
      path: "/valuation-payments",
      icon: FileText,
      label: "Valuation Payments",
    },
    {
      path: "/employee-transactions",
      icon: Users,
      label: "Employee Transactions",
    },
    { path: "/vendors", icon: Building, label: "Vendors" },
    {
      path: "/vehicles",
      icon: Car,
      label: "Vehicle Management",
      children: [
        { path: "/vehicles", icon: Car, label: "All Vehicles" },
        { path: "/vehicles/repairs", icon: Wrench, label: "Car Repairs" },
        { path: "/vehicles/insurance", icon: Shield, label: "Insurance" },
      ],
    },
    { path: "/leave-requests", icon: Calendar, label: "Leave Requests" },
    {
      path: "/admin/approvals",
      icon: UserCheck,
      label: "User Approvals",
      adminOnly: true,
    },
    {
      path: "/view-requests",
      icon: Eye,
      label: "View Requests",
      adminOnly: true,
    },
    {
      path: "/user-management",
      name: "User Management",
      icon: Users, // ✅ CORRECT - pass the component, not JSX
      label: "User Management",
      allowedRoles: ["admin", "super_admin"],
      adminOnly: true, // Also add adminOnly flag
    },
  ];

  const isActive = (path) => {
    return (
      location.pathname === path || location.pathname.startsWith(path + "/")
    );
  };

  const isChildActive = (parentPath) => {
    return (
      menuItems.find((item) =>
        item.children?.some((child) => isActive(child.path))
      )?.path === parentPath
    );
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Office Manager</h2>
        <p className="sidebar-subtitle">Management System</p>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          // Skip admin-only items if user is not admin
          if (item.adminOnly && !isAdmin) return null;

          return (
            <div key={item.path} className="nav-item-container">
              <Link
                to={item.path}
                className={`nav-item ${
                  isActive(item.path) || isChildActive(item.path)
                    ? "active"
                    : ""
                }`}
              >
                <item.icon size={20} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
                {item.children && <span className="nav-arrow">›</span>}
              </Link>

              {/* Show submenu if item has children AND either active or parent is active */}
              {item.children &&
                (isActive(item.path) || isChildActive(item.path)) && (
                  <div className="submenu">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`submenu-item ${
                          isActive(child.path) ? "active" : ""
                        }`}
                      >
                        <child.icon size={16} className="submenu-icon" />
                        <span className="submenu-label">{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
            </div>
          );
        })}
      </nav>

      {/* Profile & Settings Section - Fixed at bottom */}
      <div className="sidebar-footer">
        <div className="footer-section">
          <Link
            to="/profile"
            className={`nav-item ${isActive("/profile") ? "active" : ""}`}
          >
            <User size={20} className="nav-icon" />
            <span className="nav-label">My Profile</span>
          </Link>

          <Link
            to="/settings"
            className={`nav-item ${isActive("/settings") ? "active" : ""}`}
          >
            <Settings size={20} className="nav-icon" />
            <span className="nav-label">Settings</span>
          </Link>
        </div>

        <div className="user-info">
          <div className="user-avatar">
            <User size={24} />
          </div>
          <div className="user-details">
            <div className="user-name">
              {profile?.full_name || profile?.email || "Office User"}
            </div>
            <div className="user-role">
              {profile?.role
                ? profile.role.replace("_", " ").toUpperCase()
                : "User"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
