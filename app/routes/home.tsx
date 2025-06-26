import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";
import { Navbar } from "../layout/navbar";
import type { useState } from "react";
import aiResponse from "~/components/AIAPI";
export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  // const [apis, setApis] useState

  return (
    <>
      <div>
        <p>Hello</p>
        <Welcome />
      </div>
    </>
  );
}
