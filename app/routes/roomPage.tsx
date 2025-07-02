// src/pages/RoomPage.tsx
import React from 'react';
import Sidebar from '../components/sidebar';
import Chat from '../components/chat';

export default function RoomPage() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar />
      <Chat />
    </div>
  );
}
