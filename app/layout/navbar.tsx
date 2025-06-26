import React from 'react';
import { Link } from 'react-router';

export function Navbar() {
  return (
    <nav className="bg-blue-800 p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white text-lg font-bold">RT-Brainstorm</div>
        <ul className="flex space-x-4">
          <li>
            <Link to="/" className="text-gray-300 hover:text-white">home</Link>
          </li>
          <li>
            <Link to="/login" className="text-gray-300 hover:text-white">login</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}