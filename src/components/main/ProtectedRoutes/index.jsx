import { Navigate, Outlet } from "react-router";
import { readStoredUser } from "../../../utils/userStorage";

const ProtectedRoutes = () => {
  const user = readStoredUser();

  return user ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoutes;
