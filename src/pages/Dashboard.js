/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { useUserRoles } from "../hooks/useUserRoles";
import {
  DollarSign,
  Car,
  Wrench,
  Shield,
  Users,
  Building,
  TrendingUp,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle,
  FileText,
  Plus,
  Home,
  Activity,
  Bell,
  CreditCard,
  UserCheck,
  Package,
  BarChart3,
  RefreshCw,
  Zap,
  Target,
  Download,
  Eye,
  MoreVertical,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const { isAdmin, isSuperAdmin } = useUserRoles();
  const [stats, setStats] = useState({
    pettyCash: { total: 0, pending: 0, approved: 0 },
    vehicles: { total: 0, active: 0, inactive: 0 },
    repairs: { total: 0, pending: 0, completed: 0, totalCost: 0 },
    insurance: { total: 0, expiring: 0, active: 0, totalPremium: 0 },
    employees: { total: 0, pending: 0, approved: 0 },
    vendors: { total: 0, active: 0, inactive: 0 },
    leave: { total: 0, pending: 0, approved: 0 },
    valuations: { total: 0, pending: 0, completed: 0, totalAmount: 0 }
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        pettyCashData,
        vehiclesData,
        repairsData,
        insuranceData,
        employeesData,
        vendorsData,
        leaveData,
        valuationData,
        activityData,
      ] = await Promise.all([
        supabase.from("petty_cash").select("*"),
        supabase.from("vehicles").select("*"),
        supabase.from("car_repairs").select("*"),
        supabase.from("insurance_policies").select("*"),
        supabase.from("employee_transactions").select("*"),
        supabase.from("vendors").select("*"),
        supabase.from("leave_requests").select("*"),
        supabase.from("valuation_payments").select("*"),
        supabase
          .from("petty_cash")
          .select("*")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      // Process data
      const pettyCash = pettyCashData.data || [];
      const vehicles = vehiclesData.data || [];
      const repairs = repairsData.data || [];
      const insurance = insuranceData.data || [];
      const employees = employeesData.data || [];
      const vendors = vendorsData.data || [];
      const leaveRequests = leaveData.data || [];
      const valuations = valuationData.data || [];

      setStats({
        pettyCash: {
          total: pettyCash.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0),
          pending: pettyCash.filter((item) => item.status === "pending").length,
          approved: pettyCash.filter((item) => item.status === "approved").length,
        },
        vehicles: {
          total: vehicles.length,
          active: vehicles.filter((v) => v.status === "active").length,
          inactive: vehicles.filter((v) => v.status === "inactive").length,
        },
        repairs: {
          total: repairs.length,
          pending: repairs.filter((item) => item.status === "pending").length,
          completed: repairs.filter((item) => item.status === "completed").length,
          totalCost: repairs.reduce((sum, item) => sum + parseFloat(item.cost || 0), 0),
        },
        insurance: {
          total: insurance.length,
          expiring: insurance.filter((policy) => {
            const endDate = new Date(policy.end_date);
            const daysUntilExpiry = (endDate - new Date()) / (1000 * 60 * 60 * 24);
            return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
          }).length,
          active: insurance.filter((policy) => policy.status === "active").length,
          totalPremium: insurance.reduce((sum, item) => sum + parseFloat(item.premium_amount || 0), 0),
        },
        employees: {
          total: employees.length,
          pending: employees.filter((item) => item.status === "pending").length,
          approved: employees.filter((item) => item.status === "approved").length,
        },
        vendors: {
          total: vendors.length,
          active: vendors.filter((v) => v.status === "active").length,
          inactive: vendors.filter((v) => v.status === "inactive").length,
        },
        leave: {
          total: leaveRequests.length,
          pending: leaveRequests.filter((item) => item.status === "pending").length,
          approved: leaveRequests.filter((item) => item.status === "approved").length,
        },
        valuations: {
          total: valuations.length,
          pending: valuations.filter((item) => item.status === "pending").length,
          completed: valuations.filter((item) => item.status === "completed").length,
          totalAmount: valuations.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0),
        },
      });

      setRecentActivity(activityData.data || []);
      generateAlerts(insurance, repairs, pettyCash, employees, leaveRequests, valuations);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateAlerts = (insurance, repairs, pettyCash, employees, leaveRequests, valuations) => {
    const alertsList = [];

    // Insurance expiry alerts
    insurance.forEach((policy) => {
      const endDate = new Date(policy.end_date);
      const daysUntilExpiry = (endDate - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
        alertsList.push({
          type: "warning",
          icon: Shield,
          title: "Insurance Expiring Soon",
          message: `Policy for ${policy.vehicle_info || "vehicle"} expires in ${Math.ceil(daysUntilExpiry)} days`,
          link: "/vehicles/insurance",
          time: "2 hours ago",
        });
      }
    });

    // Pending approvals alerts
    const pendingRepairs = repairs.filter((r) => r.status === "pending").length;
    const pendingPettyCash = pettyCash.filter((p) => p.status === "pending").length;
    const pendingEmployees = employees.filter((e) => e.status === "pending").length;
    const pendingLeave = leaveRequests.filter((r) => r.status === "pending").length;
    const pendingValuations = valuations.filter((v) => v.status === "pending").length;

    if (pendingRepairs > 0) {
      alertsList.push({
        type: "info",
        icon: Wrench,
        title: "Repairs Pending",
        message: `${pendingRepairs} car repair(s) need approval`,
        link: "/vehicles/repairs",
        time: "1 hour ago",
      });
    }

    if (pendingValuations > 0) {
      alertsList.push({
        type: "info",
        icon: Building,
        title: "Valuations Pending",
        message: `${pendingValuations} valuation payment(s) awaiting approval`,
        link: "/valuation-payments",
        time: "30 mins ago",
      });
    }

    if (pendingPettyCash > 0) {
      alertsList.push({
        type: "info",
        icon: DollarSign,
        title: "Petty Cash Pending",
        message: `${pendingPettyCash} petty cash transaction(s) need review`,
        link: "/petty-cash",
        time: "45 mins ago",
      });
    }

    if (pendingEmployees > 0) {
      alertsList.push({
        type: "info",
        icon: Users,
        title: "Employee Transactions",
        message: `${pendingEmployees} transaction(s) pending approval`,
        link: "/employee-transactions",
        time: "1 hour ago",
      });
    }

    setAlerts(alertsList.slice(0, 4)); // Limit to 4 alerts
  };

  // Chart data
  const expensesChartData = {
    labels: ["Petty Cash", "Car Repairs", "Insurance", "Valuations"],
    datasets: [
      {
        data: [
          stats.pettyCash.total,
          stats.repairs.totalCost,
          stats.insurance.totalPremium,
          stats.valuations.totalAmount,
        ],
        backgroundColor: ["#3B82F6", "#F59E0B", "#10B981", "#8B5CF6"],
        borderWidth: 2,
        borderColor: "#fff",
        hoverOffset: 15,
      },
    ],
  };

  const pendingChartData = {
    labels: ["Petty Cash", "Repairs", "Employees", "Leave", "Valuations"],
    datasets: [
      {
        label: "Pending Items",
        data: [
          stats.pettyCash.pending,
          stats.repairs.pending,
          stats.employees.pending,
          stats.leave.pending,
          stats.valuations.pending,
        ],
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "#3B82F6",
          "#F59E0B",
          "#10B981",
          "#8B5CF6",
          "#EF4444",
        ],
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => `KES ${context.raw.toLocaleString()}`,
        },
      },
    },
    cutout: "70%",
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.raw}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { display: false },
        ticks: { stepSize: 1 },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  const quickActions = [
    { icon: DollarSign, label: "Petty Cash", link: "/petty-cash", color: "bg-gradient-to-br from-blue-500 to-blue-600", badge: stats.pettyCash.pending },
    { icon: Car, label: "Vehicles", link: "/vehicles", color: "bg-gradient-to-br from-green-500 to-green-600", badge: stats.vehicles.total },
    { icon: FileText, label: "Valuations", link: "/valuation-payments", color: "bg-gradient-to-br from-teal-500 to-teal-600", badge: stats.valuations.pending },
    { icon: Wrench, label: "Repairs", link: "/vehicles/repairs", color: "bg-gradient-to-br from-orange-500 to-orange-600", badge: stats.repairs.pending },
    { icon: Shield, label: "Insurance", link: "/vehicles/insurance", color: "bg-gradient-to-br from-purple-500 to-purple-600", badge: stats.insurance.expiring },
    { icon: Users, label: "Employees", link: "/employee-transactions", color: "bg-gradient-to-br from-indigo-500 to-indigo-600", badge: stats.employees.pending },
    { icon: Building, label: "Vendors", link: "/vendors", color: "bg-gradient-to-br from-red-500 to-red-600", badge: stats.vendors.total },
    { icon: Calendar, label: "Leave", link: "/leave-requests", color: "bg-gradient-to-br from-cyan-500 to-cyan-600", badge: stats.leave.pending },
    { icon: TrendingUp, label: "Reports", link: "/reports", color: "bg-gradient-to-br from-pink-500 to-pink-600" },
  ];

  const renderStatCard = (icon, label, value, subValue, color, trend) => (
    <div className="stat-card group">
      <div className="stat-icon-container">
        <div className={`stat-icon ${color}`}>
          {icon}
        </div>
        {trend && <div className="stat-trend">{trend}</div>}
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        <div className="stat-subtext">{subValue}</div>
      </div>
      <div className="stat-arrow">
        <ChevronRight size={16} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-overlay">
          <div className="spinner-large"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Row 1: Header & Summary Stats */}
      <div className="dashboard-row">
        <div className="dashboard-header-card">
          <div className="header-content">
            <div>
              <h1 className="dashboard-title">Office Management Dashboard</h1>
              <p className="dashboard-subtitle">Real-time overview of your office operations</p>
            </div>
            <div className="header-actions">
              <button 
                onClick={fetchDashboardData} 
                className="refresh-btn"
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <div className="last-updated">
                <Clock size={14} />
                Updated: {lastUpdated}
              </div>
            </div>
          </div>
          
          <div className="summary-stats">
            <div className="summary-stat">
              <div className="summary-icon bg-gradient-to-br from-blue-500 to-blue-600">
                <DollarSign size={20} />
              </div>
              <div>
                <div className="summary-value">KES {stats.pettyCash.total.toLocaleString()}</div>
                <div className="summary-label">Total Petty Cash</div>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-icon bg-gradient-to-br from-green-500 to-green-600">
                <Car size={20} />
              </div>
              <div>
                <div className="summary-value">{stats.vehicles.total}</div>
                <div className="summary-label">Active Vehicles</div>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-icon bg-gradient-to-br from-purple-500 to-purple-600">
                <Shield size={20} />
              </div>
              <div>
                <div className="summary-value">{stats.insurance.expiring}</div>
                <div className="summary-label">Expiring Insurance</div>
              </div>
            </div>
            <div className="summary-stat">
              <div className="summary-icon bg-gradient-to-br from-orange-500 to-orange-600">
                <AlertTriangle size={20} />
              </div>
              <div>
                <div className="summary-value">{alerts.length}</div>
                <div className="summary-label">Active Alerts</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Alerts & Quick Actions */}
      <div className="dashboard-row">
        {/* Alerts Column */}
        <div className="dashboard-col lg:col-span-2">
          <div className="alerts-card">
            <div className="card-header">
              <div className="card-title">
                <Bell size={20} />
                <span>Recent Alerts</span>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View all
              </button>
            </div>
            <div className="alerts-list">
              {alerts.length === 0 ? (
                <div className="empty-alerts">
                  <CheckCircle size={32} className="text-green-500" />
                  <p className="text-gray-500">No active alerts</p>
                  <p className="text-sm text-gray-400">Everything is running smoothly</p>
                </div>
              ) : (
                alerts.map((alert, index) => (
                  <div key={index} className={`alert-item alert-${alert.type}`}>
                    <div className="alert-icon">
                      <alert.icon size={18} />
                    </div>
                    <div className="alert-content">
                      <div className="alert-title">{alert.title}</div>
                      <div className="alert-message">{alert.message}</div>
                      <div className="alert-time">{alert.time}</div>
                    </div>
                    <button className="alert-action">
                      <ArrowRight size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Column */}
        <div className="dashboard-col">
          <div className="actions-card">
            <div className="card-header">
              <div className="card-title">
                <Zap size={20} />
                <span>Quick Actions</span>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                <Plus size={16} />
              </button>
            </div>
            <div className="actions-grid">
              {quickActions.map((action, index) => (
                <a 
                  key={index} 
                  href={action.link} 
                  className="action-item group"
                >
                  <div className={`action-icon ${action.color}`}>
                    <action.icon size={20} />
                  </div>
                  <div className="action-content">
                    <div className="action-label">{action.label}</div>
                    {action.badge !== undefined && action.badge > 0 && (
                      <div className="action-badge">{action.badge}</div>
                    )}
                  </div>
                  <div className="action-arrow">
                    <ChevronRight size={16} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Charts & Stats */}
      <div className="dashboard-row">
        {/* Expenses Chart */}
        <div className="dashboard-col">
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">
                <BarChart3 size={20} />
                <span>Expense Distribution</span>
              </div>
              <select className="chart-select">
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Year</option>
              </select>
            </div>
            <div className="chart-container">
              <Doughnut data={expensesChartData} options={chartOptions} />
            </div>
            <div className="chart-footer">
              <div className="chart-legend">
                {expensesChartData.labels.map((label, index) => (
                  <div key={index} className="legend-item">
                    <div 
                      className="legend-color" 
                      style={{ backgroundColor: expensesChartData.datasets[0].backgroundColor[index] }}
                    />
                    <span className="legend-label">{label}</span>
                    <span className="legend-value">
                      KES {expensesChartData.datasets[0].data[index].toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals Chart */}
        <div className="dashboard-col">
          <div className="chart-card">
            <div className="card-header">
              <div className="card-title">
                <Activity size={20} />
                <span>Pending Approvals</span>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                <Eye size={16} />
                View All
              </button>
            </div>
            <div className="chart-container">
              <Bar data={pendingChartData} options={barChartOptions} />
            </div>
            <div className="chart-footer">
              <div className="chart-stats">
                <div className="stat-item">
                  <div className="stat-number">{stats.pettyCash.pending}</div>
                  <div className="stat-label">Petty Cash</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{stats.repairs.pending}</div>
                  <div className="stat-label">Repairs</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{stats.employees.pending}</div>
                  <div className="stat-label">Employees</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-col">
          <div className="activity-card">
            <div className="card-header">
              <div className="card-title">
                <Clock size={20} />
                <span>Recent Activity</span>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800">
                View all
              </button>
            </div>
            <div className="activity-list">
              {recentActivity.length === 0 ? (
                <div className="empty-activity">
                  <Activity size={32} className="text-gray-400" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity, index) => (
                  <div key={index} className="activity-item">
                    <div className="activity-icon">
                      <DollarSign size={16} />
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.description}</p>
                      <div className="activity-details">
                        <span className="activity-amount">
                          KES {parseFloat(activity.amount).toFixed(2)}
                        </span>
                        <span className="activity-time">
                          {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className={`activity-status status-${activity.status}`}>
                      {activity.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Detailed Stats Grid */}
      <div className="dashboard-row">
        <div className="stats-grid">
          {renderStatCard(
            <DollarSign size={24} />,
            "Petty Cash",
            `KES ${stats.pettyCash.total.toLocaleString()}`,
            `${stats.pettyCash.pending} pending • ${stats.pettyCash.approved} approved`,
            "bg-gradient-to-br from-blue-500 to-blue-600",
            "+12%"
          )}
          {renderStatCard(
            <Car size={24} />,
            "Vehicles",
            stats.vehicles.total.toString(),
            `${stats.vehicles.active} active • ${stats.vehicles.inactive} inactive`,
            "bg-gradient-to-br from-green-500 to-green-600",
            "+5%"
          )}
          {renderStatCard(
            <Wrench size={24} />,
            "Car Repairs",
            stats.repairs.total.toString(),
            `KES ${stats.repairs.totalCost.toLocaleString()} • ${stats.repairs.pending} pending`,
            "bg-gradient-to-br from-orange-500 to-orange-600",
            "+8%"
          )}
          {renderStatCard(
            <Shield size={24} />,
            "Insurance",
            stats.insurance.total.toString(),
            `${stats.insurance.expiring} expiring • ${stats.insurance.active} active`,
            "bg-gradient-to-br from-purple-500 to-purple-600",
            "-3%"
          )}
          {renderStatCard(
            <Users size={24} />,
            "Employee Transactions",
            stats.employees.total.toString(),
            `${stats.employees.pending} pending • ${stats.employees.approved} approved`,
            "bg-gradient-to-br from-indigo-500 to-indigo-600",
            "+15%"
          )}
          {renderStatCard(
            <Building size={24} />,
            "Vendors",
            stats.vendors.total.toString(),
            `${stats.vendors.active} active • ${stats.vendors.inactive} inactive`,
            "bg-gradient-to-br from-red-500 to-red-600",
            "+2%"
          )}
          {renderStatCard(
            <Calendar size={24} />,
            "Leave Requests",
            stats.leave.total.toString(),
            `${stats.leave.pending} pending • ${stats.leave.approved} approved`,
            "bg-gradient-to-br from-cyan-500 to-cyan-600",
            "+10%"
          )}
          {renderStatCard(
            <FileText size={24} />,
            "Valuations",
            `KES ${stats.valuations.totalAmount.toLocaleString()}`,
            `${stats.valuations.pending} pending • ${stats.valuations.completed} completed`,
            "bg-gradient-to-br from-teal-500 to-teal-600",
            "+20%"
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;