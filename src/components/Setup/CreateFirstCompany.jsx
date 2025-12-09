// components/Setup/CreateFirstCompany.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { Building2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

const CreateFirstCompany = () => {
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdCompany, setCreatedCompany] = useState(null);
  const navigate = useNavigate();

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const createCompany = async (e) => {
    e.preventDefault();
    
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create a company');
      }

      console.log('Creating company for user:', user.id);

      const slug = generateSlug(companyName);
      
      // Step 1: Create the company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([{
          name: companyName.trim(),
          slug: slug,
          plan_id: 'starter',
          subscription_status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
        .single();

      if (companyError) {
        // If company already exists with this slug, add a random suffix
        if (companyError.code === '23505') { // Unique violation
          const newSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
          const { data: retryCompany, error: retryError } = await supabase
            .from('companies')
            .insert([{
              name: companyName.trim(),
              slug: newSlug,
              plan_id: 'starter'
            }])
            .select()
            .single();
          
          if (retryError) throw retryError;
          // eslint-disable-next-line no-const-assign
          company = retryCompany;
        } else {
          throw companyError;
        }
      }

      console.log('Company created:', company);

      // Step 2: Add user as owner
      const { error: memberError } = await supabase
        .from('company_members')
        .insert([{
          company_id: company.id,
          user_id: user.id,
          role: 'owner',
          status: 'active'
        }]);

      if (memberError) throw memberError;

      console.log('User added as owner');

      // Step 3: Create default folders for the company
      const { error: folderError } = await supabase
        .from('folders')
        .insert([
          {
            company_id: company.id,
            name: 'General',
            created_by: user.id
          },
          {
            company_id: company.id,
            name: 'Finance',
            created_by: user.id
          },
          {
            company_id: company.id,
            name: 'HR',
            created_by: user.id
          }
        ]);

      if (folderError) {
        console.warn('Could not create default folders:', folderError);
        // Continue anyway, this is not critical
      }

      // Step 4: Store in localStorage
      localStorage.setItem('currentCompany', JSON.stringify({
        id: company.id,
        name: company.name,
        slug: company.slug,
        plan_id: company.plan_id
      }));

      setCreatedCompany(company);
      setSuccess(true);

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        navigate(`/app/${company.slug}/dashboard`);
      }, 3000);

    } catch (err) {
      console.error('Error creating company:', err);
      setError(err.message || 'Failed to create company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success && createdCompany) {
    return (
      <div className="create-company-success">
        <div className="success-card">
          <div className="success-icon">
            <CheckCircle size={64} color="#10b981" />
          </div>
          <h1>Company Created Successfully! 🎉</h1>
          <div className="company-details">
            <div className="detail-item">
              <strong>Company Name:</strong> {createdCompany.name}
            </div>
            <div className="detail-item">
              <strong>Workspace URL:</strong> /app/{createdCompany.slug}
            </div>
            <div className="detail-item">
              <strong>Your Role:</strong> Owner
            </div>
            <div className="detail-item">
              <strong>Plan:</strong> Starter (14-day free trial)
            </div>
          </div>
          <div className="success-actions">
            <button 
              onClick={() => navigate(`/app/${createdCompany.slug}/dashboard`)}
              className="go-to-dashboard-btn"
            >
              Go to Dashboard <ArrowRight size={20} />
            </button>
            <p className="redirect-notice">
              Redirecting in 3 seconds...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-first-company">
      <div className="setup-card">
        <div className="setup-header">
          <Building2 size={48} className="setup-icon" />
          <h1>Create Your First Company</h1>
          <p className="setup-subtitle">
            Get started by creating your company workspace. You'll be the owner and can invite team members later.
          </p>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={createCompany} className="company-form">
          <div className="form-group">
            <label htmlFor="companyName">Company Name</label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter your company name"
              disabled={loading}
              autoFocus
            />
            <div className="slug-preview">
              <small>Workspace URL: </small>
              <code>/app/{generateSlug(companyName) || 'your-company'}</code>
            </div>
          </div>

          <div className="what-you-get">
            <h3>What you'll get:</h3>
            <ul>
              <li>✓ 14-day free trial of all features</li>
              <li>✓ Petty cash management</li>
              <li>✓ Employee transaction tracking</li>
              <li>✓ Vehicle management</li>
              <li>✓ Document storage</li>
              <li>✓ Team collaboration tools</li>
            </ul>
          </div>

          <button 
            type="submit" 
            className="create-company-btn"
            disabled={loading || !companyName.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating Company...
              </>
            ) : (
              'Create Company & Get Started'
            )}
          </button>

          <div className="back-to-selection">
            <button 
              type="button"
              onClick={() => navigate('/select-company')}
              className="back-btn"
              disabled={loading}
            >
              ← Back to Company Selection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFirstCompany;