// components/layout/Header.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Search, 
  LogOut, 
  X, 
  DollarSign,
  Users,  
  Building,
  Car,
  FileText,
  Calendar,
  Store,
  AlertCircle,
  Clock
} from 'lucide-react';
import { useAuthContext } from '../../contexts/AuthContext';
import { useUserRoles } from '../../hooks/useUserRoles';
import { Link, useNavigate } from 'react-router-dom';
import Notifications from '../Notifications';
import { supabase } from '../../utils/supabaseClient';

const Header = () => {
  const { user } = useAuthContext();
  const { getCurrentUserRole } = useUserRoles();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const searchRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const searchTables = async (query) => {
    const searches = [];

    // 1. Search Petty Cash
    searches.push(
      supabase
        .from('petty_cash')
        .select('id, description, amount, status, created_at')
        .or(`description.ilike.%${query}%,category.ilike.%${query}%,notes.ilike.%${query}%`)
        .limit(3)
        .then(({ data }) => 
          data?.map(item => ({
            ...item,
            type: 'petty_cash',
            title: item.description || 'Petty Cash',
            subtitle: `KES ${item.amount?.toLocaleString() || '0'} • ${item.status || 'N/A'}`,
            icon: <DollarSign size={16} />,
            link: '/petty-cash',
            date: item.created_at
          })) || []
        )
    );

    // 2. Search Employee Transactions
    searches.push(
      supabase
        .from('employee_transactions')
        .select('id, description, amount, employee_name, status, created_at')
        .or(`description.ilike.%${query}%,employee_name.ilike.%${query}%,purpose.ilike.%${query}%`)
        .limit(3)
        .then(({ data }) => 
          data?.map(item => ({
            ...item,
            type: 'employee_transaction',
            title: item.description || 'Transaction',
            subtitle: `KES ${item.amount?.toLocaleString() || '0'} • ${item.employee_name || 'Unknown'}`,
            icon: <Users size={16} />,
            link: '/employee-transactions',
            date: item.created_at
          })) || []
        )
    );

    // 3. Search Valuation Payments
    searches.push(
      supabase
        .from('valuation_payments')
        .select('id, property_address, client_name, amount, status, created_at')
        .or(`property_address.ilike.%${query}%,client_name.ilike.%${query}%,reference.ilike.%${query}%`)
        .limit(3)
        .then(({ data }) => 
          data?.map(item => ({
            ...item,
            type: 'valuation_payment',
            title: item.property_address || 'Valuation',
            subtitle: `KES ${item.amount?.toLocaleString() || '0'} • ${item.client_name || 'Unknown'}`,
            icon: <Building size={16} />,
            link: '/valuation-payments',
            date: item.created_at
          })) || []
        )
    );

    // 4. Search Vehicles
    searches.push(
      supabase
        .from('vehicles')
        .select('id, registration_number, make, model, owner_name, created_at')
        .or(`registration_number.ilike.%${query}%,make.ilike.%${query}%,model.ilike.%${query}%,owner_name.ilike.%${query}%`)
        .limit(3)
        .then(({ data }) => 
          data?.map(item => ({
            ...item,
            type: 'vehicle',
            title: `${item.make || ''} ${item.model || ''}`.trim(),
            subtitle: `${item.registration_number || 'No plate'} • ${item.owner_name || 'Unknown'}`,
            icon: <Car size={16} />,
            link: '/vehicles',
            date: item.created_at
          })) || []
        )
    );

    // 5. Search Leave Requests
    searches.push(
      supabase
        .from('leave_requests')
        .select('id, employee_name, leave_type, start_date, end_date, status, created_at')
        .or(`employee_name.ilike.%${query}%,leave_type.ilike.%${query}%,notes.ilike.%${query}%`)
        .limit(3)
        .then(({ data }) => 
          data?.map(item => ({
            ...item,
            type: 'leave_request',
            title: `${item.employee_name || 'Employee'} - ${item.leave_type || 'Leave'}`,
            subtitle: `${new Date(item.start_date).toLocaleDateString()} to ${new Date(item.end_date).toLocaleDateString()} • ${item.status || 'Pending'}`,
            icon: <Calendar size={16} />,
            link: '/leave-requests',
            date: item.created_at
          })) || []
        )
    );

    // 6. Search Vendors
    searches.push(
      supabase
        .from('vendors')
        .select('id, name, contact_person, phone, email, created_at')
        .or(`name.ilike.%${query}%,contact_person.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(3)
        .then(({ data }) => 
          data?.map(item => ({
            ...item,
            type: 'vendor',
            title: item.name || 'Vendor',
            subtitle: `${item.contact_person || 'No contact'} • ${item.phone || 'No phone'}`,
            icon: <Store size={16} />,
            link: '/vendors',
            date: item.created_at
          })) || []
        )
    );

    // 7. Search Insurance Policies
    searches.push(
      supabase
        .from('insurance_policies')
        .select('id, policy_number, vehicle_id, premium_amount, expiry_date, status, created_at')
        .or(`policy_number.ilike.%${query}%,insurance_company.ilike.%${query}%`)
        .limit(3)
        .then(({ data }) => 
          data?.map(item => ({
            ...item,
            type: 'insurance',
            title: `Policy: ${item.policy_number || 'No number'}`,
            subtitle: `KES ${item.premium_amount?.toLocaleString() || '0'} • Expires: ${new Date(item.expiry_date).toLocaleDateString()}`,
            icon: <FileText size={16} />,
            link: '/vehicles/insurance',
            date: item.created_at
          })) || []
        )
    );

    const results = await Promise.all(searches);
    return results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    
    const query = searchQuery.trim();
    if (!query) {
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);

    try {
      const results = await searchTables(query);
      setSearchResults(results);
      
      // Save to recent searches
      if (results.length > 0) {
        const newRecent = [
          { query, timestamp: new Date().toISOString(), count: results.length },
          ...recentSearches.filter(s => s.query !== query).slice(0, 4)
        ];
        setRecentSearches(newRecent);
        localStorage.setItem('recentSearches', JSON.stringify(newRecent));
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchItemClick = (item) => {
    // Add search query to URL
    navigate(`${item.link}?search=${encodeURIComponent(searchQuery)}`);
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleRecentSearchClick = (query) => {
    setSearchQuery(query);
    // Trigger search after a short delay
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} };
      handleSearch(fakeEvent);
    }, 100);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const getIconForType = (type) => {
    const icons = {
      'petty_cash': <DollarSign size={16} />,
      'employee_transaction': <Users size={16} />,
      'valuation_payment': <Building size={16} />,
      'vehicle': <Car size={16} />,
      'leave_request': <Calendar size={16} />,
      'vendor': <Store size={16} />,
      'insurance': <FileText size={16} />
    };
    return icons[type] || <FileText size={16} />;
  };

  const getTypeLabel = (type) => {
    const labels = {
      'petty_cash': 'Petty Cash',
      'employee_transaction': 'Employee Transaction',
      'valuation_payment': 'Valuation',
      'vehicle': 'Vehicle',
      'leave_request': 'Leave Request',
      'vendor': 'Vendor',
      'insurance': 'Insurance'
    };
    return labels[type] || 'Item';
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      'super_admin': 'Super Admin',
      'admin': 'Administrator',
      'manager': 'Manager',
      'user': 'User'
    };
    return roleMap[role] || 'User';
  };

  return (
    <header className="header">
      <div className="header-left" ref={searchRef}>
        <form onSubmit={handleSearch} className="search-container">
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search transactions, employees, vehicles, policies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="clear-search"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="search-results">
              <div className="search-results-header">
                <h4>
                  {searchLoading ? 'Searching...' : 
                   searchResults.length > 0 ? `Found ${searchResults.length} results` :
                   searchQuery ? 'No results found' : 'Recent Searches'}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSearchResults(false)}
                  className="close-results"
                  aria-label="Close results"
                >
                  <X size={16} />
                </button>
              </div>
              
              {searchLoading ? (
                <div className="search-loading">
                  <div className="spinner"></div>
                  <span>Searching across all records...</span>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="search-results-list">
                    {searchResults.map((result, index) => (
                      <div
                        key={`${result.type}-${result.id}-${index}`}
                        className="search-result-item"
                        onClick={() => handleSearchItemClick(result)}
                      >
                        <div className="result-icon">
                          {getIconForType(result.type)}
                        </div>
                        <div className="result-content">
                          <div className="result-title">{result.title}</div>
                          <div className="result-subtitle">{result.subtitle}</div>
                          <div className="result-meta">
                            <span className="result-type">{getTypeLabel(result.type)}</span>
                            {result.date && (
                              <span className="result-date">
                                <Clock size={12} />
                                {new Date(result.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="result-arrow">→</div>
                      </div>
                    ))}
                  </div>
                  <div className="search-results-footer">
                    <button
                      type="button"
                      onClick={() => {
                        navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                        setShowSearchResults(false);
                      }}
                      className="view-all-results"
                    >
                      View all results for "{searchQuery}"
                    </button>
                  </div>
                </>
              ) : searchQuery ? (
                <div className="no-results">
                  <AlertCircle size={24} />
                  <p>No results found for "{searchQuery}"</p>
                  <p className="hint">Try different keywords or check spelling</p>
                </div>
              ) : recentSearches.length > 0 ? (
                <>
                  <div className="recent-searches">
                    <div className="recent-header">
                      <span>Recent Searches</span>
                      <button 
                        onClick={clearRecentSearches}
                        className="clear-recent"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="recent-list">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          className="recent-item"
                          onClick={() => handleRecentSearchClick(search.query)}
                        >
                          <Search size={14} />
                          <span>{search.query}</span>
                          <span className="recent-count">{search.count} results</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="search-tips">
                  <p>💡 <strong>Search tips:</strong></p>
                  <ul>
                    <li>Search by employee name, vehicle plate, policy number</li>
                    <li>Try "overdue", "pending", or status keywords</li>
                    <li>Search amounts (e.g., "5000", "10000")</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
      
      <div className="header-right">
        <Notifications />
        
        <Link to="/profile" className="user-profile">
          <User size={20} />
          <div className="user-info">
            <span className="user-email">{user?.email}</span>
            <span className="user-role">{getRoleDisplay(getCurrentUserRole())}</span>
          </div>
        </Link>
        
        <button className="icon-button" onClick={handleLogout} title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;