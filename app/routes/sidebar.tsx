import { useEffect, useState, useRef } from "react";
import { supabase } from "~/lib/supabase";

export type Room = {
  rid: string;
};

interface SidebarProps {
  selectedRoom: string;
  onRoomSelect: (rid: string) => void;
}

export default function Sidebar({ selectedRoom, onRoomSelect }: SidebarProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const { data, error } = await supabase
          .from("t_chats")
          .select("rid")
          .not("rid", "is", null);

        if (error) throw error;

        const uniqueRoomIds = Array.from(new Set(data.map((item) => item.rid)));
        setRooms(uniqueRoomIds.map((rid) => ({ rid })));
      } catch (err) {
        console.error("Error fetching rooms:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  return (
    <aside
      ref={sidebarRef}
      className="w-64 bg-gray-800 text-white p-4 flex flex-col min-h-screen overflow-y-auto"
    >
      <h2 className="text-lg font-semibold mt-6 mb-4">Rooms</h2>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : rooms.length === 0 ? (
        <p className="text-sm text-gray-400">No rooms found.</p>
      ) : (
        <ul className="space-y-2">
          {rooms.map((room) => (
            <li
              key={room.rid}
              onClick={() => onRoomSelect(room.rid)}
              className={`cursor-pointer px-3 py-2 rounded ${
                selectedRoom === room.rid ? "bg-gray-700" : "hover:bg-gray-700"
              } transition duration-200`}
            >
              Room {room.rid.slice(0, 8)}...
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
