import { Navigate, Outlet } from "react-router";

const ProtectedRoutes = () => {
    const isAuthenticated = sessionStorage.getItem("loginToken");

    return isAuthenticated ? (
        <Outlet />
    ) : (
        <Navigate to="/" replace />
    );
}

export default ProtectedRoutes;