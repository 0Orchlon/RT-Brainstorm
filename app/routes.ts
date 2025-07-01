import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { features } from "process";

export default [
  index("routes/home.tsx"),
  route("login", "features/auth/Login.tsx"),
  route("signup", "features/auth/Signup.tsx"),
  route("dashboard", "pages/dashboard.tsx"),
  route("join/:rid", "features/join/joinz.tsx"),
  route("chat", "components/Chat.tsx"),
  route("room/:room_id", "pages/ochat.tsx")
] satisfies RouteConfig;