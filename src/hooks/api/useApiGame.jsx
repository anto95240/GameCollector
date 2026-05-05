import axios from "../../config/interceptor"; 
import { useCallback } from "react";

export const useApiGame = () => {

    const getAllGames = useCallback(async (search = "") => {
        const params = search ? { search } : {};
        const { data } = await axios.get("/api/games", { params });
        return data;
    }, []);

    const getGameById = useCallback(async (id) => {
        const { data } = await axios.get(`/api/games/${id}`);
        return data;
    }, []);

    // NOUVEAU : Récupération des statistiques avancées
    const getAdvancedStats = useCallback(async () => {
        // D'après ton contrôleur back-end, res.json(stats) renvoie directement l'objet
        const { data } = await axios.get("/api/games/stats/advanced");
        return data; 
    }, []);

    const createGame = async (gameData) => {
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
        getAdvancedStats, // Exporte bien la nouvelle fonction
        createGame,
        updateGame,
        deleteGame
    };
};