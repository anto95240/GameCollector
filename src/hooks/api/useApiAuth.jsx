import axios from "../../config/interceptor"; // On utilise l'instance configurée
import { useCallback } from "react";

export const useApiAuth = () => {

    const login = async (credentials) => {
        // credentials = { login, password }
        // Le cookie HttpOnly sera set automatiquement par le back
        const { data } = await axios.post("/api/user/login", credentials);
        return data;
    };

    const register = async (userData) => {
        // userData = { firstname, lastname, username, email, password, passwordConfirm }
        const { data } = await axios.post("/api/user/sign-up", userData);
        return data;
    };

    const logout = async () => {
        try {
            // Appel au back pour détruire le cookie
            await axios.post("/api/user/logout");
        } catch (error) {
            console.error("Erreur lors du logout", error);
        } finally {
            // [CORRECTION] Nettoyage local
            // On supprime l'objet user utilisé par ProtectedRoutes
            localStorage.removeItem("user");
            
            // Nettoyage de sécurité (au cas où d'autres clés trainent)
            sessionStorage.clear();
            
            // Redirection vers la page de login
            window.location.href = "/";
        }
    };

    const getMe = useCallback(async () => {
        const { data } = await axios.get("/api/user/me");
        return data;
    }, []);

    const updateProfile = async (userId, formData) => {
        // Note : formData doit être un objet FormData si envoi d'image
        const { data } = await axios.put(`/api/user/${userId}`, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return data;
    };

    const deleteAccount = async (userId) => {
        const { data } = await axios.delete(`/api/user/${userId}`);
        return data;
    };

    const addGameToHistory = async (gameId) => {
        const { data } = await axios.put(`/api/user/history/${gameId}`);
        return data;
    };

    const getGameHistory = useCallback(async () => {
        const { data } = await axios.get('/api/user/history');
        return data;
    }, []);

    return {
        login,
        register,
        logout,
        getMe,
        updateProfile,
        deleteAccount,
        addGameToHistory,
        getGameHistory
    };
};