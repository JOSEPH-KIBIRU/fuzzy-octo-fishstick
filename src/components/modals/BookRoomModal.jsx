// components/modals/BookRoomModal.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { X, Building2, Users, Wifi, Tv, Coffee } from 'lucide-react';

const BookRoomModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    attendees: 1,
    requirements: []
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_rooms')
        .select('*')
        .eq('status', 'available')
        .order('name');

      if (error) throw error;
      setRooms(data || []);
      if (data && data.length > 0) {
        setSelectedRoom(data[0]);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRoom) {
      alert('Please select a room');
      return;
    }

    setLoading(true);

    try {
      const startDateTime = `${formData.date}T${formData.startTime}`;
      const endDateTime = `${formData.date}T${formData.endTime}`;

      const { error } = await supabase
        .from('meeting_room_bookings')
        .insert([{
          room_id: selectedRoom.id,
          title: formData.title,
          description: formData.description,
          start_time: startDateTime,
          end_time: endDateTime,
          attendees_count: formData.attendees,
          requirements: formData.requirements,
          status: 'confirmed',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      alert('Room booked successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error booking room:', error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const requirements = [
    { id: 'projector', label: 'Projector', icon: <Tv size={16} /> },
    { id: 'whiteboard', label: 'Whiteboard', icon: <span>📋</span> },
    { id: 'video_call', label: 'Video Conference', icon: <span>📹</span> },
    { id: 'wifi', label: 'High-speed WiFi', icon: <Wifi size={16} /> },
    { id: 'catering', label: 'Catering', icon: <Coffee size={16} /> },
    { id: 'recording', label: 'Recording', icon: <span>🎙️</span> }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-3xl">
        <div className="modal-header">
          <div className="modal-title">
            <Building2 size={24} />
            <h2>Book Meeting Room</h2>
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
                placeholder="Team sync, Client meeting..."
                required
              />
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
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
              <label>Number of Attendees</label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.attendees}
                onChange={(e) => setFormData({...formData, attendees: parseInt(e.target.value)})}
              />
            </div>

            <div className="form-group col-span-2">
              <label>Select Room</label>
              <div className="rooms-grid">
                {rooms.map(room => (
                  <div
                    key={room.id}
                    className={`room-option ${selectedRoom?.id === room.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRoom(room)}
                  >
                    <div className="room-option-header">
                      <h3>{room.name}</h3>
                      <span className="room-capacity">
                        <Users size={14} /> {room.capacity} seats
                      </span>
                    </div>
                    <div className="room-amenities">
                      {room.amenities?.includes('projector') && <span><Tv size={14} /> Projector</span>}
                      {room.amenities?.includes('wifi') && <span><Wifi size={14} /> WiFi</span>}
                      {room.amenities?.includes('video') && <span>📹 VC</span>}
                    </div>
                    <div className="room-status available">Available</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group col-span-2">
              <label>Additional Requirements</label>
              <div className="requirements-grid">
                {requirements.map(req => (
                  <label key={req.id} className="requirement-option">
                    <input
                      type="checkbox"
                      checked={formData.requirements.includes(req.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            requirements: [...formData.requirements, req.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            requirements: formData.requirements.filter(r => r !== req.id)
                          });
                        }
                      }}
                    />
                    <span className="requirement-label">
                      {req.icon} {req.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group col-span-2">
              <label>Meeting Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Meeting purpose, agenda..."
                rows="3"
              />
            </div>
          </div>
        </form>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
            {loading ? 'Booking...' : 'Book Room'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookRoomModal;