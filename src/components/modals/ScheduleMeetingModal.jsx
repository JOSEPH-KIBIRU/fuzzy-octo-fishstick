// components/modals/ScheduleMeetingModal.jsx
import { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { X, Calendar, Video, Repeat } from 'lucide-react';

const ScheduleMeetingModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    location: 'conference_room_1',
    attendees: [],
    recurring: false,
    recurringPattern: 'none',
    reminder: 15,
    videoCall: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const startDateTime = `${formData.startDate}T${formData.startTime}`;
      const endDateTime = `${formData.startDate}T${formData.endTime}`;

      const { error } = await supabase
        .from('calendar_events')
        .insert([{
          title: formData.title,
          description: formData.description,
          type: 'meeting',
          start_date: formData.startDate,
          start_time: startDateTime,
          end_time: endDateTime,
          location: formData.location,
          status: 'scheduled',
          recurring: formData.recurring,
          recurring_pattern: formData.recurringPattern,
          reminder_minutes: formData.reminder,
          video_call: formData.videoCall,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      alert('Meeting scheduled successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const locations = [
    { value: 'conference_room_1', label: 'Conference Room 1' },
    { value: 'conference_room_2', label: 'Conference Room 2' },
    { value: 'executive_boardroom', label: 'Executive Boardroom' },
    { value: 'training_room', label: 'Training Room' },
    { value: 'zoom_meeting', label: 'Zoom Meeting' },
    { value: 'teams_meeting', label: 'Microsoft Teams' },
    { value: 'google_meet', label: 'Google Meet' }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-2xl">
        <div className="modal-header">
          <div className="modal-title">
            <Calendar size={24} />
            <h2>Schedule New Meeting</h2>
          </div>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Meeting Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Team meeting, Client presentation..."
                required
              />
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time *</label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              >
                {locations.map(loc => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.videoCall}
                  onChange={(e) => setFormData({...formData, videoCall: e.target.checked})}
                />
                <Video size={16} /> Include Video Call
              </label>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.recurring}
                  onChange={(e) => setFormData({...formData, recurring: e.target.checked})}
                />
                <Repeat size={16} /> Recurring Meeting
              </label>
              {formData.recurring && (
                <select
                  value={formData.recurringPattern}
                  onChange={(e) => setFormData({...formData, recurringPattern: e.target.value})}
                  className="mt-2"
                >
                  <option value="none">No Repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              )}
            </div>

            <div className="form-group col-span-2">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Meeting agenda, objectives..."
                rows="3"
              />
            </div>

            <div className="form-group">
              <label>Reminder</label>
              <select
                value={formData.reminder}
                onChange={(e) => setFormData({...formData, reminder: parseInt(e.target.value)})}
              >
                <option value="0">No reminder</option>
                <option value="5">5 minutes before</option>
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
              </select>
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
            {loading ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleMeetingModal;