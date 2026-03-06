import { Navigate, Outlet } from "react-router";

const ProtectedRoutes = () => {
  const user = localStorage.getItem("user");

  return user ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoutes;
