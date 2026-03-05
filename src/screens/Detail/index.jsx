import { useState, useEffect, useLayoutEffect } from "react"; 
import { useParams, useNavigate, useLocation } from "react-router";

import DetailHeader from "../../components/main/Detail/DetailHeader";
import DetailHero from "../../components/main/Detail/DetailHero";
import DetailInfoGrid from "../../components/main/Detail/DetailInfoGrid";
import DetailFooter from "../../components/main/Detail/DetailFooter";

import { useApiGame } from "../../hooks/api/useApiGame";
import { useApiMetadata } from "../../hooks/api/useApiMetadata";

import "./Detail.css";

const DetailPage = () => {
    const { id, gameName, slug } = useParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Ajout de updateGame ici
    const { getAllGames, getGameById, deleteGame, updateGame } = useApiGame();
    const { getAllMetadata } = useApiMetadata();

    const [game, setGame] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGameData = async () => {
            setIsLoading(true);
            try {
                const meta = await getAllMetadata();
                let fetchedGame = null;

                if (id) {
                    fetchedGame = await getGameById(id);
                } else {
                    const gamesData = await getAllGames();
                    const gamesList = Array.isArray(gamesData) ? gamesData : gamesData.games || [];
                    fetchedGame = gamesList.find(g => 
                        g.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') === (slug || gameName)
                    );
                }

                if (fetchedGame) {
                    const genre = meta.genres?.find(g => g._id === (fetchedGame.genre_id?._id || fetchedGame.genre_id))?.genre_name;
                    const platform = meta.platforms?.find(p => p._id === (fetchedGame.platform_id?._id || fetchedGame.platform_id))?.platform_name;
                    const status = meta.statuses?.find(s => s._id === (fetchedGame.status_id?._id || fetchedGame.status_id))?.status_name;
                    const tags = fetchedGame.tags_ids?.map(tagId => {
                        const found = meta.tags?.find(t => t._id === (tagId?._id || tagId));
                        return found ? found.tag_name : "Tag inconnu";
                    }) || [];

                    setGame({
                        ...fetchedGame,
                        id: fetchedGame._id,
                        genre: genre || "Inconnu",
                        platform: platform || "Inconnu",
                        status: status || "Inconnu",
                        // LOGIQUE DE POSSESSION : possédé si le statut n'est pas wishlist
                        isOwned: status?.toLowerCase() !== 'wishlist',
                        // ASSURER LA RÉCUPÉRATION DU FAVORIS (ajuster 'isFavorite' selon le nom en base de données)
                        isFavorite: fetchedGame.isFavorite || false, 
                        tags: tags,
                        rating: fetchedGame.note || 0,
                        playtime: fetchedGame.playing_time ? `${fetchedGame.playing_time}h` : "N/A",
                        achievements: fetchedGame.succes || "N/A",
                        userNotes: fetchedGame.comment || "",
                        addedDate: new Date(fetchedGame.createdAt).toLocaleDateString("fr-FR"),
                        image: fetchedGame.image?.startsWith('http') ? fetchedGame.image : `${import.meta.env.VITE_API_URL}${fetchedGame.image}`                    
                    });
                }
            } catch (error) {
                console.error("Erreur de chargement des détails du jeu", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGameData();
    }, [id, slug, gameName]);

    useLayoutEffect(() => {
        const scrollContainer = document.querySelector('.layout-container');
        if (scrollContainer) scrollContainer.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [pathname, slug]);

    const handleEdit = () => {
        if (game) navigate("/game/add-edit-game", { state: { game } });
    };

    const handleDelete = async () => {
        if (game && window.confirm("Voulez-vous vraiment supprimer ce jeu ?")) {
            try {
                await deleteGame(game._id);
                navigate("/liste");
            } catch (error) {
                console.error("Erreur de suppression", error);
            }
        }
    };

    // GESTION DU CLIC SUR LE BOUTON FAVORIS
    const handleToggleFavorite = async () => {
    if (!game) return;
    const newFavoriteState = !game.isFavorite;

    // Mise à jour optimiste
    setGame(prev => ({ ...prev, isFavorite: newFavoriteState }));

    try {
        // On construit un payload "propre" qui respecte strictement gameSchema (Joi)
        const payload = {
            name: game.name,
            description: game.description || "",
            year: game.year || "",
            image: game.image || "", 
            
            // On extrait de force uniquement les strings de 24 caractères (les _id)
            status_id: game.status_id?._id || game.status_id,
            genre_id: game.genre_id?._id || game.genre_id,
            platform_id: game.platform_id?._id || game.platform_id,
            tags_ids: game.tags_ids?.map(t => t?._id || t) || [],
            
            isSoon: game.isSoon || false,
            isFavorite: newFavoriteState, // Notre nouvelle valeur
            note: game.note || "",
            comment: game.comment || "",
            playing_time: game.playing_time || "",
            developer: game.developer || "",
            succes: game.succes || ""
        };

        // Appel API
        await updateGame(game._id, payload);
    } catch (error) {
        console.error("Erreur lors de la mise à jour du favoris", error);
        // Annulation en cas d'erreur
        setGame(prev => ({ ...prev, isFavorite: !newFavoriteState }));
    }
};

    if (isLoading) return <div className="detail-layout fade-in flex items-center justify-center"><p className="loading-text">Chargement...</p></div>;
    if (!game) return <div className="detail-layout fade-in flex items-center justify-center"><p className="loading-text">Jeu introuvable.</p></div>;

    return (
        <div className="detail-layout fade-in">
            <DetailHeader onEdit={handleEdit} onDelete={handleDelete} />
            {/* On passe la fonction en prop */}
            <DetailHero game={game} onToggleFavorite={handleToggleFavorite} />
            <DetailInfoGrid game={game} />
            <DetailFooter />
        </div>
    );
};

export default DetailPage;