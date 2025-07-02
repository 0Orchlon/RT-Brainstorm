import React, { useState } from 'react';
import { supabase } from '../supanbase';

export default function Register() {
  const [uname, setUname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repassword, setRepassword] = useState('');

  const handleRegister = async () => {
    if (password !== repassword) {
      alert('Нууц үг таарахгүй байна');
      return;
    }
    if (!uname) {
      alert('Хэрэглэгчийн нэрийг оруулна уу');
      return;
    }
    // 1. Supabase дээр бүртгэх
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {    
      alert(error.message);
      return;
    }

    if (data.user) {
      const { id } = data.user; 
      const { error: insertError } = await supabase
        .from('t_users')
        .insert({ uid: id, uname });

      if (insertError) {
        alert('Хэрэглэгчийн нэр хадгалахад алдаа гарлаа: ' + insertError.message);
        return;
      }

      alert('Бүртгэл амжилттай! Имэйлээ шалгана уу.');
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', padding: '1rem' }}>
      <h2>Бүртгүүлэх</h2>
      <input
        type="text"
        placeholder="Хэрэглэгчийн нэр"
        value={uname}
        onChange={(e) => setUname(e.target.value)}
      />
      <br />
      <input
        type="email"
        placeholder="Имэйл"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="Нууц үг"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <br />
      <input
        type="password"
        placeholder="Нууц үг давтах"
        value={repassword}
        onChange={(e) => setRepassword(e.target.value)}
      />
      <br />
      <button onClick={handleRegister}>Бүртгүүлэх</button>
    </div>
  );
}
