import axios from "../../config/interceptor";
import { useCallback } from "react";

export const useApiMetadata = () => {

    const getAllMetadata = useCallback(async () => {
        const { data } = await axios.get("/api/metadata");
        return data; 
    }, []);

    const getMetadataByType = useCallback(async (type) => {
        const { data } = await axios.get(`/api/metadata/${type}`);
        return data;
    }, []);

    const createMetadata = async (type, itemData) => {
        const { data } = await axios.post(`/api/metadata/${type}`, itemData);
        return data;
    };

    const updateMetadata = async (type, id, itemData) => {
        const { data } = await axios.put(`/api/metadata/${type}/${id}`, itemData);
        return data;
    };

    const deleteMetadata = async (type, id) => {
        const { data } = await axios.delete(`/api/metadata/${type}/${id}`);
        return data;
    };

    return {
        getAllMetadata,
        getMetadataByType,
        createMetadata,
        updateMetadata,
        deleteMetadata
    };
};