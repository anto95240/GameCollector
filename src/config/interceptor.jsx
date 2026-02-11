import axios from "axios";

// Utilisez une variable d'environnement ou localhost par défaut
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";

axios.defaults.baseURL = baseURL;

// CRUCIAL : Permet d'envoyer et recevoir les cookies du backend
axios.defaults.withCredentials = true; 

axios.interceptors.request.use(
    (config) => {
        // Plus besoin de config.headers.Authorization = ... 
        // Le navigateur gère le cookie automatiquement.
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Si le cookie est expiré ou invalide, le back renvoie 401
        if (error.response && error.response.status === 401) {
            // On nettoie le localStorage (qui contient juste les infos user, pas le token)
            localStorage.removeItem("user");
            
            // Redirection vers login sauf si on y est déjà
            if (window.location.pathname !== "/" && window.location.pathname !== "/register") {
                window.location.href = "/";
            }
        }
        return Promise.reject(error);
    }
);

export default axios;