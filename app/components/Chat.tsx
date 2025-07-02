// src/components/Chat.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supanbase'; // Таны supabase client-ийг зөв импортлох

interface Message {
  chid: number;
  chtext: string;
  chdate: string;
  uid: string;
}

export default function Chat() {
  const { rid } = useParams();
  const [roomName, setRoomName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Доошоо автоматаар скролл хийх
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!rid) return;

    // Хэрэглэгчийн ID-г авах
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });

    // Room-н нэрийг авах
    supabase
      .from('t_rooms')
      .select('rname')
      .eq('rid', rid)
      .single()
      .then(({ data }) => {
        if (data) setRoomName(data.rname);
      });

    // Одоогийн мессежүүдийг татах
    fetchMessages();

    // Realtime subscribe хийх (room тус бүрт channel үүсгэх)
    const channel = supabase
      .channel(`room_chats_${rid}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 't_chats',
          filter: `rid=eq.${rid}`,
        },
        (payload) => {
          console.log('Realtime message ирлээ:', payload.new);
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime subscribe амжилттай:', rid);
        }
      });

    // Cleanup: channel-ийг устгах
    return () => {
      supabase.removeChannel(channel);
    };
  }, [rid]);

  // Мессежүүдийг татах функц
  async function fetchMessages() {
    const { data, error } = await supabase
      .from('t_chats')
      .select('*')
      .eq('rid', rid)
      .order('chdate', { ascending: true });

    if (error) {
      console.error('Мессеж татахад алдаа:', error.message);
    }
    if (data) setMessages(data);
  }

  // Мессеж илгээх функц
  async function sendMessage() {
    if (!newMessage.trim() || !userId || !rid) return;

    const { error } = await supabase.from('t_chats').insert([
      {
        chtext: newMessage.trim(),
        chdate: new Date().toISOString(),
        uid: userId,
        rid,
      },
    ]);

    if (error) {
      alert('Мессеж илгээхэд алдаа гарлаа: ' + error.message);
      return;
    }

    setNewMessage('');
  }

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f4f6fb',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.5rem',
          backgroundColor: '#2c2625',
          borderBottom: '1px solid #ddd',
          fontSize: '18px',
          fontWeight: 600,
          color: '#fff',
        }}
      >
        💬 Room: {roomName}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          padding: '1.5rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          backgroundColor: '#433c3b',
        }}
      >
        {messages.map((msg) => {
          const isMine = msg.uid === userId;
          return (
            <div
              key={msg.chid}
              style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                backgroundColor: isMine ? '#3d5afe' : '#ffffff',
                color: isMine ? '#fff' : '#333',
                padding: '12px 16px',
                borderRadius: '18px',
                maxWidth: '70%',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                position: 'relative',
                wordBreak: 'break-word',
              }}
            >
              {!isMine && (
                <div
                  style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}
                >
                  {msg.uid}
                </div>
              )}
              <div>{msg.chtext}</div>
              <div
                style={{
                  fontSize: '11px',
                  color: isMine ? '#d0dfff' : '#999',
                  marginTop: '6px',
                  textAlign: 'right',
                }}
              >
                {new Date(msg.chdate).toLocaleTimeString()}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <div
        style={{
          padding: '1rem',
          borderTop: '1px solid #ddd',
          backgroundColor: '#2c2625',
          display: 'flex',
          gap: '10px',
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Мессеж бичих..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          style={{
            flex: 1,
            padding: '12px',
            borderRadius: '20px',
            border: '1px solid #ccc',
            outline: 'none',
            fontSize: '15px',
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: '12px 20px',
            backgroundColor: '#3d5afe',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Илгээх
        </button>
      </div>
    </div>
  );
}
