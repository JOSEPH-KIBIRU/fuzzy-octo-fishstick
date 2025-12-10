// components/modals/CheckAvailabilityModal.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { X, Users, Calendar, Clock, UserCheck, UserX } from 'lucide-react';

const CheckAvailabilityModal = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [teamAvailability, setTeamAvailability] = useState([]);
  const [filter, setFilter] = useState('all'); // all, available, busy

  useEffect(() => {
    fetchAvailability();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date,]);

  const fetchAvailability = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employee_availability')
        .select(`
          *,
          profiles (full_name, position, department, email)
        `)
        .eq('date', date)
        .order('profiles(full_name)');

      if (error) throw error;
      setTeamAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAvailability = teamAvailability.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <UserCheck size={16} className="text-green-500" />;
      case 'busy':
        return <span className="text-red-500">●</span>;
      case 'out_of_office':
        return <UserX size={16} className="text-gray-500" />;
      default:
        return <span className="text-yellow-500">●</span>;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-red-100 text-red-800';
      case 'out_of_office':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-4xl">
        <div className="modal-header">
          <div className="modal-title">
            <UserCheck size={24} />
            <h2>Team Availability</h2>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="availability-filters">
            <div className="date-filter">
              <label>
                <Calendar size={16} />
                Select Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            
            <div className="status-filters">
              {['all', 'available', 'busy', 'out_of_office'].map(status => (
                <button
                  key={status}
                  className={`status-filter-btn ${filter === status ? 'active' : ''}`}
                  onClick={() => setFilter(status)}
                >
                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading availability...</p>
            </div>
          ) : (
            <div className="availability-grid">
              {filteredAvailability.length === 0 ? (
                <div className="empty-state">
                  <Users size={48} className="text-gray-400" />
                  <h3>No availability data</h3>
                  <p>No team members have set their availability for this date.</p>
                </div>
              ) : (
                filteredAvailability.map((item, index) => (
                  <div key={index} className="availability-card">
                    <div className="availability-header">
                      <div className="user-info">
                        <div className="user-avatar">
                          {item.profiles?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h4>{item.profiles?.full_name || 'Team Member'}</h4>
                          <p className="user-position">
                            {item.profiles?.position || 'Position'} • {item.profiles?.department || 'Department'}
                          </p>
                        </div>
                      </div>
                      <span className={`status-badge ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="availability-details">
                      <div className="detail-item">
                        <Clock size={14} />
                        <span>Working Hours: {item.working_hours?.start || '09:00'} - {item.working_hours?.end || '17:00'}</span>
                      </div>
                      
                      {item.notes && (
                        <div className="detail-item">
                          <span className="notes-label">Notes:</span>
                          <p className="notes-text">{item.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="availability-actions">
                      <button className="action-btn schedule">
                        Schedule Meeting
                      </button>
                      <button className="action-btn message">
                        Send Message
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckAvailabilityModal;