import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supanbase';

type Room = {
  rid: string;
  rname: string;
};

export default function Sidebar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const { rid } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchRooms(user.id);
      } else {
        navigate('/login');
      }
    });
  }, []);

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

  async function addRoom() {
    if (!newRoomName.trim() || !userId) return;

    // Шинэ room үүсгэх
    const { data: room, error } = await supabase
      .from('t_rooms')
      .insert([{ rname: newRoomName.trim() }])
      .select()
      .single();

    if (error || !room) {
      alert('Room нэмэхэд алдаа гарлаа: ' + error?.message);
      return;
    }

    // Холбоос хүснэгтэд хэрэглэгч болон room холбоход
    await supabase.from('t_rooms_users').insert([
      {
        rid: room.rid,
        uid: userId,
        lastchat: new Date().toISOString(),
      },
    ]);

    setNewRoomName('');
    fetchRooms(userId);
  }

  return (
    <div
      style={{
        width: '260px',
        backgroundColor: '#1e1e2f',
        padding: '1.5rem 1rem',
        borderRight: '1px solid #2d2d3a',
        height: '100vh',
        overflowY: 'auto',
        color: '#fff',
        boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <h2 style={{ marginBottom: '1.5rem', fontSize: '18px', fontWeight: 600 }}>
        🗂 Миний Room-ууд
      </h2>



      {/* Room list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {rooms.map((room) => (
          <div
            key={room.rid}
            onClick={() => navigate(`/room/${room.rid}`)}
            style={{
              padding: '12px 16px',
              marginBottom: '10px',
              borderRadius: '8px',
              backgroundColor: room.rid === rid ? '#3d5afe' : '#2c2c3e',
              color: room.rid === rid ? '#fff' : '#d0d0ff',
              fontWeight: room.rid === rid ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = room.rid === rid ? '#3d5afe' : '#383850';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = room.rid === rid ? '#3d5afe' : '#2c2c3e';
            }}
          >
            {room.rname}
          </div>
        ))}
      </div>
            {/* Room нэмэх хэсэг */}
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Шинэ room-н нэр"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            marginBottom: '8px',
            fontSize: '14px',
          }}
        />
        <button
          onClick={addRoom}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#3d5afe',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2f43d6')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3d5afe')}
        >
          Room нэмэх
        </button>
      </div>
    </div>
  );
}
    