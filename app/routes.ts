import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "features/auth/Login.tsx"),
  route("signup", "features/auth/Signup.tsx"),
] satisfies RouteConfig;
