import { type RouteConfig, index , route} from "@react-router/dev/routes";

export default [
    index("routes/Home.tsx"),
    route("/login", "routes/Login.tsx"),
    route("/register", "routes/register.tsx"),
    route("/room/:rid", "routes/roomPage.tsx"),
    route("room/join/:roomId", "routes/JoinRoom.tsx")


] satisfies RouteConfig;
