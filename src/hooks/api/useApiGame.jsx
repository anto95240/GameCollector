// [CORRECTION] Importer l'instance configurée, pas le module par défaut
import axios from "../../config/interceptor"; 
import { useCallback } from "react";

export const useApiGame = () => {

    // Récupérer tous les jeux (avec recherche optionnelle)
    const getAllGames = useCallback(async (search = "") => {
        const params = search ? { search } : {};
        // Axios utilisera automatiquement http://localhost:5000 grâce à l'interceptor
        const { data } = await axios.get("/api/games", { params });
        return data;
    }, []);

    const getGameById = useCallback(async (id) => {
        const { data } = await axios.get(`/api/games/${id}`);
        return data;
    }, []);

    const createGame = async (gameData) => {
        // Le cookie d'auth est envoyé automatiquement ici aussi
        const { data } = await axios.post("/api/games", gameData);
        return data;
    };

    const updateGame = async (id, gameData) => {
        const { data } = await axios.put(`/api/games/${id}`, gameData);
        return data;
    };

    const deleteGame = async (id) => {
        const { data } = await axios.delete(`/api/games/${id}`);
        return data;
    };

    return {
        getAllGames,
        getGameById,
        createGame,
        updateGame,
        deleteGame
    };
};