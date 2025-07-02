import React, { useEffect, useState } from 'react';
import { supabase } from '../supanbase';

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

interface PollProps {
  userId: string | null;
  roomId: string | undefined;
  polls: Poll[];
  setPolls: React.Dispatch<React.SetStateAction<Poll[]>>;
}

export default function Poll({ userId, roomId, polls, setPolls }: PollProps) {
  const [userPollVotes, setUserPollVotes] = useState<Set<number>>(new Set());
  const AI_BOT_UID = "4f3a9c1e-2b1d-4f9a-6b2c-7d8e9f3b6a1d";

  useEffect(() => {
    if (!roomId || !userId) return;

    fetchPollVotes();

    const channel = supabase
      .channel(`room_polls_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 't_polls',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setPolls((prev) => [...prev, payload.new as Poll]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 't_poll_votes',
        },
        (payload) => {
          const { poll_id, option_id, user_id } = payload.new as { poll_id: number; option_id: number; user_id: string };
          updatePollVoteCount({ poll_id, option_id, user_id });
          fetchPollData(poll_id); // Саналын мэдээллийг дахин татах
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  const fetchPollVotes = async () => {
    if (!userId) return;

    const { data: pollVotesData, error } = await supabase
      .from('t_poll_votes')
      .select('poll_id')
      .eq('user_id', userId);

    if (error) {
      console.error('Саналын түүхийг татахад алдаа:', error.message);
      return;
    }

    if (pollVotesData) {
      setUserPollVotes(new Set(pollVotesData.map(vote => vote.poll_id)));
    }
  };

  const fetchPollData = async (pollId: number) => {
    const { data, error } = await supabase
      .from('t_polls')
      .select('*')
      .eq('poll_id', pollId)
      .single();

    if (error) {
      console.error('Санал асуулгын мэдээлэл татахад алдаа:', error.message);
      return;
    }

    if (data) {
      setPolls(prev => prev.map(poll =>
        poll.poll_id === pollId ? data : poll
      ));
    }
  };

  const updatePollVoteCount = (vote: { poll_id: number; option_id: number; user_id: string }) => {
    setPolls(prev => prev.map(poll => {
      if (poll.poll_id === vote.poll_id) {
        return {
          ...poll,
          options: poll.options.map(option =>
            option.option_id === vote.option_id
              ? { ...option, vote_count: option.vote_count + 1 }
              : option
          ),
        };
      }
      return poll;
    }));

    if (vote.user_id === userId) {
      setUserPollVotes(prev => new Set([...prev, vote.poll_id]));
    }
  };

  const votePoll = async (pollId: number, optionId: number) => {
    if (!userId) {
      alert('Санал өгчих байхийн тулд нэвтрэх хэрэгтэй.');
      return;
    }

    const { data: existingVote, error: checkError } = await supabase
      .from('t_poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      alert('Санал шалгахад алдаа: ' + checkError.message);
      return;
    }

    if (existingVote || userPollVotes.has(pollId)) {
      alert('Та энэ санал асуулгад аль хэдийн санал өгсөн байна.');
      return;
    }

    const { error } = await supabase.from('t_poll_votes').insert([
      {
        poll_id: pollId,
        option_id: optionId,
        user_id: userId,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert('Санал өгчих байхад алдаа: ' + error.message);
      return;
    }

    updatePollVoteCount({ poll_id: pollId, option_id: optionId, user_id: userId });
    await fetchPollData(pollId); // Санал асуулгын мэдээллийг шинэчлэх
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        backgroundColor: '#433c3b',
      }}
    >
      {polls.map((poll) => (
        <div
          key={poll.poll_id}
          style={{
            backgroundColor: '#ffffff',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px',
          }}
        >
          <h4 style={{ marginBottom: '10px', color: '#333' }}>{poll.question}</h4>
          {poll.options.map((option) => (
            <div key={option.option_id} style={{ marginBottom: '10px' }}>
              <button
                onClick={() => votePoll(poll.poll_id, option.option_id)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: userPollVotes.has(poll.poll_id) ? '#ccc' : '#3d5afe',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: userPollVotes.has(poll.poll_id) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  marginRight: '10px',
                }}
                disabled={userPollVotes.has(poll.poll_id)}
              >
                {option.option_text} ({option.vote_count})
              </button>
            </div>
          ))}
          <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
            Үүсгэсэн: {poll.created_by === AI_BOT_UID ? 'Gemini AI' : poll.created_by} •{' '}
            {new Date(poll.created_at).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}