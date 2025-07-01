import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Sidebar from '~/routes/sidebar';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ChatMessage {
  chid?: number;
  chtext: string;
  chdate: string;
  uid: string;
  rid: string;
}

const ChatApp: React.FC = () => {
  const [rooms, setRooms] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [formData, setFormData] = useState<Omit<ChatMessage, 'uid' | 'chdate'>>({
    chtext: '',
    rid: '',
  });
  const [uid, setUid] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  // Get UID from local storage
  useEffect(() => {
    const savedUid = localStorage.getItem('uid');
    if (savedUid) {
      setUid(savedUid);
    } else {
      setMessage('User ID not found. Please login.');
    }
  }, []);

  // Load unique room list
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from('t_chats')
          .select('rid')
          .not('rid', 'is', null);

        if (error) throw error;

        const uniqueRooms = [...new Set(data.map(item => item.rid))];
        setRooms(uniqueRooms);
      } catch (error: any) {
        setMessage(`Error fetching rooms: ${error.message}`);
      }
    };

    fetchRooms();
  }, []);

  // Fetch messages when a room is selected
  useEffect(() => {
    if (!selectedRoom) return;

    const fetchMessages = async () => {
      setLoading(true);
      setMessage('');

      try {
        const { data, error } = await supabase
          .from('t_chats')
          .select('*')
          .eq('rid', selectedRoom)
          .order('chdate', { ascending: true });

        if (error) throw error;

        setChatMessages(data || []);
      } catch (error: any) {
        setMessage(`Error fetching messages: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Real-time subscription
    const subscription = supabase
      .channel('chat-room-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 't_chats',
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (newMessage.rid === selectedRoom) {
            setChatMessages(prev => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedRoom]);

  const handleRoomSelect = (rid: string) => {
    setSelectedRoom(rid);
    setFormData(prev => ({ ...prev, rid }));
    setChatMessages([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!uid) {
      setMessage('User not logged in.');
      setLoading(false);
      return;
    }

    if (!formData.rid) {
      setMessage('Please select or enter a room ID.');
      setLoading(false);
      return;
    }

    const timestamp = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('t_chats')
        .insert([
          {
            chtext: formData.chtext,
            chdate: timestamp,
            uid: uid,
            rid: formData.rid,
          },
        ]);

      if (error) throw error;

      // Add message to local UI immediately
      const newMessage: ChatMessage = {
        chtext: formData.chtext,
        chdate: timestamp,
        uid: uid,
        rid: formData.rid,
      };
      setChatMessages(prev => [...prev, newMessage]);

      setMessage('Message sent!');
      setFormData(prev => ({ ...prev, chtext: '' }));

      if (!rooms.includes(formData.rid)) {
        setRooms(prev => [...prev, formData.rid]);
      }

      if (!selectedRoom) {
        setSelectedRoom(formData.rid);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex h-screen'>
      <Sidebar selectedRoom={selectedRoom} onRoomSelect={handleRoomSelect} />
      <div className="w-full h-full mx-auto flex flex-col bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="p-4 bg-gray-100 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {selectedRoom ? `Chat - Room ${selectedRoom.slice(0, 8)}...` : 'Chat'}
          </h2>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <p className="text-gray-600 text-center">Loading messages...</p>
          ) : selectedRoom && chatMessages.length > 0 ? (
            <div className="space-y-3">
              {chatMessages.map(chat => (
                <div
                  key={chat.chid || `${chat.uid}-${chat.chdate}`}
                  className={`flex ${chat.uid === uid ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      chat.uid === uid ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{chat.chtext}</p>
                    <p className="text-xs mt-1 opacity-75">
                      {new Date(chat.chdate).toLocaleTimeString('mn-MN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : selectedRoom ? (
            <p className="text-gray-600 text-center">No messages in this room.</p>
          ) : (
            <p className="text-gray-600 text-center">Please select a room to view messages.</p>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <textarea
              name="chtext"
              value={formData.chtext}
              onChange={handleInputChange}
              placeholder="Type a message..."
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 h-12 resize-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`p-3 m-4 rounded-md ${
              message.toLowerCase().includes('error')
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatApp;