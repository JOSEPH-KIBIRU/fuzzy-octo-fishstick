/* eslint-disable no-unused-vars */
// services/reminderService.js
import { notificationService } from "./notificationService";
import { supabase } from "../utils/supabaseClient";

export const reminderService = {
  // Check if a table exists and has data
  async checkTableExists(tableName) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .limit(1);

      if (error) {
        if (error.code === "42P01") {
          // table does not exist
          return false;
        }
        throw error;
      }
      return true;
    } catch (error) {
      console.warn(`⚠️ Table ${tableName} check failed:`, error.message);
      return false;
    }
  },

  // Check for expiring insurance policies (30 days warning)
  async checkExpiringInsurance() {
    try {
      console.log("🔍 Checking expiring insurance policies...");

      // Check if table exists first
      const tableExists = await this.checkTableExists("insurance_policies");
      if (!tableExists) {
        console.log(
          "⚠️ insurance_policies table does not exist, skipping check"
        );
        return 0;
      }

      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

      const today = new Date().toISOString().split("T")[0];

      // Use simpler query first to test
      let query = supabase.from("insurance_policies").select("*");

      // Add filters only if we know the columns exist
      try {
        // Test if we can query with these filters
        const testQuery = await supabase
          .from("insurance_policies")
          .select("id")
          .limit(1);

        if (!testQuery.error) {
          // If basic query works, try the full query
          query = query
            .lte("expiry_date", thirtyDaysStr)
            .gte("expiry_date", today)
            .eq("status", "active");
        }
      } catch (filterError) {
        console.warn(
          "⚠️ Using simplified insurance query due to column issues"
        );
        // Use basic query without filters
      }

      const { data: expiringPolicies, error } = await query;

      if (error) {
        console.error("❌ Insurance query error:", error);
        // Try even simpler query
        const { data: simpleData, error: simpleError } = await supabase
          .from("insurance_policies")
          .select("*")
          .limit(10);

        if (simpleError) {
          console.error("❌ Even simple insurance query failed:", simpleError);
          return 0;
        }

        // Manual filtering in JavaScript
        const filteredPolicies = simpleData.filter((policy) => {
          if (!policy.expiry_date || policy.status !== "active") return false;

          const expiryDate = new Date(policy.expiry_date);
          const today = new Date();
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(today.getDate() + 30);

          return expiryDate >= today && expiryDate <= thirtyDaysFromNow;
        });

        console.log(
          `🔍 Found ${filteredPolicies.length} expiring policies (manual filter)`
        );
        await this.notifyAdminsAboutExpiringInsurance(filteredPolicies);
        return filteredPolicies.length;
      }

      console.log(
        `🔍 Found ${expiringPolicies?.length || 0} expiring insurance policies`
      );

      if (expiringPolicies && expiringPolicies.length > 0) {
        await this.notifyAdminsAboutExpiringInsurance(expiringPolicies);
      }

      return expiringPolicies?.length || 0;
    } catch (error) {
      console.error("❌ Error checking expiring insurance:", error);
      return 0;
    }
  },

  // Notify admins about expiring insurance
  async notifyAdminsAboutExpiringInsurance(policies) {
    try {
      const { data: adminUsers, error: adminError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("role", ["admin", "super_admin"]);

      if (adminError) throw adminError;

      for (const policy of policies) {
        const expiryDate = new Date(policy.expiry_date);
        const today = new Date();
        const daysUntilExpiry = Math.ceil(
          (expiryDate - today) / (1000 * 60 * 60 * 24)
        );

        const vehicleInfo =
          policy.vehicle_id || policy.vehicle_info || "Unknown Vehicle";

        for (const admin of adminUsers) {
          try {
            await notificationService.createReminderNotification({
              userId: admin.id,
              title: "Insurance Policy Expiring Soon",
              message: `Insurance for ${vehicleInfo} expires in ${daysUntilExpiry} days.`,
              type: "insurance_expiry",
              policyId: policy.id,
              vehicleInfo: vehicleInfo,
              expiryDate: policy.expiry_date,
              daysUntilExpiry: daysUntilExpiry,
              premiumAmount: policy.premium_amount,
            });
            console.log(
              `✅ Insurance expiry reminder sent to admin: ${admin.email}`
            );
          } catch (notificationError) {
            console.error(
              `❌ Failed to send insurance reminder to ${admin.email}:`,
              notificationError
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "❌ Error notifying admins about expiring insurance:",
        error
      );
    }
  },

  // Check for overdue valuation payments
  async checkOverdueValuations() {
    try {
      console.log("🔍 Checking overdue valuation payments...");

      const tableExists = await this.checkTableExists("valuation_payments");
      if (!tableExists) {
        console.log(
          "⚠️ valuation_payments table does not exist, skipping check"
        );
        return 0;
      }

      const today = new Date().toISOString().split("T")[0];

      // Simple query first
      const { data: allValuations, error } = await supabase
        .from("valuation_payments")
        .select("*");

      if (error) {
        console.error("❌ Valuation payments query error:", error);
        return 0;
      }

      // Manual filtering
      const overdueValuations = allValuations.filter((valuation) => {
        if (!valuation.payment_date || valuation.status !== "pending")
          return false;

        const paymentDate = new Date(valuation.payment_date);
        const today = new Date();
        return paymentDate < today;
      });

      console.log(
        `🔍 Found ${overdueValuations.length} overdue valuation payments`
      );

      if (overdueValuations.length > 0) {
        await this.notifyAdminsAboutOverdueValuations(overdueValuations);
      }

      return overdueValuations.length;
    } catch (error) {
      console.error("❌ Error checking overdue valuations:", error);
      return 0;
    }
  },

  // Notify admins about overdue valuations
  async notifyAdminsAboutOverdueValuations(valuations) {
    try {
      const { data: adminUsers, error: adminError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("role", ["admin", "super_admin"]);

      if (adminError) throw adminError;

      for (const valuation of valuations) {
        const dueDate = new Date(valuation.payment_date);
        const today = new Date();
        const daysOverdue = Math.ceil(
          (today - dueDate) / (1000 * 60 * 60 * 24)
        );

        const propertyAddress =
          valuation.property_address || "Unknown Property";

        for (const admin of adminUsers) {
          try {
            await notificationService.createReminderNotification({
              userId: admin.id,
              title: "Overdue Valuation Payment",
              message: `Valuation payment for ${propertyAddress} is ${daysOverdue} days overdue.`,
              type: "valuation_overdue",
              valuationId: valuation.id,
              propertyAddress: propertyAddress,
              amount: valuation.payment_amount || valuation.amount,
              dueDate: valuation.payment_date,
              daysOverdue: daysOverdue,
            });
            console.log(
              `✅ Valuation overdue reminder sent to admin: ${admin.email}`
            );
          } catch (notificationError) {
            console.error(
              `❌ Failed to send valuation reminder to ${admin.email}:`,
              notificationError
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "❌ Error notifying admins about overdue valuations:",
        error
      );
    }
  },

  // Check for pending approvals and notify admins
  async checkPendingApprovals() {
    try {
      console.log("🔍 Checking pending approvals...");

      const tablesToCheck = [
        "petty_cash",
        "employee_transactions",
        "leave_requests",
        "car_repairs",
      ];

      let totalPending = 0;
      const pendingBreakdown = {};

      for (const tableName of tablesToCheck) {
        const tableExists = await this.checkTableExists(tableName);
        if (!tableExists) {
          console.log(`⚠️ ${tableName} table does not exist, skipping`);
          pendingBreakdown[tableName] = 0;
          continue;
        }

        try {
          const { data, error } = await supabase
            .from(tableName)
            .select("*")
            .eq("status", "pending");

          if (error) {
            console.warn(`⚠️ Error querying ${tableName}:`, error.message);
            pendingBreakdown[tableName] = 0;
          } else {
            const count = data?.length || 0;
            pendingBreakdown[tableName] = count;
            totalPending += count;
            console.log(`📊 ${tableName}: ${count} pending`);
          }
        } catch (tableError) {
          console.warn(`⚠️ Failed to check ${tableName}:`, tableError.message);
          pendingBreakdown[tableName] = 0;
        }
      }

      if (totalPending > 0) {
        console.log(`🔍 Found ${totalPending} total pending approvals`);
        await this.notifyAdminsAboutPendingApprovals(
          totalPending,
          pendingBreakdown
        );
      } else {
        console.log("✅ No pending approvals found");
      }

      return totalPending;
    } catch (error) {
      console.error("❌ Error checking pending approvals:", error);
      return 0;
    }
  },

  // Notify admins about pending approvals
  async notifyAdminsAboutPendingApprovals(totalCount, breakdown) {
    try {
      const { data: adminUsers, error: adminError } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("role", ["admin", "super_admin"]);

      if (adminError) throw adminError;

      // Create breakdown text
      const breakdownText = Object.entries(breakdown)
        .filter(([_, count]) => count > 0)
        .map(([table, count]) => `${this.formatTableName(table)}: ${count}`)
        .join(", ");

      for (const admin of adminUsers) {
        try {
          await notificationService.createReminderNotification({
            userId: admin.id,
            title: "Pending Approvals Require Attention",
            message: `You have ${totalCount} items waiting for your approval. ${breakdownText}`,
            type: "pending_approvals",
            totalCount: totalCount,
            breakdown: breakdown,
            timestamp: new Date().toISOString(),
          });
          console.log(
            `✅ Pending approvals reminder sent to admin: ${admin.email}`
          );
        } catch (notificationError) {
          console.error(
            `❌ Failed to send approval reminder to ${admin.email}:`,
            notificationError
          );
        }
      }
    } catch (error) {
      console.error(
        "❌ Error notifying admins about pending approvals:",
        error
      );
    }
  },

  // Helper to format table names for display
  formatTableName(tableName) {
    const names = {
      petty_cash: "Petty Cash",
      employee_transactions: "Employee Transactions",
      leave_requests: "Leave Requests",
      car_repairs: "Car Repairs",
    };
    return names[tableName] || tableName;
  },

  // Run all reminder checks with comprehensive error handling
  async runAllReminders() {
    try {
      console.log("🚀 Running all reminder checks...");

      const results = {
        expiringInsurance: 0,
        overdueValuations: 0,
        pendingApprovals: 0,
        timestamp: new Date().toISOString(),
      };

      // Run each check individually with error handling
      try {
        results.expiringInsurance = await this.checkExpiringInsurance();
      } catch (error) {
        console.error("❌ Insurance check failed:", error);
        results.expiringInsurance = 0;
      }

      try {
        results.overdueValuations = await this.checkOverdueValuations();
      } catch (error) {
        console.error("❌ Valuations check failed:", error);
        results.overdueValuations = 0;
      }

      try {
        results.pendingApprovals = await this.checkPendingApprovals();
      } catch (error) {
        console.error("❌ Approvals check failed:", error);
        results.pendingApprovals = 0;
      }

      const totalReminders = Object.values(results).reduce(
        (sum, count) => (typeof count === "number" ? sum + count : sum),
        0
      );

      console.log("✅ All reminder checks completed:", results);
      console.log(
        `📊 Reminder Summary: ${totalReminders} total reminders sent`
      );

      return results;
    } catch (error) {
      console.error("❌ Critical error running reminders:", error);
      // Return empty results instead of throwing
      return {
        expiringInsurance: 0,
        overdueValuations: 0,
        pendingApprovals: 0,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
};

export default reminderService;
