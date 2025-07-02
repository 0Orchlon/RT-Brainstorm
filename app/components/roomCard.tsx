// src/components/RoomCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

type Room = {
  rid: string;
  rname: string;
};

export default function RoomCard({ room }: { room: Room }) {
  const navigate = useNavigate();

  const goToRoom = () => {
    navigate(`/room/${room.rid}`);
  };

  return (
    <div
      onClick={goToRoom}
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
    >
      <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 600, color: '#333' }}>
        {room.rname}
      </h3>
      <p style={{ margin: 0, fontSize: '14px', color: '#777' }}>
        Room ID: {room.rid}
      </p>
    </div>
  );
}
