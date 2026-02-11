import { Navigate, Outlet } from "react-router";

const ProtectedRoutes = () => {
    // On vérifie si l'utilisateur est présent "visuellement"
    // La vraie sécurité est gérée par le Backend qui rejettera les requêtes sans cookie
    const user = localStorage.getItem("user");

    return user ? (
        <Outlet />
    ) : (
        <Navigate to="/" replace />
    );
}

export default ProtectedRoutes;