import React, { useState, useEffect } from "react";
import { useActionData, useNavigate } from "react-router";
import { supabase } from "../supanbase";

// Register.tsx
import type { Route } from "./+types/register";

type ActionData = { error?: string; success?: boolean };
export async function action({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const uname = formData.get("uname") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const repassword = formData.get("repassword") as string;

  if (!uname || !email || !password || !repassword) {
    return { error: "Бүх талбарыг бөглөнө үү" };
  }

  if (password !== repassword) {
    return { error: "Нууц үг таарахгүй байна" };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    const { id } = data.user;
    const { error: insertError } = await supabase
      .from("t_users")
      .insert([{ uid: id, uname }]);

    if (insertError) {
      return {
        error:
          "Хэрэглэгчийн нэр хадгалахад алдаа гарлаа: " + insertError.message,
      };
    }

    return { success: true };
  }

  return { error: "Бүртгэл амжилтгүй боллоо" };
}

export default function Register({}: Route.ClientActionArgs) {
  const actionData = useActionData() as ActionData;
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData?.success) {
      alert("Бүртгэл амжилттай! Имэйлээ шалгана уу.");
      navigate("/login");
    }
  }, [actionData, navigate]);

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "5rem auto",
        padding: "2rem",
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        borderRadius: "12px",
        backgroundColor: "#fff",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        textAlign: "center",
      }}
    >
      <h2
        style={{
          marginBottom: "1.5rem",
          color: "#333",
          fontWeight: "700",
          fontSize: "1.8rem",
        }}
      >
        Бүртгүүлэх
      </h2>

      {actionData?.error && (
        <p style={{ color: "red", marginBottom: "1rem", textAlign: "center" }}>
          {actionData.error}
        </p>
      )}

      <form method="post">
        <input
          type="text"
          name="uname"
          placeholder="Хэрэглэгчийн нэр"
          style={inputStyle}
          onFocus={onFocusStyle}
          onBlur={onBlurStyle}
          autoComplete="username"
          required
        />

        <input
          type="email"
          name="email"
          placeholder="Имэйл"
          style={inputStyle}
          onFocus={onFocusStyle}
          onBlur={onBlurStyle}
          autoComplete="email"
          required
        />

        <input
          type="password"
          name="password"
          placeholder="Нууц үг"
          style={inputStyle}
          onFocus={onFocusStyle}
          onBlur={onBlurStyle}
          autoComplete="new-password"
          required
        />

        <input
          type="password"
          name="repassword"
          placeholder="Нууц үг давтах"
          style={inputStyle}
          onFocus={onFocusStyle}
          onBlur={onBlurStyle}
          autoComplete="new-password"
          required
        />

        <button type="submit" style={buttonStyle}>
          Бүртгүүлэх
        </button>
      </form>

      <button onClick={() => navigate("/login")} style={loginBtnStyle}>
        Нэвтрэх
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  marginBottom: "1rem",
  borderRadius: "8px",
  border: "1.5px solid #ddd",
  fontSize: "1rem",
  outline: "none",
  transition: "border-color 0.3s",
};

const onFocusStyle = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = "#3d5afe";
};

const onBlurStyle = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = "#ddd";
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "8px",
  border: "none",
  backgroundColor: "#3d5afe",
  color: "white",
  fontWeight: "600",
  fontSize: "1rem",
  cursor: "pointer",
  transition: "background-color 0.3s",
  marginBottom: "1rem",
};

const loginBtnStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "none",
  color: "#3d5afe",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "1rem",
  textDecoration: "underline",
  padding: "0",
};
