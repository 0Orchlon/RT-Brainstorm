import React, { useEffect } from "react";
import {
  Form,
  useActionData,
  useNavigate,
  useNavigation,
  Link,
} from "react-router";
import { supabase } from "../../lib/supabase";
import type { Route } from "./+types/Signup";

type ActionData = {
  success?: boolean;
  error?: string;
  message?: string;
};

export async function action({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const uname = formData.get("uname") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!uname || !email || !password || !confirmPassword) {
    return { error: "Please fill in all fields" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { uname },
    },
  });

  if (error) {
    return { error: error.message || "An error occurred during signup." };
  }

  if (data?.user) {
    const { error: insertError } = await supabase
      .from("t_users")
      .insert([{ uid: data.user.id, uname }]);
    if (insertError) {
      return { error: `Failed to insert user profile: ${insertError.message}` };
    }
    return {
      success: true,
      message:
        "Signup successful. Please check your email to confirm your account.",
    };
  }

  return { error: "Unexpected error occurred" };
}

const Signup: React.FC = () => {
  const actionData = useActionData() as ActionData;
  const navigation = useNavigation();
  const navigate = useNavigate();

  useEffect(() => {
    if (actionData?.success) {
      const timer = setTimeout(() => {
        navigate("/login");
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [actionData, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>

        <Form method="post" className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <input
                name="uname"
                type="text"
                required
                placeholder="Username"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>
            <div>
              <input
                name="email"
                type="email"
                required
                placeholder="Email address"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>
            <div>
              <input
                name="password"
                type="password"
                required
                placeholder="Password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>
            <div>
              <input
                name="confirmPassword"
                type="password"
                required
                placeholder="Confirm password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              />
            </div>
          </div>

          {actionData?.error && (
            <div className="text-red-600 text-sm text-center">
              {actionData.error}
            </div>
          )}

          {actionData?.success && actionData.message && (
            <div className="text-green-600 text-sm text-center">
              {actionData.message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={navigation.state === "submitting"}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {navigation.state === "submitting" ? "Creating..." : "Sign Up"}
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-indigo-600 hover:text-indigo-500">
              Already have an account? Sign in
            </Link>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Signup;
