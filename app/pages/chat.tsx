import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import getGeminiResponse from "~/components/AIAPI";

type ChatMessage = {
  id: number;
  sender: string;
  content: string;
};

export default function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const handleMessageSend = async () => {
    const newMsg: ChatMessage = {
      id: Date.now(),
      sender: "user",
      content: input,
    };

    setMessages((prev) => [...prev, newMsg]);

    if (input.startsWith("!aibot ")) {
      const userContent = input.replace("!aibot ", "").trim();

      const reply = await getGeminiResponse(userContent);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "aibot",
          content: reply,
        },
      ]);
    }

    setInput("");
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="border p-4 rounded bg-white h-100 overflow-y-auto text-black">
        {messages.map((msg) => (
          <div key={msg.id} className="mb-2 inline">
            <strong>{msg.sender}:</strong>{" "}
            <ReactMarkdown >{msg.content}</ReactMarkdown>
          </div>
        ))}
      </div>
      <div className="mt-4 flex">
        <input
          className="flex-1 border p-2 rounded"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleMessageSend()}
        />
        <button
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded"
          onClick={handleMessageSend}
        >
          Send
        </button>
      </div>
    </div>
  );
}
