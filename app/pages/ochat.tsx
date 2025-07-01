import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { supabase } from "~/lib/supabase";
import getGeminiResponse from "~/components/AIAPI";
import ReactMarkdown from "react-markdown";

type ChatMessage = {
  chid: number;
  chtext: string;
  rid: string;
  uid: string;
  chdate: string;
};

type UserMap = {
  [uid: string]: string;
};

export default function OChat() {
  const { room_id } = useParams();
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [userMap, setUserMap] = useState<UserMap>({});

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) return navigate("/login");

      setUserId(user.id);

      const { data: member } = await supabase
        .from("t_rooms_users")
        .select("ruid")
        .eq("rid", room_id)
        .eq("uid", user.id)
        .maybeSingle();

      if (!member) return navigate("/dashboard");

      const { data: msgs } = await supabase
        .from("t_chats")
        .select("*")
        .eq("rid", room_id)
        .order("chdate", { ascending: true });

      if (!msgs) return;

      setMessages(msgs);

      const uniqueUIDs = [...new Set(msgs.map((m) => m.uid))];

      const { data: userInfos } = await supabase
        .from("t_users")
        .select("uid, uname")
        .in("uid", uniqueUIDs);

      if (userInfos) {
        const map: UserMap = {};
        userInfos.forEach((u) => {
          map[u.uid] = u.uname;
        });
        map["4f3a9c1e-2b1d-4f9a-6b2c-7d8e9f3b6a1d"] = "aibot";
        setUserMap(map);
      }

      // Subscribe to new messages
      supabase
        .channel("room_chats")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "t_chats",
            filter: `rid=eq.${room_id}`,
          },
          (payload) => {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => [...prev, newMsg]);
          }
        )
        .subscribe();
    };

    init();

    // Clean up listener when unmounting
    return () => {
      supabase.removeAllChannels();
    };
  }, [room_id, navigate]);

  const handleMessageSend = async () => {
    const text = input.trim();
    if (!text) return;

    const timestamp = new Date().toISOString();

    await supabase.from("t_chats").insert({
      chtext: text,
      rid: room_id,
      uid: userId,
      chdate: timestamp,
    });

    // Check for AI bot
    const match = text.match(/!aibot\s*(.*)/i);
    if (match && match[1]) {
      const prompt = match[1];
      const aiReply = await getGeminiResponse(prompt);

      await supabase.from("t_chats").insert({
        chtext: aiReply,
        rid: room_id,
        uid: "4f3a9c1e-2b1d-4f9a-6b2c-7d8e9f3b6a1d",
        chdate: new Date().toISOString(),
      });
    }

    setInput("");
  };

  return (
    <div className="p-4 max-w-3xl mx-auto text-black">
      <div className="h-[60vh] overflow-y-auto bg-white p-4 rounded shadow">
        {messages.map((msg) => (
          <div key={msg.chid} className="mb-4">
            <strong className="text-blue-600">
              {userMap[msg.uid] ?? msg.uid}:
            </strong>
            <div className="ml-2 inline">
              <ReactMarkdown>{msg.chtext}</ReactMarkdown>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex">
        <input
          className="flex-1 border p-2 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleMessageSend()}
        />
        <button
          onClick={handleMessageSend}
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
}
