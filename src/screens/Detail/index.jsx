import React, { useLayoutEffect, useEffect } from "react"; // Ajout de useEffect
import { useParams, useNavigate, useLocation } from "react-router";

// Composants refactorisés
import DetailHeader from "../../components/main/Detail/DetailHeader";
import DetailHero from "../../components/main/Detail/DetailHero";
import DetailInfoGrid from "../../components/main/Detail/DetailInfoGrid";
import DetailFooter from "../../components/main/Detail/DetailFooter";

import "./detail.css";

// MOCK DATA (À remplacer par appel API ou Hook)
const MOCK_DB = [
    { 
        id: "1", 
        name: "God of War Ragnarök", 
        tags: ["Action", "Aventure", "Mythologie", "Violent"],
        description: "Le Fimbulvetr est en cours. Kratos et Atreus doivent voyager vers chacun des Neuf Royaumes à la recherche de réponses alors que les forces d'Asgard se préparent pour la bataille prophétisée qui mettra fin au monde.",
        rating: 5,
        status: "Terminé",
        isOwned: true,
        isFavorite: true,
        addedDate: "12/01/2025",
        platform: "PlayStation 5",
        playtime: "45h",
        achievements: "20/45",
        developer: "Santa Monica",
        year: "2022",
        genre: "Action-RPG",
        image: "https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png",
        userNotes: "Un chef d'oeuvre absolu. Le système de combat est nerveux et l'histoire est poignante."
    }
];

const DetailPage = () => {
    const { gameName, slug } = useParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Logique de récupération
    const game = MOCK_DB.find(g => 
        g.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') === gameName
    ) || { ...MOCK_DB[0], name: gameName || "Jeu Inconnu" };

    useLayoutEffect(() => {
        // On cible le conteneur qui a le scroll (layout-container dans votre AppLayout)
        const scrollContainer = document.querySelector('.layout-container');
        if (scrollContainer) {
            scrollContainer.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }
    }, [pathname, slug]);

    const handleEdit = () => {
        navigate("/game/add-edit-game", { state: { game: game } });
    };

    return (
        <div className="detail-layout fade-in">
            <DetailHeader 
                onEdit={handleEdit}
                onDelete={() => console.log("Delete")} 
            />

            <DetailHero game={game} />
            
            <DetailInfoGrid game={game} />
            
            <DetailFooter />
        </div>
    );
};

export default DetailPage;