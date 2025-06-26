import React, { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase'; // adjust this import to your actual path

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
    </div>
  );
};

export default Dashboard;
