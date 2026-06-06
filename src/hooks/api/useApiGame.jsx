import { useCallback } from "react";

import axios from "@/config/interceptor"; 
import CacheInvalidationService from "@/services/cacheInvalidationService";

import cacheManager from "./utils/cacheManager";

export const useApiGame = () => {

    const getAllGames = useCallback(async (search = "") => {
        const cacheKey = `game:all:${search}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const params = search ? { search } : {};
        const { data } = await axios.get("/api/games", { params });
        cacheManager.set(cacheKey, data);
        return data;
    }, []);

    const getGameById = useCallback(async (id) => {
        const cacheKey = `game:detail:${id}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const { data } = await axios.get(`/api/games/${id}`);
        cacheManager.set(cacheKey, data);
        return data;
    }, []);

    const getAdvancedStats = useCallback(async () => {
        const cacheKey = `game:stats:advanced`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const { data } = await axios.get("/api/games/stats/advanced");
        cacheManager.set(cacheKey, data, 10 * 60 * 1000); 
        return data; 
    }, []);

    const getFuzzyGames = useCallback(async (search = "") => {
        const cacheKey = `game:fuzzy:${search}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const payload = {
            search,
            q: search,
            query: search,
            term: search,
        };

        try {
            const { data } = await axios.get("/api/search/fuzzy", { params: payload });
            cacheManager.set(cacheKey, data);
            return data;
        } catch (getError) {
            const { data } = await axios.post("/api/search/fuzzy", payload);
            cacheManager.set(cacheKey, data);
            return data;
        }
    }, []);

    const createGame = async (gameData) => {
        const { data } = await axios.post("/api/games", gameData);
        CacheInvalidationService.invalidateGameCaches();
        return data;
    };

    const updateGame = async (id, gameData) => {
        const { data } = await axios.put(`/api/games/${id}`, gameData);
        CacheInvalidationService.invalidateGameCaches();
        return data;
    };

    const deleteGame = async (id) => {
        const { data } = await axios.delete(`/api/games/${id}`);
        CacheInvalidationService.invalidateGameCaches();
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