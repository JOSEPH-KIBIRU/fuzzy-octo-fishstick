// components/SimpleRegistration.jsx
import { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Lock, Mail, Shield } from 'lucide-react';

const SimpleRegistration = ({ onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: Password, 3: Done
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Continue = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep2()) return;

    setLoading(true);
    setMessage('');

    try {
      // 1. Create auth user with email and password
      // eslint-disable-next-line no-unused-vars
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            registration_status: 'pending'
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (authError) {
        // Check if user already exists
        if (authError.message.includes('already registered')) {
          // User exists but might not be approved yet
          setMessage('⚠️ This email is already registered. Please wait for admin approval.');
          return;
        }
        throw authError;
      }

      // 2. Create registration request
      const { error: requestError } = await supabase
        .from('user_registration_requests')
        .insert([{
          email: formData.email,
          status: 'pending',
          created_at: new Date().toISOString()
        }]);

      if (requestError) throw requestError;

      // 3. Success - move to final step
      setStep(3);
      setMessage('✅ Registration successful! Your account is pending admin approval.');

      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Registration error:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error for this field when user types
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  return (
    <div className="simple-registration-container">
      <div className="registration-card">
        <div className="registration-header">
          <div className="logo">
            <Shield size={32} />
          </div>
          <h2>Create Your Account</h2>
          <p className="subtitle">Simple registration with admin approval</p>
        </div>

        {/* Progress Steps */}
        <div className="progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''}`}>
            <span>1</span>
            <p>Email</p>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span>
            <p>Password</p>
          </div>
          <div className="step-line"></div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <span>3</span>
            <p>Done</p>
          </div>
        </div>

        {/* Step 1: Email */}
        {step === 1 && (
          <div className="step-content">
            <div className="input-group">
              <label htmlFor="email">
                <Mail size={16} />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.email@company.com"
                className={errors.email ? 'error' : ''}
                autoComplete="email"
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <button
              onClick={handleStep1Continue}
              className="btn-primary"
            >
              Continue
            </button>

            <div className="login-link">
              Already have an account? <a href="/login">Log in here</a>
            </div>
          </div>
        )}

        {/* Step 2: Password */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="step-content">
            <div className="input-group">
              <label htmlFor="password">
                <Lock size={16} />
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                className={errors.password ? 'error' : ''}
                autoComplete="new-password"
              />
              {errors.password && <span className="error-message">{errors.password}</span>}
              <div className="password-hint">Minimum 6 characters</div>
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">
                <Lock size={16} />
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                className={errors.confirmPassword ? 'error' : ''}
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <span className="error-message">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary"
                disabled={loading}
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="success-step">
            <div className="success-icon">
              <Shield size={48} />
            </div>
            <h3>Registration Complete!</h3>
            <p className="success-message">
              Your account has been created and is pending admin approval.
            </p>
            <p className="instructions">
              You will receive an email notification once your account is approved.
              After approval, you can log in with the credentials you just created.
            </p>
            
            <div className="credentials-summary">
              <h4>Your Credentials:</h4>
              <div className="credential-item">
                <Mail size={14} />
                <span>{formData.email}</span>
              </div>
              <div className="credential-item">
                <Lock size={14} />
                <span>Password: ••••••••</span>
              </div>
            </div>

            <button
              onClick={() => window.location.href = '/login'}
              className="btn-primary"
            >
              Go to Login Page
            </button>
          </div>
        )}

        {message && step !== 3 && (
          <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
      </div>

      <div className="registration-info">
        <h3>How it works:</h3>
        <ul>
          <li>1. Create your account with email and password</li>
          <li>2. Admin reviews and approves your account</li>
          <li>3. Receive approval notification</li>
          <li>4. Log in with your credentials</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleRegistration;