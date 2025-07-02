import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supanbase';
import Navbar from './navbar';
import Poll from './Poll';

interface Message {
  chid: number;
  chtext: string;
  chdate: string;
  uid: string;
  type: 'message';
}

interface User {
  uid: string;
  uname?: string;
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
  type: 'poll';
}

type ChatItem = Message | Poll;

export default function Chat() {
  const { rid } = useParams();
  const [roomName, setRoomName] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  const AI_BOT_UID = "4f3a9c1e-2b1d-4f9a-6b2c-7d8e9f3b6a1d";

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
      fetchPolls();

      const chatChannel = supabase
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
            setMessages((prev) => [...prev, { ...payload.new, type: 'message' } as Message]);
          }
        )
        .subscribe();

      const pollChannel = supabase
        .channel(`room_polls_${rid}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 't_polls',
            filter: `room_id=eq.${rid}`,
          },
          (payload) => {
            const newPoll = payload.new as Poll;
            setPolls((prev) => {
              if (prev.some((poll) => poll.poll_id === newPoll.poll_id)) {
                console.warn('Realtime subscription-д давхардсан poll_id:', newPoll.poll_id);
                return prev;
              }
              console.log('Шинэ poll нэмэгдлээ:', newPoll);
              return [...prev, { ...newPoll, type: 'poll', options: newPoll.options || [] }];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(chatChannel);
        supabase.removeChannel(pollChannel);
      };
    };

    init();
  }, [rid, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, polls]);

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('t_chats')
      .select('*')
      .eq('rid', rid)
      .order('chdate', { ascending: true });

    if (error) console.error('Мессеж татахад алдаа:', error.message);
    if (data) setMessages(data.map((msg) => ({ ...msg, type: 'message' } as Message)));
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

  async function fetchPolls() {
    const { data, error } = await supabase
      .from('t_polls')
      .select('*')
      .eq('room_id', rid)
      .order('created_at', { ascending: true });

    if (error) console.error('Санал асуулга татахад алдаа:', error.message);
    if (data) setPolls(data.map((poll) => ({ ...poll, type: 'poll' } as Poll)));
  }

  async function sendMessage() {
    if (!newMessage.trim() || !userId || !rid || isSubmitting) return;
    setIsSubmitting(true);

    try {
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
          const { data: insertedPoll, error: pollError } = await supabase
            .from('t_polls')
            .insert([
              {
                question: aiPoll.question,
                options: aiPoll.options,
                created_by: AI_BOT_UID,
                created_at: new Date().toISOString(),
                room_id: rid,
              },
            ])
            .select()
            .single();

          if (pollError) {
            alert('Санал асуулга хадгалахад алдаа: ' + pollError.message);
            return;
          }

          setPolls((prev) => {
            if (prev.some((poll) => poll.poll_id === insertedPoll.poll_id)) {
              console.warn('Давхардсан poll_id:', insertedPoll.poll_id);
              return prev;
            }
            return [...prev, { ...insertedPoll, type: 'poll' }];
          });

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

      if (newMessage.trim().startsWith('!aibot')) {
        const prompt = newMessage.trim().replace('!aibot', '').trim();
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
        const aiResponse = await askGemini(prompt);
        setAiLoading(false);

        if (aiResponse) {
          const { error: aiError } = await supabase.from('t_chats').insert([
            {
              chtext: aiResponse,
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
    } finally {
      setIsSubmitting(false);
    }
  }

  async function askGemini(prompt: string) {
    setAiError(null);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=AIzaSyBGbgEtONplq47P1ypu30788etWwxNw8hw`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt + ' 255 character аас ихгүй гээр хариул' }] }],
          }),
        }
      );

      const data = await res.json();
      if (data.error) {
        setAiError(data.error.message);
        return null;
      }

      const text =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'AI хариу олдсонгүй.';
      return text;
    } catch (error: any) {
      setAiError('Сүлжээний алдаа: ' + error.message);
      return null;
    }
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
        question: aiPoll.question,
        options: aiPoll.options.map((opt: string, index: number) => ({
          option_id: index + 1,
          option_text: opt,
          vote_count: 0,
        })),
        created_by: AI_BOT_UID,
        created_at: new Date().toISOString(),
        room_id: rid || '',
        type: 'poll',
      };
    } catch (error: any) {
      setAiError('Сүлжээний алдаа: ' + error.message);
      setAiLoading(false);
      return null;
    }
  }

  // Мессеж болон санал асуулгуудыг нэгтгэж, цагийн дарааллаар эрэмбэлэх (эхнээс төгсгөл хүртэл)
  const chatItems: ChatItem[] = [...messages, ...polls].sort((a, b) => {
    const dateA = new Date(a.type === 'message' ? a.chdate : a.created_at);
    const dateB = new Date(b.type === 'message' ? b.chdate : a.created_at);
    return dateA.getTime() - dateB.getTime(); // Хамгийн эртний дээд талд
  });

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
        {chatItems.map((item) => {
          if (item.type === 'message') {
            const msg = item as Message;
            const isAI = msg.uid === AI_BOT_UID;
            const isMine = msg.uid === userId;

            let senderName = 'Гарсан хэрэглэгч';
            if (isAI) senderName = 'Gemini AI';
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
          } else {
            const poll = item as Poll;
            return (
              <Poll
                key={poll.poll_id}
                userId={userId}
                roomId={rid}
                polls={[poll]}
                setPolls={setPolls}
              />
            );
          }
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
          placeholder="Мессеж бичих... (жишээ: !aipoll ямар бэлэг хүүхдэд өгөх вэ)"
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
          disabled={aiLoading || isSubmitting}
          style={{
            padding: '12px 20px',
            backgroundColor: aiLoading || isSubmitting ? '#ccc' : '#3d5afe',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: aiLoading || isSubmitting ? 'not-allowed' : 'pointer',
            fontWeight: 500,
          }}
        >
          {aiLoading ? 'AI бичиж байна...' : 'Илгээх'}
        </button>
      </div>
    </div>
  );
}
