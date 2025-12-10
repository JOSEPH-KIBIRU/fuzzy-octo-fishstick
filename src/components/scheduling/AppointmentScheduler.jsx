// components/scheduling/AppointmentScheduler.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  Calendar, 
  Clock, 
  Users, 
  Video,
  MapPin,
  Repeat,
  Plus
} from 'lucide-react';

const AppointmentScheduler = ({ selectedDate, onDateChange, user }) => {
  const [appointments, setAppointments] = useState([]);
  const [ setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [teams, setTeams] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'past', 'today'

  const [appointmentData, setAppointmentData] = useState({
    title: '',
    description: '',
    type: 'meeting', // 'meeting', 'appointment', 'interview', 'training'
    startDate: selectedDate.toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: 'conference_room_1',
    attendees: [],
    recurring: false,
    recurring_pattern: 'none', // 'daily', 'weekly', 'monthly'
    reminder: 15, // minutes before
    video_call: false
  });

  useEffect(() => {
    fetchAppointments();
    fetchTeams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, filter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('calendar_events')
        .select(`
          *,
          attendees:event_attendees(
            profiles(full_name, email, department)
          ),
          organizer:profiles!calendar_events_organizer_id_fkey(full_name, email)
        `)
        .order('start_time', { ascending: true });

      // Apply filters
      const today = new Date().toISOString().split('T')[0];
      // eslint-disable-next-line default-case
      switch (filter) {
        case 'today':
          query = query.eq('start_date', today);
          break;
        case 'upcoming':
          query = query.gte('start_date', today);
          break;
        case 'past':
          query = query.lt('start_date', today);
          break;
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, department, position')
        .eq('status', 'active')
        .order('full_name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleScheduleAppointment = async () => {
    try {
      if (!appointmentData.title || !appointmentData.startDate) {
        alert('Please fill all required fields');
        return;
      }

      const startDateTime = `${appointmentData.startDate}T${appointmentData.startTime}`;
      const endDateTime = `${appointmentData.startDate}T${appointmentData.endTime}`;

      // Create the event
      const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .insert([{
          title: appointmentData.title,
          description: appointmentData.description,
          type: appointmentData.type,
          start_date: appointmentData.startDate,
          start_time: startDateTime,
          end_time: endDateTime,
          location: appointmentData.location,
          organizer_id: user.id,
          status: 'scheduled',
          recurring: appointmentData.recurring,
          recurring_pattern: appointmentData.recurring_pattern,
          reminder_minutes: appointmentData.reminder,
          video_call: appointmentData.video_call,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (eventError) throw eventError;

      // Add attendees
      if (appointmentData.attendees.length > 0) {
        const attendeeRecords = appointmentData.attendees.map(attendeeId => ({
          event_id: event.id,
          user_id: attendeeId,
          status: 'invited',
          invited_at: new Date().toISOString()
        }));

        const { error: attendeesError } = await supabase
          .from('event_attendees')
          .insert(attendeeRecords);

        if (attendeesError) throw attendeesError;
      }

      alert('Appointment scheduled successfully!');
      setShowForm(false);
      setAppointmentData({
        title: '',
        description: '',
        type: 'meeting',
        startDate: selectedDate.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        location: 'conference_room_1',
        attendees: [],
        recurring: false,
        recurring_pattern: 'none',
        reminder: 15,
        video_call: false
      });

      fetchAppointments();
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      alert('Error: ' + error.message);
    }
  };

  const appointmentTypes = [
    { value: 'meeting', label: 'Team Meeting', color: '#3B82F6' },
    { value: 'appointment', label: 'Client Appointment', color: '#10B981' },
    { value: 'interview', label: 'Interview', color: '#8B5CF6' },
    { value: 'training', label: 'Training', color: '#F59E0B' },
    { value: 'review', label: 'Performance Review', color: '#EF4444' },
    { value: 'other', label: 'Other', color: '#6B7280' }
  ];

  const locations = [
    { value: 'conference_room_1', label: 'Conference Room 1' },
    { value: 'conference_room_2', label: 'Conference Room 2' },
    { value: 'executive_boardroom', label: 'Executive Boardroom' },
    { value: 'training_room', label: 'Training Room' },
    { value: 'zoom_meeting', label: 'Zoom Meeting' },
    { value: 'teams_meeting', label: 'Microsoft Teams' },
    { value: 'google_meet', label: 'Google Meet' },
    { value: 'other', label: 'Other Location' }
  ];

  return (
    <div className="scheduling-container">
      <div className="scheduling-header">
        <h2><Calendar size={24} /> Appointment Scheduler</h2>
        <div className="scheduling-actions">
          <div className="filter-tabs">
            {['all', 'today', 'upcoming', 'past'].map(tab => (
              <button
                key={tab}
                className={`filter-tab ${filter === tab ? 'active' : ''}`}
                onClick={() => setFilter(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus size={18} /> Schedule New
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="calendar-view">
        <div className="calendar-header">
          <button 
            onClick={() => onDateChange(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
            className="nav-btn"
          >
            ← Previous
          </button>
          
          <div className="current-date">
            <h3>{selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</h3>
          </div>
          
          <button 
            onClick={() => onDateChange(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
            className="nav-btn"
          >
            Next →
          </button>
        </div>

        {/* Time Slots */}
        <div className="time-slots-grid">
          {Array.from({ length: 12 }, (_, i) => i + 8).map(hour => {
            const hourAppointments = appointments.filter(apt => {
              const aptHour = new Date(apt.start_time).getHours();
              return aptHour === hour;
            });

            return (
              <div key={hour} className="time-slot-row">
                <div className="time-label">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="appointments-column">
                  {hourAppointments.map(apt => (
                    <div 
                      key={apt.id} 
                      className="appointment-block"
                      style={{ 
                        backgroundColor: appointmentTypes.find(t => t.value === apt.type)?.color || '#3B82F6',
                        height: `${(new Date(apt.end_time).getTime() - new Date(apt.start_time).getTime()) / (1000 * 60 * 60) * 60}px`
                      }}
                    >
                      <div className="appointment-title">{apt.title}</div>
                      <div className="appointment-time">
                        {new Date(apt.start_time).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                      {apt.video_call && <Video size={12} />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Appointment Form Modal */}
      {showForm && (
        <div className="booking-modal-overlay">
          <div className="booking-modal wide-modal">
            <div className="modal-header">
              <h3>Schedule New Appointment</h3>
              <button onClick={() => setShowForm(false)} className="close-btn">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={appointmentData.title}
                    onChange={(e) => setAppointmentData({...appointmentData, title: e.target.value})}
                    placeholder="Team sync, Client meeting, etc."
                  />
                </div>
                
                <div className="form-group">
                  <label>Type</label>
                  <div className="type-buttons">
                    {appointmentTypes.map(type => (
                      <button
                        key={type.value}
                        type="button"
                        className={`type-btn ${appointmentData.type === type.value ? 'selected' : ''}`}
                        onClick={() => setAppointmentData({...appointmentData, type: type.value})}
                        style={{ '--type-color': type.color }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={appointmentData.startDate}
                    onChange={(e) => setAppointmentData({...appointmentData, startDate: e.target.value})}
                  />
                </div>
                
                <div className="form-group">
                  <label>Time</label>
                  <div className="time-inputs">
                    <select
                      value={appointmentData.startTime}
                      onChange={(e) => setAppointmentData({...appointmentData, startTime: e.target.value})}
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        ['00', '30'].map(minute => {
                          const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                          return (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          );
                        })
                      )).flat()}
                    </select>
                    <span>to</span>
                    <select
                      value={appointmentData.endTime}
                      onChange={(e) => setAppointmentData({...appointmentData, endTime: e.target.value})}
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                        ['00', '30'].map(minute => {
                          const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                          return (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          );
                        })
                      )).flat()}
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Location</label>
                  <select
                    value={appointmentData.location}
                    onChange={(e) => setAppointmentData({...appointmentData, location: e.target.value})}
                  >
                    {locations.map(loc => (
                      <option key={loc.value} value={loc.value}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group full-width">
                  <label>Attendees</label>
                  <div className="attendees-selector">
                    {teams.map(person => (
                      <label key={person.id} className="attendee-checkbox">
                        <input
                          type="checkbox"
                          checked={appointmentData.attendees.includes(person.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAppointmentData({
                                ...appointmentData,
                                attendees: [...appointmentData.attendees, person.id]
                              });
                            } else {
                              setAppointmentData({
                                ...appointmentData,
                                attendees: appointmentData.attendees.filter(id => id !== person.id)
                              });
                            }
                          }}
                        />
                        <div className="attendee-info">
                          <strong>{person.full_name}</strong>
                          <small>{person.position} • {person.department}</small>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={appointmentData.description}
                    onChange={(e) => setAppointmentData({...appointmentData, description: e.target.value})}
                    placeholder="Meeting agenda, discussion points, objectives..."
                    rows="4"
                  />
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={appointmentData.recurring}
                      onChange={(e) => setAppointmentData({...appointmentData, recurring: e.target.checked})}
                    />
                    <Repeat size={16} /> Recurring
                  </label>
                  
                  {appointmentData.recurring && (
                    <select
                      value={appointmentData.recurring_pattern}
                      onChange={(e) => setAppointmentData({...appointmentData, recurring_pattern: e.target.value})}
                    >
                      <option value="none">No Repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  )}
                </div>
                
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={appointmentData.video_call}
                      onChange={(e) => setAppointmentData({...appointmentData, video_call: e.target.checked})}
                    />
                    <Video size={16} /> Video Call
                  </label>
                </div>
                
                <div className="form-group">
                  <label>Reminder</label>
                  <select
                    value={appointmentData.reminder}
                    onChange={(e) => setAppointmentData({...appointmentData, reminder: parseInt(e.target.value)})}
                  >
                    <option value="0">No reminder</option>
                    <option value="5">5 minutes before</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="1440">1 day before</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleScheduleAppointment}
                className="btn-primary"
              >
                <Calendar size={18} /> Schedule Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Appointments List */}
      <div className="appointments-list">
        <h3>Upcoming Appointments</h3>
        {appointments.slice(0, 5).map(apt => (
          <div key={apt.id} className="appointment-card">
            <div 
              className="appointment-type-indicator"
              style={{ backgroundColor: appointmentTypes.find(t => t.value === apt.type)?.color || '#3B82F6' }}
            />
            
            <div className="appointment-content">
              <div className="appointment-header">
                <h4>{apt.title}</h4>
                <span className="appointment-status">{apt.status}</span>
              </div>
              
              <div className="appointment-details">
                <div className="detail-item">
                  <Clock size={14} />
                  <span>
                    {new Date(apt.start_time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {new Date(apt.end_time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                
                <div className="detail-item">
                  <MapPin size={14} />
                  <span>
                    {locations.find(l => l.value === apt.location)?.label || apt.location}
                  </span>
                </div>
                
                {apt.video_call && (
                  <div className="detail-item">
                    <Video size={14} />
                    <span>Video call available</span>
                  </div>
                )}
                
                <div className="detail-item">
                  <Users size={14} />
                  <span>{apt.attendees?.length || 0} attendees</span>
                </div>
              </div>
              
              {apt.description && (
                <p className="appointment-description">{apt.description}</p>
              )}
            </div>
            
            <div className="appointment-actions">
              {apt.video_call && (
                <button className="action-btn join">
                  <Video size={16} /> Join
                </button>
              )}
              <button className="action-btn edit">Edit</button>
              <button className="action-btn cancel">Cancel</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppointmentScheduler;