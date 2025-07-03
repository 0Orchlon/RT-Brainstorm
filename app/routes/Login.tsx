import React, { useState, useEffect } from "react";
import { useActionData, useNavigate } from "react-router";
import { supabase } from "../supanbase";
import type { Route } from "./+types/Login";

type ActionData = {
  success?: boolean;
  error?: string;
  token?: string;
  refreshToken?: string;
  user?: any;
};

export async function action({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please fill in all fields" };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message || "Email or password is incorrect" };
  }

  if (data?.session?.access_token && data.session.refresh_token) {
    return {
      success: true,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: data.user,
    };
  }

  return { error: "An unexpected error occurred" };
}
export default function Login({}: Route.ClientActionArgs) {
  const actionData = useActionData() as ActionData;
  const navigate = useNavigate();
  useEffect(() => {
    if (actionData?.success && actionData.token && actionData.refreshToken) {
      supabase.auth.setSession({
        access_token: actionData.token,
        refresh_token: actionData.refreshToken,
      });

      navigate("/");
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
      }}
    >
      {actionData?.error && (
        <p style={{ color: "red", marginBottom: "1rem", textAlign: "center" }}>
          {actionData.error}
        </p>
      )}
      <h2
        style={{
          textAlign: "center",
          marginBottom: "1.5rem",
          color: "#333",
          fontWeight: "700",
          fontSize: "1.8rem",
        }}
      >
        Нэвтрэх
      </h2>

      <form method="post">
        <input
          type="email"
          name="email"
          placeholder="Имэйл"
          required
          style={{
            width: "100%",
            padding: "12px 16px",
            marginBottom: "1rem",
            borderRadius: "8px",
            border: "1.5px solid #ddd",
            fontSize: "1rem",
            outline: "none",
            transition: "border-color 0.3s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#3d5afe")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#ddd")}
        />

        <input
          type="password"
          name="password"
          placeholder="Нууц үг"
          required
          style={{
            width: "100%",
            padding: "12px 16px",
            marginBottom: "1.5rem",
            borderRadius: "8px",
            border: "1.5px solid #ddd",
            fontSize: "1rem",
            outline: "none",
            transition: "border-color 0.3s",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#3d5afe")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#ddd")}
        />

        <button
          type="submit"
          style={{
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
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#2f43d6")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#3d5afe")
          }
        >
          Нэвтрэх
        </button>
      </form>

      <button
        onClick={() => navigate("/register")}
        style={loginBtnStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = "#e2e6f9")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        Бүртгүүлэх
      </button>
    </div>
  );
}

const loginBtnStyle: React.CSSProperties = {
  backgroundColor: "transparent",
  border: "none",
  color: "#3d5afe",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "1rem",
  textDecoration: "underline",
  padding: "0",
  marginTop: "1rem",
};
