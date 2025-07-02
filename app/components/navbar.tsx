import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supanbase'; 
import { AiFillHome } from "react-icons/ai";

interface NavbarProps {
  roomName: string;
  roomId: string | undefined;
  userId: string | null; 
  onAddUserClick: () => void;
  users: { uid: string; uname?: string }[];
}

export default function Navbar({
  roomName,
  roomId,
  onAddUserClick,
  users,
  userId, // Add userId prop to track current user
}: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleInviteCopy = () => {
    if (!roomId) return;
    const link = `${window.location.origin}/room/join/${roomId}`;
    navigator.clipboard.writeText(link);
    alert('Invite линк хуулагдлаа:\n' + link);
    setDropdownOpen(false);
  };

const leaveRoom = async () => {
  if (!roomId || !userId) return;

  // t_rooms_users-оос хэрэглэгчийг хасах
  const { error } = await supabase
    .from('t_rooms_users')
    .delete()
    .eq('rid', roomId)
    .eq('uid', userId);

  if (error) {
    console.error('Room-оос гарахад алдаа:', error.message);
    alert('Room-оос гарахад алдаа гарлаа: ' + error.message);
    return;
  }

  navigate('/');
};

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-[#2c2625] border-b border-gray-700 text-white">
      
      <button
        onClick={() => navigate('/')}>
      <AiFillHome />
      </button>
      <div className="text-lg font-semibold">💬 Өрөө: {roomName || 'Unknown'}</div>

      <div className="relative">
        <button
        
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="text-white text-2xl hover:text-gray-300 px-2"
        >
          ⋮
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
            <button
              onClick={handleInviteCopy}
              className="block w-full text-left px-4 py-3 hover:bg-gray-700 text-sm text-white"
            >
              🔗 Invite линк хуулах
            </button>

            <div className="px-4 py-2 border-t border-gray-600 text-gray-400 text-xs uppercase">
              Хэрэглэгчид
            </div>

            {users.length === 0 && (
              <div className="px-4 py-2 text-gray-500 text-sm">
                Хэрэглэгч алга
              </div>
            )}

            {users.map((user) => (
              <button
                key={user.uid}  
                // onClick={() => {
                //   if (roomId) navigate(`/room/join/${roomId}`);
                // }}
                className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-gray-300"
              >
                {user.uname || "Гарсан хэрэглэгч"}
              </button>
            ))}

            {/* 🚪 Гарах товч */}
            <button
              onClick={leaveRoom}
              className="block w-full text-left px-4 py-3 hover:bg-red-700 text-sm text-red-400 border-t border-gray-600"
            >
              🚪 Өрөөнөс Гарах
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
