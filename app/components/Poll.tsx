import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supanbase';
import debounce from 'lodash.debounce';

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

  const debouncedFetchPollData = useCallback(
    debounce(async (pollId: number) => {
      try {
        const { data: pollData, error: pollError } = await supabase
          .from('t_polls')
          .select('*')
          .eq('poll_id', pollId)
          .single();

        if (pollError) {
          console.error('Error fetching poll data:', pollError.message);
          return;
        }

        if (pollData && pollData.options) {
          const optionsWithVotes = await Promise.all(
            pollData.options.map(async (option: PollOption) => {
              const { count, error: voteError } = await supabase
                .from('t_poll_votes')
                .select('*', { count: 'exact', head: true })
                .eq('poll_id', pollId)
                .eq('option_id', option.option_id);

              if (voteError) {
                console.error('Error fetching vote count:', voteError.message);
                return { ...option, vote_count: 0 };
              }

              return {
                ...option,
                vote_count: count || 0,
              };
            })
          );

          const updatedPoll: Poll = {
            ...pollData,
            options: optionsWithVotes,
          };

          setPolls((prev) => {
            const newPolls = [...prev];
            const pollIndex = newPolls.findIndex((poll) => poll.poll_id === pollId);
            if (pollIndex !== -1) {
              newPolls[pollIndex] = { ...updatedPoll, options: [...updatedPoll.options] };
            }
            return newPolls;
          });
        }
      } catch (error) {
        console.error('Unexpected error in fetchPollData:', error);
      }
    }, 1000),
    [setPolls]
  );

  const fetchAllPollsData = useCallback(
    async (roomId: string) => {
      try {
        const { data: pollsData, error: pollsError } = await supabase
          .from('t_polls')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (pollsError) {
          console.error('Error fetching polls data:', pollsError.message);
          return;
        }

        if (!pollsData || pollsData.length === 0) {
          setPolls([]);
          return;
        }

        const pollIds = pollsData.map((poll) => poll.poll_id);
        const { data: votesData, error: votesError } = await supabase
          .from('t_poll_votes')
          .select('poll_id, option_id')
          .in('poll_id', pollIds);

        if (votesError) {
          console.error('Error fetching votes data:', votesError.message);
          return;
        }

        const voteCounts = votesData.reduce((acc, vote) => {
          const key = `${vote.poll_id}-${vote.option_id}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const updatedPolls = pollsData.map((pollData) => ({
          ...pollData,
          options: pollData.options.map((option: PollOption) => ({
            ...option,
            vote_count: voteCounts[`${pollData.poll_id}-${option.option_id}`] || 0,
          })),
        }));

        console.log('Шинэчлэгдсэн polls:', updatedPolls);
        setPolls(updatedPolls);
      } catch (error) {
        console.error('Unexpected error in fetchAllPollsData:', error);
      }
    },
    [setPolls]
  );

  const fetchPollVotes = async () => {
    if (!userId) return;

    try {
      const { data: pollVotesData, error } = await supabase
        .from('t_poll_votes')
        .select('poll_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching poll votes:', error.message);
        return;
      }

      if (pollVotesData) {
        setUserPollVotes(new Set(pollVotesData.map((vote) => vote.poll_id)));
      }
    } catch (error) {
      console.error('Unexpected error in fetchPollVotes:', error);
    }
  };

  const removeDuplicatePolls = useCallback((pollsArray: Poll[]) => {
    const uniquePollsMap = new Map<number, Poll>();

    pollsArray.forEach((poll) => {
      if (
        !uniquePollsMap.has(poll.poll_id) ||
        new Date(poll.created_at) > new Date(uniquePollsMap.get(poll.poll_id)!.created_at)
      ) {
        uniquePollsMap.set(poll.poll_id, poll);
      }
    });

    return Array.from(uniquePollsMap.values());
  }, []);

  useEffect(() => {
    if (!roomId || !userId) return;

    fetchPollVotes();
    fetchAllPollsData(roomId);

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
          const newPoll = payload.new as Poll;
          setPolls((prev) => {
            if (prev.some((poll) => poll.poll_id === newPoll.poll_id)) {
              console.warn('Realtime subscription-д давхардсан poll_id:', newPoll.poll_id);
              return prev;
            }
            console.log('Шинэ poll нэмэгдлээ:', newPoll);
            return [...prev, { ...newPoll, options: newPoll.options || [] }];
          });
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
          const { poll_id } = payload.new as { poll_id: number; option_id: number; user_id: string };
          debouncedFetchPollData(poll_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      debouncedFetchPollData.cancel();
    };
  }, [roomId, userId, fetchAllPollsData, debouncedFetchPollData]);

  const votePoll = async (pollId: number, optionId: number) => {
    if (!userId || !roomId) {
      alert('Нэвтрэх болон өрөөний ID шаардлагатай.');
      return;
    }

    try {
      const { data: existingVote, error: checkError } = await supabase
        .from('t_poll_votes')
        .select('id')
        .eq('poll_id', pollId)
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        alert('Санал шалгахад алдаа гарлаа: ' + checkError.message);
        return;
      }

      if (existingVote || userPollVotes.has(pollId)) {
        alert('Та энэ санал асуулгад аль хэдийн санал өгсөн байна.');
        return;
      }

      const voteData: any = {
        poll_id: pollId,
        option_id: optionId,
        user_id: userId,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('t_poll_votes')
        .insert(voteData);

      if (insertError) {
        alert('Санал өгөхөд алдаа гарлаа: ' + insertError.message);
        console.error('Insert error details:', insertError);
        return;
      }

      console.log('Санал амжилттай өгөгдлөө, poll:', pollId, 'option:', optionId);
      setUserPollVotes((prev) => new Set([...prev, pollId]));
      debouncedFetchPollData(pollId);
      console.log('Саналын өгөгдлийг шинэчлэхээр товлогдлоо, poll:', pollId);
    } catch (error) {
      console.error('votePoll-д гэнэтийн алдаа:', error);
      alert('Санал өгөх явцад гэнэтийн алдаа гарлаа.');
    }
  };

  const uniquePolls = removeDuplicatePolls(polls);

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
      {uniquePolls.map((poll) => (
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
          {poll.options &&
            poll.options.map((option) => (
              <div
                key={`${poll.poll_id}-${option.option_id}`}
                style={{ marginBottom: '10px' }}
              >
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
                  {option.option_text} ({option.vote_count || 0})
                </button>
              </div>
            ))}
          <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
            Үүсгэгч: {poll.created_by === AI_BOT_UID ? 'AI Bot' : poll.created_by} •{' '}
            {new Date(poll.created_at).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
