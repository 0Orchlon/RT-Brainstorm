import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "~/lib/supabase";

export function Navbar() {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // Fetch and set username
  const loadUser = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      setIsLoggedIn(false);
      setUsername(null);
      return;
    }

    setIsLoggedIn(true);

    const { data, error: userError } = await supabase
      .from("t_users")
      .select("uname")
      .eq("uid", user.id)
      .maybeSingle();

    if (userError || !data) {
      setUsername(null);
    } else {
      setUsername(data.uname);
    }
  };

  useEffect(() => {
    // Initial check
    loadUser();

    // Listen to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadUser(); // refresh user info
    });

    return () => {
      authListener.subscription.unsubscribe(); // cleanup
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const userInitial = username?.charAt(0).toUpperCase() || "U";

  return (
    <nav className="bg-blue-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white text-lg font-bold">RT-Brainstorm</div>

        <ul className="flex items-center space-x-4">
          <li>
            <Link to="/" className="text-gray-300 hover:text-white">
              Home
            </Link>
          </li>

          {!isLoggedIn ? (
            <li>
              <Link to="/login" className="text-gray-300 hover:text-white">
                Login
              </Link>
            </li>
          ) : (
            <li className="relative group">
              <button className="flex items-center space-x-2 text-gray-300 hover:text-white focus:outline-none">
                <div className="w-8 h-8 bg-white text-blue-800 rounded-full flex items-center justify-center font-bold">
                  {userInitial}
                </div>
                <span>{username}</span>
              </button>
              <ul className="absolute right-0 mt-2 w-40 bg-white text-black rounded-md shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-200 z-10">
                <li>
                  <Link
                    to="/dashboard"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/chat"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    Chat
                  </Link>
                </li>
                <li>
                  <Link
                    to="/profile"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
