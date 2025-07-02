import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { supabase } from '../supanbase';
import Poll from './Poll';

interface Message {
  chid: number;
  chtext: string;
  chdate: string;
  uid: string;
}

interface PollOption {
  option_id: number;
  option_text: string;
  vote_count: number;
}

interface Poll {
  poll_id: number;
  question: string;
  options: PollOption[];
  created_by: string;
  created_at: string;
  room_id: string;
}

export default function Chat() {
  const { rid } = useParams();
  const [roomName, setRoomName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
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

      setUserId(userData.user.id);

      supabase
        .from('t_rooms')
        .select('rname')
        .eq('rid', rid)
        .single()
        .then(({ data }) => {
          if (data) setRoomName(data.rname);
        });

      fetchMessages();
      fetchPolls();

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
            setMessages((prev) => [...prev, payload.new as Message]);
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

    if (error) console.error('Error:', error.message);
    if (data) setMessages(data);
  }

  async function fetchPolls() {
    const { data, error } = await supabase
      .from('t_polls')
      .select('*')
      .eq('room_id', rid)
      .order('created_at', { ascending: true });

    if (error) console.error('Reminder error:', error.message);
    if (data) setPolls(data);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !userId || !rid) return;

    if (newMessage.trim().startsWith('!aipoll')) {
      const prompt = newMessage.trim().replace('!aipoll', '').trim();
      if (!prompt) {
        alert('AI-д илгээх текст оруулна уу.');
        return;
      }

      const { error: userMsgError } = await supabase.from('t_chats').insert([
        {
          chtext: newMessage.trim(),
          chdate: new Date().toISOString(),
          uid: userId,
          rid,
        },
      ]);

      if (userMsgError) {
        alert('AI асуултыг хадгалж чадсангүй: ' + userMsgError.message);
        return;
      }

      setNewMessage('');
      setAiLoading(true);
      const aiPoll = await generateAIPoll(prompt);
      setAiLoading(false);

      if (aiPoll) {
        const { error: pollError } = await supabase.from('t_polls').insert([
          {
            question: aiPoll.question,
            options: aiPoll.options,
            created_by: AI_BOT_UID,
            created_at: new Date().toISOString(),
            room_id: rid,
          },
        ]);

        if (pollError) {
          alert('Санал асуулга хадгалахад алдаа: ' + pollError.message);
          return;
        }

        setPolls([...polls, aiPoll]);
        const { error: aiError } = await supabase.from('t_chats').insert([
          {
            chtext: `Санал асуулга: ${aiPoll.question}`,
            chdate: new Date().toISOString(),
            uid: AI_BOT_UID,
            rid,
          },
        ]);

        if (aiError) {
          alert('AI хариу хадгалахад алдаа: ' + aiError.message);
        }
      }
      return;
    }

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

  async function generateAIPoll(prompt: string) {
    setAiError(null);
    setAiLoading(true);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=AIzaSyBGbgEtONplq47P1ypu30788etWwxNw8hw`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Generate a poll question with 3 options based on this prompt: "${prompt}". Return in JSON format: {"question": "...", "options": ["...", "...", "..."]}. Keep each option under 50 characters.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      const data = await res.json();
      if (data.error) {
        setAiError(data.error.message);
        setAiLoading(false);
        return null;
      }

      let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        setAiError('AI хариу олдсонгүй.');
        setAiLoading(false);
        return null;
      }

      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

      let aiPoll;
      try {
        aiPoll = JSON.parse(responseText);
      } catch (parseError: any) {
        setAiError('JSON хөрвүүлэхэд алдаа: ' + parseError.message);
        setAiLoading(false);
        return null;
      }

      setAiLoading(false);

      return {
        poll_id: polls.length + 1,
        question: aiPoll.question,
        options: aiPoll.options.map((opt: string, index: number) => ({
          option_id: index + 1,
          option_text: opt,
          vote_count: 0,
        })),
        created_by: AI_BOT_UID,
        created_at: new Date().toISOString(),
        room_id: rid || '',
      };
    } catch (error: any) {
      setAiError('Сүлжээний алдаа: ' + error.message);
      setAiLoading(false);
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
                  {msg.uid === AI_BOT_UID ? 'Gemini AI' : msg.uid}
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
        <Poll userId={userId} roomId={rid} polls={polls} setPolls={setPolls} />
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
          placeholder="create pol like !aipoll <idea>"
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
          {aiLoading ? 'AI is writing...' : 'send'}
        </button>
      </div>
    </div>
  );
}