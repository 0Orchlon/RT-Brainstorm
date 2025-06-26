import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import aiResponse from "~/components/AIAPI";
import { useState } from "react";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  // State to hold the AI response
  const [aiText, setAiText] = useState<string | null>(null);
  
  aiResponse.then((text) => {
    console.log("AI says:", text);
    setAiText(text);
  });

  return<div>
<p>
        {aiText ? aiText : "Loading AI response..."} {/* Render the response */}
      </p>
  <Welcome />
  </div>
}
