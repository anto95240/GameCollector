import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useGameFiltering } from "../../hooks/components/useGameFiltering";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { useActiveOnScroll } from "../../hooks/components/useActiveOnScroll";

import ListeHeader from "../../components/secondary/Liste/ListeHeader";
import FilterPanel from "../../components/secondary/Liste/filtre/FilterPanel";
import Pagination from "../../components/secondary/Liste/Pagination";
import GameCard from "../../components/common/GameCard";
import LoadingButton from "../../components/common/LoadingButton";

import { useApiGame } from "../../hooks/api/useApiGame";
import { useApiMetadata } from "../../hooks/api/useApiMetadata";

import "./Liste.css";

const ListePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { getAllGames, deleteGame, updateGame } = useApiGame();
  const { getAllMetadata } = useApiMetadata();

  const [games, setGames] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Pour la searchbar et les filtres frontend
  const { 
      searchTerm, setSearchTerm, 
      selectedFilters, handleSelectFilter, removeFilter, clearAllFilters,
      page, setPage, filteredGames 
  } = useGameFiltering(games);

  const fetchGamesAndMeta = useCallback(async () => {
    setIsLoading(true);
    try {
      const [gamesData, metaData] = await Promise.all([
        // On passe searchTerm à l'API pour qu'elle filtre les résultats côté backend !
        getAllGames(searchTerm), 
        getAllMetadata()
      ]);
      setMetadata(metaData);

      const rawGames = Array.isArray(gamesData) ? gamesData : gamesData.games || [];
      
      const mappedGames = rawGames.map(game => ({
        ...game,
        id: game._id, 
        genre: metaData.genres?.find(g => g._id === (game.genre_id?._id || game.genre_id))?.genre_name || "Inconnu",
        platform: metaData.platforms?.find(p => p._id === (game.platform_id?._id || game.platform_id))?.platform_name || "Inconnu",
        status: metaData.statuses?.find(s => s._id === (game.status_id?._id || game.status_id))?.status_name || "Inconnu",
        rating: game.note ? `${Math.floor(game.note)} étoiles` : "Non noté",
        image: game.image?.startsWith('http') ? game.image : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${game.image}`
      }));
      
      setGames(mappedGames);
    } catch (error) {
      console.error("Erreur de chargement des jeux", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, getAllGames, getAllMetadata]); // Relance si searchTerm change

  // On écoute searchTerm avec un léger délai pour ne pas spammer l'API (debounce basique)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
        fetchGamesAndMeta();
    }, 300); // Attend 300ms après la dernière frappe avant d'appeler l'API
    return () => clearTimeout(timeoutId);
  }, [fetchGamesAndMeta]);

  const filterData = useMemo(() => {
    if (!metadata) return [];
    const years = [...new Set(games.map(g => g.year).filter(Boolean))].sort((a, b) => b - a).map(String);

    return [
      { id: "genre", label: "Genre", options: metadata.genres?.map(g => g.genre_name) || [] },
      { id: "platform", label: "Plateforme", options: metadata.platforms?.map(p => p.platform_name) || [] },
      { id: "year", label: "Année", options: years },
      { id: "rating", label: "Note", options: ["5 étoiles", "4 étoiles", "3 étoiles", "2 étoiles", "1 étoiles"] },
      { id: "status", label: "Statut", options: metadata.statuses?.map(s => s.status_name) || [] },
      { id: "favorite", label: "Favoris", options: ["Nos favoris", "Pas en favoris"] },
      { id: "soon", label: "Prochainement", options: ["Prochainement", "Déjà possédé"] },
    ];
  }, [metadata, games]);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);
  
  const [gameToDelete, setGameToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const scrollRef = useRef(null);
  const pageSize = 8;
  const totalPages = Math.ceil(filteredGames.length / pageSize) || 1;

  const paginatedGames = filteredGames.slice((page - 1) * pageSize, page * pageSize);
  const activeId = useActiveOnScroll(scrollRef, ".observer-item", paginatedGames);

  const scroll = (direction) => {
    if (scrollRef.current) {
        const { current } = scrollRef;
        const scrollAmount = 300; 
        if (direction === "left") current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        else current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleToggleMenu = (index, e) => {
      e.stopPropagation();
      setActiveMenuIndex(activeMenuIndex === index ? null : index);
  };

  const closeMenu = () => setActiveMenuIndex(null);

  const handleToggleFavorite = async (clickedGame) => {
      const newFavoriteState = !clickedGame.isFavorite;

      // Mise à jour optimiste : on modifie juste le jeu concerné dans le state 'games'
      setGames(prevGames => prevGames.map(g => 
          g.id === clickedGame.id ? { ...g, isFavorite: newFavoriteState } : g
      ));

      try {
          // Payload strict pour Joi
          const payload = {
              name: clickedGame.name,
              description: clickedGame.description || "",
              year: clickedGame.year || "",
              image: clickedGame.image || "", 
              status_id: clickedGame.status_id?._id || clickedGame.status_id,
              genre_id: clickedGame.genre_id?._id || clickedGame.genre_id,
              platform_id: clickedGame.platform_id?._id || clickedGame.platform_id,
              tags_ids: clickedGame.tags_ids?.map(t => t?._id || t) || [],
              isSoon: clickedGame.isSoon || false,
              isFavorite: newFavoriteState,
              note: clickedGame.note || "",
              comment: clickedGame.comment || "",
              playing_time: clickedGame.playing_time || "",
              developer: clickedGame.developer || "",
              succes: clickedGame.succes || ""
          };

          await updateGame(clickedGame.id, payload);
      } catch (error) {
          console.error("Erreur lors de la mise à jour du favoris", error);
          // On annule en cas d'erreur
          setGames(prevGames => prevGames.map(g => 
              g.id === clickedGame.id ? { ...g, isFavorite: !newFavoriteState } : g
          ));
      }
  };

  const confirmDelete = () => {
      if (!gameToDelete) return;
      const id = gameToDelete.id;
      setGameToDelete(null);
      setDeletingId(id); // Déclenche l'animation CSS (glissement vers le haut)
      
      // Attend la fin de l'animation CSS (0.4s) pour supprimer de la base et actualiser
      setTimeout(async () => {
          try {
              await deleteGame(id);
              await fetchGamesAndMeta(); // Rafraîchit la liste proprement
          } catch (error) {
              console.error("Erreur lors de la suppression", error);
          } finally {
              setDeletingId(null);
          }
      }, 400); 
  };

  return (
    <div className="liste-page-container w-full flex flex-col" onClick={closeMenu}>
      <ListeHeader 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)} 
        t={t}
        onClick={() => navigate("/game/add-edit-game")}
      />

      <div className="main-stage">
        {isLoading && games.length === 0 ? (
            <p className="loading-text" style={{textAlign: "center", width: "100%", marginTop: "50px"}}>Chargement...</p>
        ) : (
            <div className="list-carousel mx-auto">
                <button className="list-arrow arrow-left" onClick={(e) => { e.stopPropagation(); scroll("left"); }}>
                    <FontAwesomeIcon icon={faChevronLeft} />
                </button>

                <div className="cards-wrapper mx-auto" ref={scrollRef}>
                {paginatedGames.length > 0 ? (
                    paginatedGames.map((game, index) => (
                        <div 
                            key={game.id} 
                            /* La classe "deleting" s'ajoute ici pendant 400ms */
                            className={`console-entry-anim observer-item ${deletingId === game.id ? 'deleting' : ''}`} 
                            data-id={String(game.id)} 
                        > 
                            <GameCard 
                                game={game}
                                index={index}
                                variant="list"
                                isActive={activeId === String(game.id)} 
                                activeMenuIndex={activeMenuIndex}
                                onToggleMenu={handleToggleMenu}
                                onDeleteRequest={() => setGameToDelete(game)}
                                onToggleFavorite={handleToggleFavorite}
                                t={t}
                            />
                        </div>
                    ))
                ) : (
                    <p className="no-result-text m-auto">{t('gameList.noGame')}</p>
                )}

                <div className="shrink-0 observer-item"> 
                    <GameCard variant="add" t={t} onClick={() => navigate("/game/add-edit-game")} />
                </div>
                </div>

                <button className="list-arrow arrow-right" onClick={(e) => { e.stopPropagation(); scroll("right"); }}>
                    <FontAwesomeIcon icon={faChevronRight} />
                </button>
            </div>
        )}
      </div>

      <Pagination 
        page={page} 
        totalPages={totalPages} 
        onPrev={() => setPage(p => Math.max(1, p - 1))} 
        onNext={() => setPage(p => Math.min(totalPages, p + 1))} 
        onFirst={() => setPage(1)}
        onLast={() => setPage(totalPages)}
      />

      <FilterPanel 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        selectedFilters={selectedFilters}
        onRemoveFilter={removeFilter}
        onClearAll={clearAllFilters}
        filterData={filterData}
        onSelectFilter={handleSelectFilter}
        games={games} 
        resultCount={filteredGames.length}
      />

      {gameToDelete && (
        <div className="modal-overlay-liste" onClick={() => setGameToDelete(null)}>
            <div className="modal-liste" onClick={(e) => e.stopPropagation()}>
            <h4 className="modal-title">{t("gameList.confirmDelete.title")}</h4>
            <p className="modal-text">
                {t("gameList.confirmDelete.message")}<br />
                <span className="modal-game-name">"{gameToDelete.name}"</span>
            </p>
            <div className="modal-actions">
                <LoadingButton variant="secondary" text={t("common.cancel")} onClick={() => setGameToDelete(null)} />
                <LoadingButton variant="danger" text={t("gameList.confirmDelete.confirm")} onClick={confirmDelete} />
            </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ListePage;