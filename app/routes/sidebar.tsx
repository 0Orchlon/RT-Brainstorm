import type { UUID } from "crypto";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { supabase } from "~/lib/supabase";

type Room = {
  rid: UUID;
  rname: string;
};

export default function Sidebar() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from("t_rooms")
        .select("rid, rname");

      if (error) {
        console.error("Error fetching rooms:", error);
      } else {
        setRooms(data);
      }

      setLoading(false);
    };

    fetchRooms();
  }, []);

  const handleNavigate = (rid: UUID) => {
    navigate(`/room/${rid}`);
  };

  const sidebarRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <aside
        ref={sidebarRef}
        className="w-64 bg-gray-800 text-white p-4 flex flex-col relative h-screen overflow-y-auto"
      >
        <h2 className="text-lg font-semibold mt-6 mb-4">Rooms</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-gray-500">No rooms found.</p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((room) => (
              <li
                key={room.rid}
                onClick={() => handleNavigate(room.rid)}
                className="cursor-pointer px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                {room.rname}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
