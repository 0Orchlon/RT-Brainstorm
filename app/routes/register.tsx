import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supanbase';

export default function Register() {
  const [uname, setUname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        navigate('/');
      }
    });
  }, []);

  const handleRegister = async () => {
    if (password !== repassword) {
      alert('Нууц үг таарахгүй байна');
      return;
    }
    if (!uname) {
      alert('Хэрэглэгчийн нэрийг оруулна уу');
      return;
    }
    if (!email || !password) {
      alert('Имэйл болон нууц үгээ оруулна уу');
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert(error.message);
      return;
    }

    if (data.user) {
      const { id } = data.user;
      const { error: insertError } = await supabase
        .from('t_users')
        .insert([{ uid: id, uname }]);

      if (insertError) {
        alert('Хэрэглэгчийн нэр хадгалахад алдаа гарлаа: ' + insertError.message);
        return;
      }

      alert('Бүртгэл амжилттай! Имэйлээ шалгана уу.');
      setUname('');
      setEmail('');
      setPassword('');
      setRepassword('');
      navigate('/login');
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '5rem auto',
        padding: '2rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        borderRadius: '12px',
        backgroundColor: '#fff',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        textAlign: 'center',
      }}
    >
      <h2
        style={{
          marginBottom: '1.5rem',
          color: '#333',
          fontWeight: '700',
          fontSize: '1.8rem',
        }}
      >
        Бүртгүүлэх
      </h2>

      <input
        type="text"
        placeholder="Хэрэглэгчийн нэр"
        value={uname}
        onChange={(e) => setUname(e.target.value)}
        style={inputStyle}
        onFocus={onFocusStyle}
        onBlur={onBlurStyle}
        autoComplete="username"
      />

      <input
        type="email"
        placeholder="Имэйл"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
        onFocus={onFocusStyle}
        onBlur={onBlurStyle}
        autoComplete="email"
      />

      <input
        type="password"
        placeholder="Нууц үг"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={inputStyle}
        onFocus={onFocusStyle}
        onBlur={onBlurStyle}
        autoComplete="new-password"
      />

      <input
        type="password"
        placeholder="Нууц үг давтах"
        value={repassword}
        onChange={(e) => setRepassword(e.target.value)}
        style={inputStyle}
        onFocus={onFocusStyle}
        onBlur={onBlurStyle}
        autoComplete="new-password"
      />

      <button
        onClick={handleRegister}
        style={buttonStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2f43d6')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3d5afe')}
      >
        Бүртгүүлэх
      </button>

      <button
        onClick={() => navigate('/login')}
        style={loginBtnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e6f9')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        Нэвтрэх
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  marginBottom: '1rem',
  borderRadius: '8px',
  border: '1.5px solid #ddd',
  fontSize: '1rem',
  outline: 'none',
  transition: 'border-color 0.3s',
};

const onFocusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#3d5afe';
};

const onBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#ddd';
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#3d5afe',
  color: 'white',
  fontWeight: '600',
  fontSize: '1rem',
  cursor: 'pointer',
  transition: 'background-color 0.3s',
  marginBottom: '1rem',
};

const loginBtnStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  border: 'none',
  color: '#3d5afe',
  cursor: 'pointer',
  fontWeight: '600',
  fontSize: '1rem',
  textDecoration: 'underline',  
  padding: '0',
};
