import axios from "@/config/interceptor"; 
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

    const getAdvancedStats = useCallback(async () => {
        const { data } = await axios.get("/api/games/stats/advanced");
        return data; 
    }, []);

    const getFuzzyGames = useCallback(async (search = "") => {
        const payload = {
            search,
            q: search,
            query: search,
            term: search,
        };

        try {
            const { data } = await axios.get("/api/search/fuzzy", { params: payload });
            return data;
        } catch (getError) {
            const { data } = await axios.post("/api/search/fuzzy", payload);
            return data;
        }
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
        getAdvancedStats, 
        getFuzzyGames,
        createGame,
        updateGame,
        deleteGame
    };
};