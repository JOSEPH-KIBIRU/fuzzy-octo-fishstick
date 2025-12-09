// components/Auth/CompanySelection.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useCompany } from '../../contexts/CompanyContext';
import { Building2, Plus, ArrowRight, Users, AlertCircle, Loader2 } from 'lucide-react';

const CompanySelection = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { switchCompany } = useCompany();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // First, get the current user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchCompanies(user);
      } else {
        navigate('/login');
      }
    };
    
    getUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchCompanies = async (currentUser) => {
    try {
      setLoading(true);
      setError(null);

      // CRITICAL: Check if user and user.id exist
      if (!currentUser || !currentUser.id) {
        console.error('No user or user ID found');
        setError('User not found. Please log in again.');
        setLoading(false);
        return;
      }

      console.log('Fetching companies for user ID:', currentUser.id);
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(currentUser.id.trim())) {
        console.error('Invalid UUID format:', currentUser.id);
        setError('Invalid user ID format');
        setLoading(false);
        return;
      }

      // Use a SIMPLE query first - no nested selects
      const { data: memberships, error: fetchError } = await supabase
        .from('company_members')
        .select('role, company_id')
        .eq('user_id', currentUser.id.trim()) // Use trimmed ID
        .eq('status', 'active');

      if (fetchError) {
        console.error('Detailed fetch error:', fetchError);
        throw fetchError;
      }

      console.log('Memberships found:', memberships);

      if (!memberships || memberships.length === 0) {
        setError('You are not a member of any company yet. Create your first company!');
        setCompanies([]);
        setLoading(false);
        return;
      }

      // Get company IDs
      const companyIds = memberships.map(m => m.company_id);
      
      // Fetch companies separately
      const { data: companyData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, slug, plan_id, subscription_status')
        .in('id', companyIds);

      if (companiesError) {
        console.error('Companies fetch error:', companiesError);
        throw companiesError;
      }

      console.log('Company data found:', companyData);

      // Combine the data
      const combinedData = memberships.map(membership => {
        const company = companyData?.find(c => c.id === membership.company_id);
        return {
          role: membership.role,
          company: company || {
            id: membership.company_id,
            name: 'Unknown Company',
            slug: 'unknown',
            plan_id: 'starter',
            subscription_status: 'unknown'
          }
        };
      });

      setCompanies(combinedData);
      setError(null);

    } catch (err) {
      console.error('Error fetching companies:', err);
      setError(err.message || 'Failed to load companies. Please try again.');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = async (company) => {
    try {
      const result = await switchCompany(company);
      if (result.success) {
        navigate(`/app/${company.slug}/dashboard`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="company-selection-loading">
        <div className="loading-spinner">
          <Loader2 size={48} className="spinner-icon" />
        </div>
        <p>Loading your workspaces...</p>
        <small>User ID: {user?.id ? `${user.id.substring(0, 8)}...` : 'Loading...'}</small>
      </div>
    );
  }

  return (
    <div className="company-selection">
      <div className="selection-header">
        <h1>Select a Workspace</h1>
        <p>Choose which company workspace you want to access</p>
        <small>Logged in as: {user?.email}</small>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={24} />
          <p>{error}</p>
          {error.includes('not a member') && (
            <button 
              onClick={() => navigate('/create-company')}
              className="create-first-btn"
            >
              Create Your First Company
            </button>
          )}
          <button onClick={() => fetchCompanies(user)} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {companies.length > 0 ? (
        <div className="companies-grid">
          {companies.map((item, index) => (
            <div 
              key={index} 
              className="company-card"
              onClick={() => handleSelectCompany(item.company)}
            >
              <div className="company-avatar">
                <Building2 size={32} />
              </div>
              <div className="company-info">
                <h3>{item.company.name}</h3>
                <div className="company-meta">
                  <span className={`company-plan ${item.company.plan_id}`}>
                    {item.company.plan_id.charAt(0).toUpperCase() + item.company.plan_id.slice(1)} Plan
                  </span>
                  <span className="company-role">
                    <Users size={14} /> {item.role}
                  </span>
                </div>
                <div className="company-status">
                  {item.company.subscription_status === 'trial' ? (
                    <span className="trial-badge">Trial</span>
                  ) : (
                    <span className="active-badge">Active</span>
                  )}
                </div>
              </div>
              <ArrowRight className="company-arrow" />
            </div>
          ))}

          {/* Create new company option */}
          <div 
            className="create-company-card"
            onClick={() => navigate('/create-company')}
          >
            <div className="create-icon">
              <Plus size={32} />
            </div>
            <div className="create-info">
              <h3>Create New Workspace</h3>
              <p>Start a new company workspace</p>
            </div>
          </div>
        </div>
      ) : !error && (
        <div className="no-companies">
          <Building2 size={64} />
          <h3>No Workspaces Found</h3>
          <p>You are not a member of any company workspace yet.</p>
          <button 
            onClick={() => navigate('/create-company')}
            className="create-first-btn"
          >
            Create Your First Workspace
          </button>
        </div>
      )}

      <div className="selection-footer">
        <p>
          Need help? <a href="/support">Contact support</a>
        </p>
        <small style={{ marginTop: '10px', color: '#666' }}>
          Debug: User ID: {user?.id ? `${user.id.substring(0, 8)}...` : 'Not found'}
        </small>
      </div>
    </div>
  );
};

export default CompanySelection;