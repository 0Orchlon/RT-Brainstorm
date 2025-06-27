import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { supabase } from '~/lib/supabase'; 

const Dashboard: React.FC = () => {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsername = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('User not logged in or auth error:', authError);
        return;
      }

      const { data, error } = await supabase
        .from('t_users')
        .select('uname')
        .eq('uid', user.id)
        .single();

      if (error) {
        console.error('Error fetching username:', error);
      } else {
        setUsername(data.uname);
      }
    };

    fetchUsername();
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h1 className="text-3xl font-bold mb-4 text-blue-700">Dashboard</h1>
      <br />
      <h2 className="text-xl text-gray-800">Welcome, {username || '...'}</h2>
      <div className='mt-5'>
        <Link to="/chat" className="bg-blue-100 p-2 text-blue-400 hover:text-blue-700 rounded-2xl">chat</Link>
      </div>
    </div>
  );
};

export default Dashboard;
