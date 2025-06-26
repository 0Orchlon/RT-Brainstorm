import { useNavigate } from "react-router";
export function Welcome() {
  const navigate = useNavigate();
  const handleLogin = () => {
    navigate("/login");
  }
  return (
    <div className="welcome">
      <h1 className="flex justify-center mt-15 font-bold text-4xl text-blue-500">Welcome to RT-Brainstorm!</h1>
      <div className="flex justify-center  items-center mt-10">
        <button className="flex bg-blue-500 text-white px-4 py-2 rounded mr-15" onClick={() => navigate("/signup")}>Sign Up</button>
        <button className="flex bg-blue-500 text-white px-4 py-2 rounded" onClick={handleLogin}>Login</button>
      </div>
    </div>
  );
}