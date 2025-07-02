import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supanbase';
import Navbar from './navbar';

interface Message {
  chid: number;
  chtext: string;
  chdate: string;
  uid: string;
}

interface User {
  uid: string;
  uname?: string;
}

export default function Chat() {
  const { rid } = useParams();
  const [roomName, setRoomName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const AI_BOT_UID = "4f3a9c1e-2b1d-4f9a-6b2c-7d8e9f3b6a1d";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!rid) return;

    const init = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        navigate('/login');
        return;
      }

      const user = userData.user;

      const { data: roomUsers, error } = await supabase
        .from('t_rooms_users')
        .select('uid')
        .eq('rid', rid)
        .eq('uid', user.id);

      if (error) {
        console.error(error);
        navigate('/');
        return;
      }

      if (!roomUsers || roomUsers.length === 0) {
        alert('Та энэ өрөөнд орох эрхгүй байна.');
        navigate('/');
        return;
      }

      setUserId(user.id);

      supabase
        .from('t_rooms')
        .select('rname')
        .eq('rid', rid)
        .single()
        .then(({ data }) => {
          if (data) setRoomName(data.rname);
        });

      fetchRoomUsers();
      fetchMessages();

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
            const msg = payload.new as Message;
            setMessages((prev) => [...prev, msg]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    init();
  }, [rid]);

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('t_chats')
      .select('*')
      .eq('rid', rid)
      .order('chdate', { ascending: true });

    if (error) console.error(error);
    if (data) setMessages(data);
  }

  async function fetchRoomUsers() {
    if (!rid) return;

    const { data: roomUsers, error } = await supabase
      .from('t_rooms_users')
      .select('uid')
      .eq('rid', rid);

    if (error) {
      console.error('Room хэрэглэгчдийг авахад алдаа:', error.message);
      return;
    }

    if (roomUsers && roomUsers.length > 0) {
      const userIds = roomUsers.map((ru) => ru.uid);

      const { data: usersData, error: usersError } = await supabase
        .from('t_users')
        .select('uid, uname')
        .in('uid', userIds);

      if (usersError) {
        console.error('t_users авахад алдаа:', usersError.message);
        return;
      }

      setUsers(usersData || []);
    } else {
      setUsers([]);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !userId || !rid) return;

    // Хэрвээ AI команд уу?
    if (newMessage.trim().startsWith("!aibot")) {
      const prompt = newMessage.trim().replace("!aibot", "").trim();

      if (!prompt) {
        alert("AI-д илгээх текст оруулна уу.");
        return;
      }

      // Эхлээд хэрэглэгчийн мессежийг хадгална
      const { error: userMsgError } = await supabase.from('t_chats').insert([
        {
          chtext: newMessage.trim(),
          chdate: new Date().toISOString(),
          uid: userId,
          rid,
        },
      ]);

      if (userMsgError) {
        alert("AI асуултыг хадгалж чадсангүй: " + userMsgError.message);
        return;
      }

      setNewMessage('');

      // AI-тай холбогдоно
      setAiLoading(true);
      const aiResponse = await askGemini(prompt);
      setAiLoading(false);

      if (aiResponse) {
        // AI-ийн хариуг бас Supabase руу хадгална
        const { error: aiError } = await supabase.from('t_chats').insert([
          {
            chtext: aiResponse,
            chdate: new Date().toISOString(),
            uid: AI_BOT_UID,
            rid,
          },
        ]);

        if (aiError) {
          alert("AI хариу хадгалахад алдаа: " + aiError.message);
        }
      }

      return;
    }

    // Хэрвээ энгийн мессеж бол
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

  async function askGemini(prompt: string) {
    setAiError(null);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=AIzaSyBGbgEtONplq47P1ypu30788etWwxNw8hw`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt + "255 character аас ихгүй гээр хариул" }] }],
          }),
        }
      );

      const data = await res.json();
      console.log("AI response:", data);
      if (data.error) {
        setAiError(data.error.message);
        return null;
      }

      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "AI хариу олдсонгүй.";

      return text;
    } catch (error: any) {
      setAiError("Сүлжээний алдаа: " + error.message);
      return null;
    }
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
      <Navbar
        roomName={roomName}
        roomId={rid}
        userId={userId}
        onAddUserClick={() => alert('Хүн нэмэхийг энд хэрэгжүүлнэ үү')}
        onUserClick={(uid) => alert('User clicked: ' + uid)}
        users={users}
      />

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
          const isAI = msg.uid === AI_BOT_UID;
          const isMine = msg.uid === userId;

          let senderName = "Гарсан хэрэглэгч";
          if (isAI) senderName = "Gemini AI";
          else {
            const sender = users.find((u) => u.uid === msg.uid);
            if (sender?.uname) senderName = sender.uname;
          }

          return (
            <div
              key={msg.chid}
              style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                backgroundColor: isAI
                  ? '#34a853'
                  : isMine
                  ? '#3d5afe'
                  : '#ffffff',
                color: isAI || isMine ? '#fff' : '#333',
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
                  style={{
                    fontSize: '13px',
                    color: '#888',
                    marginBottom: '4px',
                    fontWeight: 600,
                  }}
                >
                  {senderName}
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

      {aiError && (
        <div style={{ color: 'red', padding: '0.5rem', backgroundColor: '#fff' }}>
          {aiError}
        </div>
      )}

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
            color: '#ccc',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={aiLoading}
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
          {aiLoading ? 'AI бичиж байна...' : 'Илгээх'}
        </button>
      </div>
    </div>
  );
}
