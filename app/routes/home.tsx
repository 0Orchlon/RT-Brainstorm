import React, { useEffect, useState } from 'react';
import { supabase } from '../supanbase'; // анхаар: 'supanbase' биш!
import { useNavigate } from 'react-router-dom';
import RoomCard from '../components/roomCard'; // RoomCard component

type Room = {
  rid: string;
  rname: string;
};

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Хэрэглэгчийг шалгах ба room-уудыг авах
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate('/login');
      } else {
        setUserId(user.id);
        fetchRooms(user.id);
      }
    });
  }, []);

  // Room жагсаалт татах
  async function fetchRooms(uid: string) {
    const { data: roomUsers } = await supabase
      .from('t_rooms_users')
      .select('rid')
      .eq('uid', uid);

    const roomIds = roomUsers?.map((ru) => ru.rid);
    const { data: roomsData } = await supabase
      .from('t_rooms')
      .select('rid, rname')
      .in('rid', roomIds || []);

    setRooms(roomsData || []);
  }

  // Room нэмэх
  async function addRoom() {
    if (!newRoomName.trim() || !userId) return;

    const { data: room, error } = await supabase
      .from('t_rooms')
      .insert([{ rname: newRoomName }])
      .select()
      .single();

    if (error || !room) {
      alert('Room нэмэхэд алдаа гарлаа: ' + error?.message);
      return;
    }

    await supabase
      .from('t_rooms_users')
      .insert([{ rid: room.rid, uid: userId, lastchat: new Date().toISOString() }]);

    setNewRoomName('');
    fetchRooms(userId);
  }

  // Гарах функц
  async function logout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: '1rem' }}>
      {/* Header with logout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Миний Room-ууд</h2>
        <button
          onClick={logout}
          style={{
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Гарах
        </button>
      </div>

      {/* Room list */}
      {rooms.map((room) => (
        <RoomCard key={room.rid} room={room} />
      ))}

      {/* Add room form */}
      <div style={{ marginTop: '1rem' }}>
        <input
          type="text"
          placeholder="Шинэ room"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc', width: '70%' }}
        />
        <button
          onClick={addRoom}
          style={{
            marginLeft: '8px',
            padding: '8px 12px',
            border: 'none',
            backgroundColor: '#3498db',
            color: '#fff',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Room нэмэх
        </button>
      </div>
    </div>
  );
}
