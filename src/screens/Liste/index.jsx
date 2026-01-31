import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useGameFiltering } from "../../hooks/useGameFiltering";

// Composants
import ListeHeader from "../../components/secondary/Liste/ListeHeader";
import FilterPanel from "../../components/secondary/Liste/filtre/FilterPanel";
import Pagination from "../../components/secondary/Liste/Pagination";
import GameCard from "../../components/common/GameCard";

import "./liste.css";

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
  
  // États pour la suppression
  const [gameToDelete, setGameToDelete] = useState(null); // Pour la modale
  const [deletingId, setDeletingId] = useState(null);     // Pour l'animation

  const scrollRef = useRef(null);
  const pageSize = 8;
  const totalPages = Math.ceil(filteredGames.length / pageSize) || 1;

  const paginatedGames = filteredGames.slice((page - 1) * pageSize, page * pageSize);

  // Handlers UI
  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setActiveMenuIndex(activeMenuIndex === index ? null : index);
  };

  const closeMenu = () => setActiveMenuIndex(null);

  const confirmDelete = () => {
      if (!gameToDelete) return;

      const id = gameToDelete.id;
      console.log("Début suppression pour :", gameToDelete.name);

      // 1. Fermer la modale immédiatement
      setGameToDelete(null);

      // 2. Déclencher l'animation sur la carte spécifique
      setDeletingId(id);

      // 3. Attendre la fin de l'animation (500ms définie dans animations.css) avant de supprimer vraiment
      setTimeout(() => {
          // Logique réelle de suppression (API ou mise à jour du state local)
          console.log("Suppression effective terminée");
          
          // Note : Si vous utilisez un state local pour les jeux (ex: setGames), faites le filter ici.
          // Comme MOCK_GAMES est statique ici, l'élément ne disparaitra pas vraiment au reload, 
          // mais visuellement il disparaitra grâce au re-render si vous mettez à jour votre liste source.
          
          setDeletingId(null); // Reset de l'état d'animation
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

      <div className="main-stage flex items-center justify-start w-full gap-5">
        <div className="cards-wrapper no-scrollbar flex gap-5 mx-auto" ref={scrollRef}>
          {/* Liste des jeux */}
          {paginatedGames.length > 0 ? (
             paginatedGames.map((game, index) => (
              // Le wrapper gère l'entrée, la GameCard gère sa propre sortie via className prop
              <div key={game.id} className="console-entry-anim"> 
                <GameCard 
                  game={game}
                  index={index}
                  variant="list"
                  activeMenuIndex={activeMenuIndex}
                  onToggleMenu={toggleMenu}
                  t={t}
                  onDeleteRequest={(g) => setGameToDelete(g)}
                  // On passe la classe de suppression si l'ID correspond
                  className={deletingId === game.id ? "deleting" : ""}
                />
              </div>
            ))
          ) : (
              <p className="no-result-text m-auto">Aucun jeu trouvé</p>
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
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setGameToDelete(null)}>
            <div className="modal bg-[#001128] p-6 rounded-xl border border-[#0068AC]" onClick={(e) => e.stopPropagation()}>
                <h4 className="text-xl mb-4 text-[#5AF2FF] font-title">{t('gameList.confirmDelete.title')}</h4>
                <p className="mb-6 text-white/80">
                    {t('gameList.confirmDelete.message')} <br/>
                    <span className="font-bold text-white mt-2 block">"{gameToDelete.name}"</span>
                </p>
                <div className="modal-actions flex justify-center gap-4">
                    <button className="btn-light px-4 py-2 rounded-lg font-bold" onClick={() => setGameToDelete(null)}>
                        {t('gameList.confirmDelete.cancel')}
                    </button>
                    <button className="btn-red px-4 py-2 rounded-lg font-bold text-white bg-red-600" onClick={confirmDelete}>
                        {t('gameList.confirmDelete.confirm')}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ListePage;