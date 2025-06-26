import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '~/lib/supabase';

const Joinz: React.FC = () => {
  const { rid } = useParams<{ rid: string }>();
  const [user, setUser] = useState<any>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyJoined, setAlreadyJoined] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        alert('Please log in to join a room.');
        navigate('/login');
        return;
      }

      setUser(user);

      // Get room info
      const { data: roomData, error: roomError } = await supabase
        .from('t_rooms')
        .select('rname')
        .eq('rid', rid)
        .single();

      if (roomError || !roomData) {
        alert('Room not found.');
        navigate('/');
        return;
      }

      setRoomName(roomData.rname);

      // Check if user already in room
      const { data: joinData, error: joinError } = await supabase
        .from('t_rooms_users')
        .select('ruid')
        .eq('rid', rid)
        .eq('uid', user.id)
        .maybeSingle();

      if (joinError) {
        console.error('Join check failed:', joinError);
      } else if (joinData) {
        setAlreadyJoined(true);
      }

      setLoading(false);
    };

    load();
  }, [rid, navigate]);

  const handleJoin = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('t_rooms_users')
      .insert({ rid, uid: user.id, lastchat: null });

    if (error) {
      alert('Error joining the room: ' + error.message);
    } else {
      alert('Joined successfully!');
      navigate(`/room/${rid}`);
    }
  };

  const handleDecline = () => {
    navigate('/');
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow text-center">
      <h1 className="text-2xl font-bold text-green-700">Room: {roomName}</h1>
      {alreadyJoined ? (
        <div className="mt-4 text-blue-600 font-medium">You’ve already joined this room.</div>
      ) : (
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handleJoin}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded"
          >
            Join
          </button>
          <button
            onClick={handleDecline}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
};

export default Joinz;
