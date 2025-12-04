// components/Auth/Login.jsx
import React, { useState } from "react";
import {
  LogIn,
  User,
  Mail,
  Lock,
  Building,
  Briefcase,
  Phone,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../utils/supabaseClient";
import { Link, useNavigate } from "react-router-dom";

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [requestedRole, setRequestedRole] = useState("employee");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (isSignUp) {
      // Handle registration request
      await handleRegistrationRequest();
    } else {
      // Handle login
      await handleSignIn();
    }
  };

  const handleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Check if user exists but hasn't been approved
        if (error.message.includes("Invalid login credentials")) {
          // Check if this is a pending registration
          const { data: pendingRequest } = await supabase
            .from("user_registration_requests")
            .select("status")
            .eq("email", email)
            .single();

          if (pendingRequest?.status === "pending") {
            setMessage(
              "⚠️ Your account is pending admin approval. You will receive an email when approved."
            );
            return;
          } else if (pendingRequest?.status === "rejected") {
            setMessage(
              "❌ Your registration was rejected. Please contact the administrator."
            );
            return;
          }
        }
        throw error;
      }

      // Check if user has a profile (approved user)
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      if (!profile) {
        setMessage(
          "⚠️ Your account is not fully set up. Please contact the administrator."
        );
        await supabase.auth.signOut();
        return;
      }

      setMessage("✅ Login successful! Redirecting...");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (error) {
      console.error("Login error:", error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationRequest = async () => {
    // Validate required fields for registration
    if (!fullName.trim()) {
      setMessage("❌ Full name is required");
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setMessage("❌ Email is required");
      setLoading(false);
      return;
    }

    try {
      // Check if email already has a pending request
      const { data: existingRequest } = await supabase
        .from("user_registration_requests")
        .select("status")
        .eq("email", email)
        .single();

      if (existingRequest) {
        if (existingRequest.status === "pending") {
          setMessage("⚠️ You already have a pending registration request.");
          setLoading(false);
          return;
        } else if (existingRequest.status === "approved") {
          setMessage(
            "✅ Your account has been approved! Please check your email for the invitation link."
          );
          setLoading(false);
          return;
        } else if (existingRequest.status === "rejected") {
          setMessage(
            "❌ Your previous registration was rejected. Please contact the administrator."
          );
          setLoading(false);
          return;
        }
      }

      // Submit registration request
      const { error } = await supabase
        .from("user_registration_requests")
        .insert([
          {
            email,
            full_name: fullName,
            phone: phone || null,
            department: department || null,
            position: position || null,
            requested_role: requestedRole,
            status: "pending",
          },
        ]);

      if (error) throw error;

      setRegistrationSubmitted(true);
      setMessage(
        "✅ Registration request submitted! An admin will review it shortly."
      );

      // Notify admins about new registration request
      await notifyAdminsAboutRegistration();
    } catch (error) {
      console.error("Registration error:", error);
      setMessage(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const notifyAdminsAboutRegistration = async () => {
    try {
      const { data: adminUsers } = await supabase
        .from("profiles")
        .select("email, full_name")
        .in("role", ["admin", "super_admin"]);

      if (!adminUsers || adminUsers.length === 0) return;

      for (const admin of adminUsers) {
        await fetch(
          `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-email`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: admin.email,
              subject: "📋 New User Registration Request",
              html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #3B82F6;">New User Registration Request</h2>
                <p>A new user has requested access to the Office Management System:</p>
                
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #1e293b; margin-top: 0;">User Details</h3>
                  <p><strong>👤 Name:</strong> ${fullName}</p>
                  <p><strong>📧 Email:</strong> ${email}</p>
                  <p><strong>📞 Phone:</strong> ${phone || "Not provided"}</p>
                  <p><strong>🏢 Department:</strong> ${
                    department || "Not specified"
                  }</p>
                  <p><strong>💼 Position:</strong> ${
                    position || "Not specified"
                  }</p>
                  <p><strong>🎯 Requested Role:</strong> ${requestedRole}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${window.location.origin}/admin/approvals" 
                     style="display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    👥 Review Registration Requests
                  </a>
                </div>
                
                <p style="color: #64748b; font-size: 14px;">
                  This request will remain pending until you approve or reject it.
                </p>
              </div>
            `,
              text: `New registration request:\nName: ${fullName}\nEmail: ${email}\nRequested Role: ${requestedRole}\n\nReview at: ${window.location.origin}/admin/approvals`,
            }),
          }
        );
      }
    } catch (error) {
      console.error("Error notifying admins:", error);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setFullName("");
    setPhone("");
    setDepartment("");
    setPosition("");
    setRequestedRole("employee");
    setRegistrationSubmitted(false);
    setMessage("");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <LogIn size={32} />
          <h2>{isSignUp ? "Request Access" : "Welcome Back"}</h2>
          <p>
            {isSignUp
              ? "Submit registration request for review"
              : "Sign in to your account"}
          </p>
        </div>

        {registrationSubmitted ? (
          <div className="success-container">
            <div className="success-icon">
              <AlertCircle size={48} />
            </div>
            <h3>Registration Submitted!</h3>
            <p>
              Your request has been sent for admin approval. You will receive an
              email once it's reviewed.
            </p>
            <p className="success-note">
              If approved, you'll receive an invitation link to create your
              account.
            </p>
            <button
              onClick={() => {
                setIsSignUp(false);
                resetForm();
              }}
              className="auth-button"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="auth-form">
            {isSignUp && (
              <>
                <div className="input-group">
                  <User size={20} />
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="input-group">
                  <Phone size={20} />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <Building size={20} />
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="auth-select"
                  >
                    <option value="">Select Department</option>
                    <option value="Management">Management</option>
                    <option value="Valuation">Valuation</option>
                    <option value="IT">IT</option>
                    <option value="Finance">Finance</option>
                    <option value="HR">Human Resource</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="input-group">
                  <Briefcase size={20} />
                  <input
                    type="text"
                    placeholder="Position / Title"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <User size={20} />
                  <select
                    value={requestedRole}
                    onChange={(e) => setRequestedRole(e.target.value)}
                    className="auth-select"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                  <small className="role-note">
                    Note: Administrator role requires additional verification
                  </small>
                </div>
              </>
            )}

            <div className="input-group">
              <Mail size={20} />
              <input
                type="email"
                placeholder="Email Address *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {!isSignUp && (
              <div className="input-group">
                <Lock size={20} />
                <input
                  type="password"
                  placeholder="Password *"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength="6"
                />
              </div>
            )}

            {message && (
              <div
                className={`message ${
                  message.includes("✅") || message.includes("successful")
                    ? "success"
                    : "error"
                }`}
              >
                {message}
              </div>
            )}

            <button type="submit" disabled={loading} className="auth-button">
              {loading
                ? "Processing..."
                : isSignUp
                ? "Submit Request"
                : "Sign In"}
            </button>

            {!isSignUp && (
              <div className="forgot-password">
                <Link to="/forgot-password">Forgot your password?</Link>
              </div>
            )}
          </form>
        )}

        {!registrationSubmitted && (
          <div className="auth-footer">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                resetForm();
              }}
              className="toggle-auth"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Request Access"}
            </button>

            {isSignUp && (
              <p className="registration-note">
                Your registration will be reviewed by an administrator. You'll
                receive an email once approved.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
