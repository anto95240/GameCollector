// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { useApiAuth } from "../hooks/api/useApiAuth";

// 1. Création du contexte
const AuthContext = createContext(null);

// 2. Le Provider (qui va envelopper l'app)
export const AuthProvider = ({ children }) => {
    const { getMe } = useApiAuth();
    
    // Initialisation immédiate via LocalStorage (pour la rapidité)
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem("user");
        return saved ? JSON.parse(saved) : null;
    });

    // Fonction pour mettre à jour l'utilisateur (utile après une modif de profil)
    const updateUser = (newUser) => {
        setUser(newUser);
        if (newUser) {
            localStorage.setItem("user", JSON.stringify(newUser));
        } else {
            localStorage.removeItem("user");
        }
    };

    // Vérification en arrière-plan via API (Sécurité & Mise à jour)
    useEffect(() => {
        const checkUser = async () => {
            try {
                // On vérifie seulement si on a un token (supposé géré par axios/interceptor)
                // ou si on veut forcer la vérif au chargement
                const freshUser = await getMe();
                if (freshUser) {
                    updateUser(freshUser);
                }
            } catch (error) {
                console.error("Session expirée ou erreur:", error);
                // Optionnel : updateUser(null) si tu veux déconnecter en cas d'erreur
            }
        };
        
        checkUser();
    }, []); // S'exécute une fois au montage de l'app

    return (
        <AuthContext.Provider value={{ user, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

// 3. Le Hook personnalisé pour consommer le contexte facilement
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
    }
    return context;
};