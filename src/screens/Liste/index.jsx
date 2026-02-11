import { useState, useRef } from "react";
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

import "./Liste.css";

const FILTER_DATA = [
  { id: "genre", label: "Genre", options: ["Aventure", "Action", "RPG", "FPS", "Simulation"] },
  { id: "platform", label: "Plateforme", options: ["PS4", "PS5", "Xbox One", "Nintendo Switch", "PC"] },
  { id: "year", label: "Année", options: ["2025", "2024", "2023", "2022", "2021", "2020"] },
  { id: "rating", label: "Note", options: ["5 étoiles", "4 étoiles", "3 étoiles", "2 étoiles"] },
  { id: "status", label: "Statut", options: ["Terminé", "En cours", "Pas commencé", "En wishlist"] },
  { id: "favorite", label: "Favoris", options: ["Nos favoris", "Pas en favoris"] },
  { id: "soon", label: "Prochainement", options: ["Prochainement", "Déjà possédé"] },
];

const MOCK_GAMES = [
    { id: 1, name: "The Witcher 3", genre: "RPG", platform: "PC", isFavorite: true, year: 2015 },
    { id: 2, name: "God of War", genre: "Action", platform: "PS5", isFavorite: false, year: 2018 },
    { id: 3, name: "Zelda BOTW", genre: "Aventure", platform: "Nintendo Switch", isFavorite: true, year: 2017 },
    { id: 4, name: "Cyberpunk 2077", genre: "RPG", platform: "PC", isFavorite: false, year: 2020 },
    { id: 5, name: "Elden Ring", genre: "RPG", platform: "PS5", isFavorite: true, year: 2022 },
    { id: 6, name: "Mario Odyssey", genre: "Plateforme", platform: "Nintendo Switch", isFavorite: false, year: 2017 },
];

const ListePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { 
      searchTerm, setSearchTerm, 
      selectedFilters, handleSelectFilter, removeFilter, clearAllFilters,
      page, setPage, filteredGames 
  } = useGameFiltering(MOCK_GAMES);

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
        
        if (direction === "left") {
            current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
        } else {
            current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    }
  };

  const handleToggleMenu = (index, e) => {
      e.stopPropagation();
      setActiveMenuIndex(activeMenuIndex === index ? null : index);
  };

  const closeMenu = () => setActiveMenuIndex(null);

  const confirmDelete = () => {
      if (!gameToDelete) return;
      const id = gameToDelete.id;
      setGameToDelete(null);
      setDeletingId(id);
      setTimeout(() => {
          console.log("Suppression effective terminée");
          setDeletingId(null);
      }, 500); 
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
        
        <div className="list-carousel mx-auto">
            
            {/* Flèche gauche */}
            <button 
                className="list-arrow arrow-left" 
                onClick={(e) => { e.stopPropagation(); scroll("left"); }}
            >
                <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <div className="cards-wrapper mx-auto" ref={scrollRef}>
            {/* Liste des jeux */}
            {paginatedGames.length > 0 ? (
                paginatedGames.map((game, index) => (
                    <div 
                        key={game.id} 
                        className="console-entry-anim observer-item" 
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
                            t={t}
                        />
                    </div>
                ))
            ) : (
                <p className="no-result-text m-auto">{t('gameList.noGame')}</p>
            )}

            {/* Carte Ajouter toujours à la fin */}
            <div className="shrink-0"> 
                <GameCard 
                variant="add" 
                t={t} 
                onClick={() => navigate("/game/add-edit-game")}
                />
            </div>
            </div>

            {/* Flèche droite */}
            <button 
                className="list-arrow arrow-right" 
                onClick={(e) => { e.stopPropagation(); scroll("right"); }}
            >
                <FontAwesomeIcon icon={faChevronRight} />
            </button>
        </div>
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
        filterData={FILTER_DATA}
        onSelectFilter={handleSelectFilter}
        games={MOCK_GAMES} 
        resultCount={filteredGames.length}
      />

      {gameToDelete && (
        <div
            className="modal-overlay-liste"
            onClick={() => setGameToDelete(null)}
        >
            <div
            className="modal-liste"
            onClick={(e) => e.stopPropagation()}
            >
            <h4 className="modal-title">
                {t("gameList.confirmDelete.title")}
            </h4>

            <p className="modal-text">
                {t("gameList.confirmDelete.message")}
                <br />
                <span className="modal-game-name">
                "{gameToDelete.name}"
                </span>
            </p>

            <div className="modal-actions">
                <LoadingButton
                variant="secondary"
                text={t("common.cancel")}
                onClick={() => setGameToDelete(null)}
                />
                <LoadingButton
                variant="danger"
                text={t("gameList.confirmDelete.confirm")}
                onClick={confirmDelete}
                />
            </div>
            </div>
        </div>
        )}
    </div>
  );
};

export default ListePage;