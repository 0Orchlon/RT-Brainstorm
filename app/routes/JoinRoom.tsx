import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supanbase';

export default function JoinRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    // Room-ийн нэр ачаалах
    supabase
      .from('t_rooms')
      .select('rname')
      .eq('rid', roomId)
      .single()
      .then(({ data }) => {
        if (data) setRoomName(data.rname);
      })
      .finally(() => setLoading(false));
  }, [roomId]);

  const handleJoin = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      navigate('/login');
      return;
    }

    const { data: existing } = await supabase
      .from('t_rooms_users')
      .select('*')
      .eq('rid', roomId)
      .eq('uid', user.id);

    if (existing && existing.length > 0) {
      alert('Та энэ room-д аль хэдийн орсон байна!');
      navigate(`/room/${roomId}`);
      return;
    }

    // Room-д нэмэх
    const { error } = await supabase
      .from('t_rooms_users')    
      .insert([{ rid: roomId, uid: user.id, lastchat: new Date().toISOString() }]);

    if (error) {
      alert('Room-д нэмэхэд алдаа гарлаа: ' + error.message);
      return;
    }

    alert(`Room "${roomName}"-д амжилттай орлоо!`);
    navigate(`/room/${roomId}`);
  };

  return (
    <div
      style={{
        maxWidth: 500,
        margin: '5rem auto',
        background: '#fff',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 0 15px rgba(0,0,0,0.2)',
        textAlign: 'center'
      }}
    >
      {loading ? (
        <h2>Room ачаалж байна...</h2>
      ) : (
        <>
          <h2 style={{ marginBottom: '1rem' }}>
            Room “{roomName}”-д орох уу?
          </h2>
          <button
            onClick={handleJoin}
            style={{
              backgroundColor: '#3d5afe',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Тийм, орох
          </button>
          <br />
          <br />
          <button
            onClick={() => navigate('/')}
            style={{
              backgroundColor: '#aaa',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Үгүй, буцах
          </button>
        </>
      )}
    </div>
  );
}
