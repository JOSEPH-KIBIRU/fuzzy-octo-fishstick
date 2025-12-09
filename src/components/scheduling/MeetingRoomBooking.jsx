// components/scheduling/MeetingRoomBooking.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { 
  Building2, 
  Users, 
  Clock, 
  Video,
  Wifi,
  Coffee,
  Tv,
  Calendar,

} from 'lucide-react';

const MeetingRoomBooking = ({ selectedDate, onDateChange, user }) => {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [timeSlots, setTimeSlots] = useState([]);

  const [bookingData, setBookingData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    attendees: [],
    requirements: []
  });

  // Memoize fetchBookings to prevent infinite re-renders
  const fetchBookings = useCallback(async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('meeting_room_bookings')
        .select(`
          *,
          meeting_rooms (name),
          profiles (full_name, email)
        `)
        .gte('start_time', `${dateStr}T00:00:00`)
        .lte('start_time', `${dateStr}T23:59:59`)
        .order('start_time');

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('meeting_rooms')
          .select('*')
          .eq('status', 'available')
          .order('name');

        if (error) throw error;
        setRooms(data || []);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };

    const generateTimeSlots = () => {
      const slots = [];
      for (let hour = 8; hour <= 18; hour++) {
        slots.push(`${hour.toString().padStart(2, '0')}:00`);
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      setTimeSlots(slots);
    };

    fetchRooms();
    fetchBookings();
    generateTimeSlots();
  }, [selectedDate, fetchBookings]);

  const checkRoomAvailability = (roomId, startTime, endTime) => {
    const roomBookings = bookings.filter(b => b.room_id === roomId);
    
    return !roomBookings.some(booking => {
      const bookingStart = new Date(booking.start_time);
      const bookingEnd = new Date(booking.end_time);
      const newStart = new Date(`${selectedDate.toISOString().split('T')[0]}T${startTime}`);
      const newEnd = new Date(`${selectedDate.toISOString().split('T')[0]}T${endTime}`);
      
      return (newStart < bookingEnd && newEnd > bookingStart);
    });
  };

  const handleBookRoom = async () => {
    try {
      if (!bookingData.title || !bookingData.startTime || !bookingData.endTime) {
        alert('Please fill all required fields');
        return;
      }

      const isAvailable = checkRoomAvailability(
        selectedRoom.id, 
        bookingData.startTime, 
        bookingData.endTime
      );

      if (!isAvailable) {
        alert('Room is not available at selected time');
        return;
      }

      const startDateTime = `${selectedDate.toISOString().split('T')[0]}T${bookingData.startTime}`;
      const endDateTime = `${selectedDate.toISOString().split('T')[0]}T${bookingData.endTime}`;

      const { error } = await supabase
        .from('meeting_room_bookings')
        .insert([{
          room_id: selectedRoom.id,
          booked_by: user.id,
          title: bookingData.title,
          description: bookingData.description,
          start_time: startDateTime,
          end_time: endDateTime,
          attendees: bookingData.attendees,
          requirements: bookingData.requirements,
          status: 'confirmed',
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      alert('Room booked successfully!');
      setShowBookingForm(false);
      setSelectedRoom(null);
      setBookingData({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        attendees: [],
        requirements: []
      });
      
      fetchBookings();
    } catch (error) {
      console.error('Error booking room:', error);
      alert('Error booking room: ' + error.message);
    }
  };

  // Remove unused getRoomAvailability function or use it
  // Since it's not being used, we can comment it out or remove it
  /*
  const getRoomAvailability = (room) => {
    const todayBookings = bookings.filter(b => b.room_id === room.id);
    return room.capacity - todayBookings.length;
  };
  */

  // Loading state component
  if (loading && rooms.length === 0) {
    return (
      <div className="scheduling-container">
        <div className="scheduling-header">
          <h2><Building2 size={24} /> Meeting Room Booking</h2>
          <div className="date-selector">
            <Calendar size={20} />
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => onDateChange(new Date(e.target.value))}
            />
          </div>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading meeting rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scheduling-container">
      <div className="scheduling-header">
        <h2><Building2 size={24} /> Meeting Room Booking</h2>
        <div className="date-selector">
          <Calendar size={20} />
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => onDateChange(new Date(e.target.value))}
          />
        </div>
      </div>

      {/* Room Selection Grid */}
      <div className="rooms-grid">
        {rooms.map(room => (
          <div 
            key={room.id} 
            className={`room-card ${selectedRoom?.id === room.id ? 'selected' : ''}`}
            onClick={() => {
              setSelectedRoom(room);
              setShowBookingForm(true);
            }}
          >
            <div className="room-header">
              <h3>{room.name}</h3>
              <span className="room-status available">Available</span>
            </div>
            
            <div className="room-details">
              <div className="room-features">
                <span><Users size={14} /> {room.capacity} seats</span>
                {room.amenities?.includes('projector') && <span><Tv size={14} /> Projector</span>}
                {room.amenities?.includes('wifi') && <span><Wifi size={14} /> WiFi</span>}
                {room.amenities?.includes('coffee') && <span><Coffee size={14} /> Coffee</span>}
                {room.amenities?.includes('video') && <span><Video size={14} /> VC</span>}
              </div>
              
              <div className="room-availability">
                <div className="availability-slots">
                  {timeSlots.slice(0, 4).map(slot => {
                    const isBooked = bookings.some(b => 
                      b.room_id === room.id && 
                      b.start_time.includes(slot)
                    );
                    
                    return (
                      <span 
                        key={slot} 
                        className={`time-slot ${isBooked ? 'booked' : 'available'}`}
                      >
                        {slot}
                      </span>
                    );
                  })}
                  {timeSlots.length > 4 && <span>+{timeSlots.length - 4} more</span>}
                </div>
              </div>
            </div>
            
            <button className="book-room-btn">
              <Clock size={16} /> Book Now
            </button>
          </div>
        ))}
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && selectedRoom && (
        <div className="booking-modal-overlay">
          <div className="booking-modal">
            <div className="modal-header">
              <h3>Book {selectedRoom.name}</h3>
              <button onClick={() => setShowBookingForm(false)} className="close-btn">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Meeting Title *</label>
                <input
                  type="text"
                  value={bookingData.title}
                  onChange={(e) => setBookingData({...bookingData, title: e.target.value})}
                  placeholder="Team meeting, Client presentation, etc."
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={bookingData.description}
                  onChange={(e) => setBookingData({...bookingData, description: e.target.value})}
                  placeholder="Meeting agenda, purpose..."
                  rows="3"
                />
              </div>
              
              <div className="time-selection">
                <div className="form-group">
                  <label>Start Time *</label>
                  <select
                    value={bookingData.startTime}
                    onChange={(e) => setBookingData({...bookingData, startTime: e.target.value})}
                  >
                    <option value="">Select start time</option>
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>End Time *</label>
                  <select
                    value={bookingData.endTime}
                    onChange={(e) => setBookingData({...bookingData, endTime: e.target.value})}
                  >
                    <option value="">Select end time</option>
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Additional Requirements</label>
                <div className="requirements-grid">
                  {['projector', 'whiteboard', 'catering', 'video_call', 'recording'].map(req => (
                    <label key={req} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={bookingData.requirements.includes(req)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBookingData({
                              ...bookingData,
                              requirements: [...bookingData.requirements, req]
                            });
                          } else {
                            setBookingData({
                              ...bookingData,
                              requirements: bookingData.requirements.filter(r => r !== req)
                            });
                          }
                        }}
                      />
                      <span className="checkbox-text">
                        {req.charAt(0).toUpperCase() + req.slice(1).replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                onClick={() => setShowBookingForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                onClick={handleBookRoom}
                className="btn-primary"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Today's Bookings */}
      <div className="todays-bookings">
        <h3><Calendar size={20} /> Today's Bookings</h3>
        {loading ? (
          <div className="loading-text">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <p>No bookings for today</p>
          </div>
        ) : (
          <div className="bookings-list">
            {bookings.map(booking => (
              <div key={booking.id} className="booking-item">
                <div className="booking-info">
                  <h4>{booking.title}</h4>
                  <p className="booking-room">
                    <Building2 size={14} /> {booking.meeting_rooms?.name}
                  </p>
                  <p className="booking-time">
                    <Clock size={14} /> {new Date(booking.start_time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })} - {new Date(booking.end_time).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                  <p className="booking-host">
                    Host: {booking.profiles?.full_name}
                  </p>
                </div>
                <span className={`booking-status ${booking.status}`}>
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingRoomBooking;