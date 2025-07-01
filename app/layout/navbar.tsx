import React from "react";
import { Link } from "react-router";

interface NavbarProps {
  isLoggedIn: boolean;
}

export function Navbar({ isLoggedIn }: NavbarProps) {
  console.log(isLoggedIn);
  return (
    <nav className="bg-blue-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white text-lg font-bold">RT-Brainstorm</div>

        <ul className="flex space-x-4">
          {!isLoggedIn && (
            <>
              <div className="text-white text-lg font-bold">
                <li>
                  <Link to="/" className="text-gray-300 hover:text-white">
                    home
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-gray-300 hover:text-white">
                    login
                  </Link>
                </li>
              </div>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}
