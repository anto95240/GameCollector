import React from "react";
import { useParams } from "react-router";

// Composants refactorisés
import DetailHeader from "../../components/main/detail/DetailHeader";
import DetailHero from "../../components/main/detail/DetailHero";
import DetailInfoGrid from "../../components/main/detail/DetailInfoGrid";
import DetailFooter from "../../components/main/detail/DetailFooter";

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
        achievements: "85%",
        developer: "Santa Monica",
        year: "2022",
        genre: "Action-RPG",
        image: "https://image.api.playstation.com/vulcan/ap/rnd/202207/1210/4xJ8XB3bi888QTLZYdl7Oi0s.png",
        userNotes: "Un chef d'oeuvre absolu. Le système de combat est nerveux et l'histoire est poignante."
    }
];

const DetailPage = () => {
    const { gameName } = useParams();

    // Logique de récupération (peut être extraite dans un hook useGameDetail)
    const game = MOCK_DB.find(g => 
        g.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') === gameName
    ) || { ...MOCK_DB[0], name: gameName || "Jeu Inconnu" };

    return (
        <div className="detail-layout fade-in">
            <DetailHeader 
                onEdit={() => console.log("Edit")} 
                onDelete={() => console.log("Delete")} 
            />

            <DetailHero game={game} />
            
            <DetailInfoGrid game={game} />
            
            <DetailFooter />
        </div>
    );
};

export default DetailPage;