// pages/SearchResults.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  DollarSign, Users, Building, Car, Calendar, Store, FileText,
  Search, Filter, ArrowUpDown, Download,
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    petty_cash: 0,
    employee_transactions: 0,
    valuation_payments: 0,
    vehicles: 0,
    leave_requests: 0,
    vendors: 0,
    insurance: 0
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    setSearchQuery(query);
    
    if (query) {
      performSearch(query);
    }
  }, [location]);

  const performSearch = async (query) => {
    if (!query.trim()) return;
    
    setLoading(true);
    
    try {
      // Search all tables (similar to Header search but with more details)
      const searches = {
        petty_cash: supabase
          .from('petty_cash')
          .select('*')
          .or(`description.ilike.%${query}%,category.ilike.%${query}%,notes.ilike.%${query}%`),
        
        employee_transactions: supabase
          .from('employee_transactions')
          .select('*')
          .or(`description.ilike.%${query}%,employee_name.ilike.%${query}%,purpose.ilike.%${query}%`),
        
        valuation_payments: supabase
          .from('valuation_payments')
          .select('*')
          .or(`property_address.ilike.%${query}%,client_name.ilike.%${query}%,reference.ilike.%${query}%`),
        
        vehicles: supabase
          .from('vehicles')
          .select('*')
          .or(`registration_number.ilike.%${query}%,make.ilike.%${query}%,model.ilike.%${query}%,owner_name.ilike.%${query}%`),
        
        leave_requests: supabase
          .from('leave_requests')
          .select('*')
          .or(`employee_name.ilike.%${query}%,leave_type.ilike.%${query}%,notes.ilike.%${query}%`),
        
        vendors: supabase
          .from('vendors')
          .select('*')
          .or(`name.ilike.%${query}%,contact_person.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`),
        
        insurance: supabase
          .from('insurance_policies')
          .select('*')
          .or(`policy_number.ilike.%${query}%,insurance_company.ilike.%${query}%`)
      };

      const results = {};
      const statsData = { total: 0 };
      
      for (const [key, promise] of Object.entries(searches)) {
        const { data } = await promise;
        results[key] = data || [];
        statsData[key] = data?.length || 0;
        statsData.total += data?.length || 0;
      }
      
      setResults(results);
      setStats(statsData);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getIconForType = (type) => {
    const icons = {
      petty_cash: <DollarSign size={18} />,
      employee_transactions: <Users size={18} />,
      valuation_payments: <Building size={18} />,
      vehicles: <Car size={18} />,
      leave_requests: <Calendar size={18} />,
      vendors: <Store size={18} />,
      insurance: <FileText size={18} />
    };
    return icons[type] || <Search size={18} />;
  };

  const getTypeLabel = (type) => {
    const labels = {
      petty_cash: 'Petty Cash',
      employee_transactions: 'Employee Transactions',
      valuation_payments: 'Valuation Payments',
      vehicles: 'Vehicles',
      leave_requests: 'Leave Requests',
      vendors: 'Vendors',
      insurance: 'Insurance Policies'
    };
    return labels[type] || type;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };

  return (
    <div className="search-results-page">
      <div className="search-header">
        <div className="search-bar-large">
          <form onSubmit={handleNewSearch}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search across all records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>
        </div>
        
        <div className="search-stats">
          <div className="stat-card">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Results</span>
          </div>
          {Object.entries(stats).map(([key, count]) => {
            if (key === 'total' || count === 0) return null;
            return (
              <div key={key} className="stat-card" onClick={() => setActiveTab(key)}>
                <span className="stat-icon">{getIconForType(key)}</span>
                <span className="stat-number">{count}</span>
                <span className="stat-label">{getTypeLabel(key)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Searching for "{searchQuery}" across all records...</p>
        </div>
      ) : searchQuery ? (
        <>
          <div className="results-tabs">
            <button
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Results ({stats.total})
            </button>
            {Object.entries(stats).map(([key, count]) => {
              if (key === 'total' || count === 0) return null;
              return (
                <button
                  key={key}
                  className={`tab ${activeTab === key ? 'active' : ''}`}
                  onClick={() => setActiveTab(key)}
                >
                  {getIconForType(key)}
                  {getTypeLabel(key)} ({count})
                </button>
              );
            })}
          </div>

          <div className="results-container">
            {(activeTab === 'all' ? Object.entries(results) : [[activeTab, results[activeTab]]])
              .map(([type, items]) => (
                items.length > 0 && (
                  <div key={type} className="result-section">
                    <div className="section-header">
                      <h3>
                        {getIconForType(type)}
                        {getTypeLabel(type)} ({items.length})
                      </h3>
                      <div className="section-actions">
                        <button className="action-btn">
                          <Filter size={16} />
                          Filter
                        </button>
                        <button className="action-btn">
                          <ArrowUpDown size={16} />
                          Sort
                        </button>
                        <button className="action-btn">
                          <Download size={16} />
                          Export
                        </button>
                      </div>
                    </div>
                    
                    <div className="results-grid">
                      {items.slice(0, 10).map((item, index) => (
                        <div key={index} className="result-card">
                          <div className="card-header">
                            <div className="card-icon">{getIconForType(type)}</div>
                            <div className="card-title">
                              {item.description || item.property_address || 
                               `${item.make} ${item.model}` || item.name || 'Item'}
                            </div>
                          </div>
                          
                          <div className="card-content">
                            {item.amount && (
                              <div className="card-field">
                                <span>Amount:</span>
                                <strong>{formatCurrency(item.amount)}</strong>
                              </div>
                            )}
                            
                            {item.status && (
                              <div className="card-field">
                                <span>Status:</span>
                                <span className={`status-badge status-${item.status.toLowerCase()}`}>
                                  {item.status}
                                </span>
                              </div>
                            )}
                            
                            {item.created_at && (
                              <div className="card-field">
                                <span>Date:</span>
                                <span>{new Date(item.created_at).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="card-actions">
                            <button 
                              className="card-action"
                              onClick={() => {
                                // Navigate to appropriate page
                                const routes = {
                                  petty_cash: '/petty-cash',
                                  employee_transactions: '/employee-transactions',
                                  valuation_payments: '/valuation-payments',
                                  vehicles: '/vehicles',
                                  leave_requests: '/leave-requests',
                                  vendors: '/vendors',
                                  insurance: '/vehicles/insurance'
                                };
                                navigate(routes[type]);
                              }}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {items.length > 10 && (
                      <div className="view-more">
                        <button onClick={() => {
                          const routes = {
                            petty_cash: '/petty-cash',
                            employee_transactions: '/employee-transactions',
                            valuation_payments: '/valuation-payments',
                            vehicles: '/vehicles',
                            leave_requests: '/leave-requests',
                            vendors: '/vendors',
                            insurance: '/vehicles/insurance'
                          };
                          navigate(`${routes[type]}?search=${encodeURIComponent(searchQuery)}`);
                        }}>
                          View all {items.length} {getTypeLabel(type).toLowerCase()} →
                        </button>
                      </div>
                    )}
                  </div>
                )
              ))}
            
            {stats.total === 0 && (
              <div className="no-results-message">
                <Search size={48} />
                <h3>No results found for "{searchQuery}"</h3>
                <p>Try different keywords or check spelling</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="empty-search">
          <h3>Enter a search term to find records</h3>
          <p>Search across petty cash, employee transactions, vehicles, and more</p>
        </div>
      )}
    </div>
  );
};

export default SearchResults;