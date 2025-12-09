// components/Auth/RegisterWithCompany.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';

const RegisterWithCompany = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: '',
    companySize: '1-10',
    industry: 'technology'
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      });

      if (authError) throw authError;

      // 2. Create company
      const slug = formData.companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: formData.companyName,
          slug,
          settings: {
            size: formData.companySize,
            industry: formData.industry,
            created_by: authData.user.id
          }
        }])
        .select()
        .single();

      if (companyError) throw companyError;

      // 3. Add user as company owner
      const { error: memberError } = await supabase
        .from('company_members')
        .insert([{
          company_id: companyData.id,
          user_id: authData.user.id,
          role: 'owner',
          invited_by: authData.user.id,
          status: 'active'
        }]);

      if (memberError) throw memberError;

      // 4. Set current company and redirect
      localStorage.setItem('currentCompany', JSON.stringify({
        id: companyData.id,
        name: companyData.name,
        slug: companyData.slug,
        role: 'owner'
      }));

      navigate(`/app/${companyData.slug}/dashboard`);

    } catch (error) {
      console.error('Registration error:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-with-company">
      <div className="register-steps">
        <div className={`step ${step === 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Account Details</div>
        </div>
        <div className={`step ${step === 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Company Info</div>
        </div>
      </div>

      {step === 1 ? (
        <div className="register-step">
          <h2>Create Your Account</h2>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          <button 
            className="btn-primary"
            onClick={() => setStep(2)}
            disabled={!formData.email || !formData.password || !formData.fullName}
          >
            Continue to Company Info
          </button>
        </div>
      ) : (
        <div className="register-step">
          <h2>Tell us about your company</h2>
          <div className="form-group">
            <label>Company Name</label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Company Size</label>
            <select 
              name="companySize" 
              value={formData.companySize}
              onChange={handleInputChange}
            >
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201+">201+ employees</option>
            </select>
          </div>
          <div className="form-group">
            <label>Industry</label>
            <select 
              name="industry" 
              value={formData.industry}
              onChange={handleInputChange}
            >
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="retail">Retail</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-actions">
            <button 
              className="btn-secondary"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button 
              className="btn-primary"
              onClick={handleSignUp}
              disabled={loading || !formData.companyName}
            >
              {loading ? 'Creating Account...' : 'Create Account & Workspace'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterWithCompany;