import React, { useEffect } from "react";
import {
  Form,
  useActionData,
  useNavigate,
  useNavigation,
  Link,
} from "react-router";
import { supabase } from "../../lib/supabase";
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

const Login: React.FC = () => {
  const actionData = useActionData() as ActionData;
  const navigation = useNavigation();
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData?.success && actionData.token && actionData.refreshToken) {
      supabase.auth.setSession({
        access_token: actionData.token,
        refresh_token: actionData.refreshToken,
      });

      navigate("/dashboard");
    }
  }, [actionData, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <Form method="post" className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          {actionData?.error && (
            <div className="text-red-600 text-sm text-center">
              {actionData.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={navigation.state === "submitting"}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {navigation.state === "submitting" ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/signup"
              className="text-indigo-600 hover:text-indigo-500"
            >
              Don't have an account? Sign up
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;
