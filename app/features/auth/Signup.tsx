import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { supabase } from '../../lib/supabase';

const Signup: React.FC = () => {
  const [formData, setFormData] = useState({
    uname: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { uname: formData.uname },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = data?.user;
      if (user) {
        console.log('User signed up:', user);

        const { error: insertError } = await supabase
          .from('t_users')
          .insert([{ uid: user.id, uname: formData.uname }]);

        if (insertError) {
          setError(`Failed to insert user profile: ${insertError.message}`);
        } else {
          setSuccess('Account created successfully! Please check your email to verify.');
          setTimeout(() => navigate('/login'), 3000);
        }
      } else {
        setError('Signup succeeded but user is null. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during signup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded shadow-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <input
            type="text"
            name="uname"
            placeholder="Username"
            required
            value={formData.uname}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          />
          <input
            type="email"
            name="email"
            placeholder="Email address"
            required
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            value={formData.password}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded"
          />

          {error && <p className="text-red-600 text-center text-sm">{error}</p>}
          {success && <p className="text-green-600 text-center text-sm">{success}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
