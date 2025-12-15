import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
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

  const { 
      searchTerm, setSearchTerm, 
      selectedFilters, handleSelectFilter, removeFilter, clearAllFilters,
      page, setPage, filteredGames 
  } = useGameFiltering(MOCK_GAMES);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);
  
  const scrollRef = useRef(null);
  const pageSize = 4;
  const totalPages = Math.ceil(filteredGames.length / pageSize) || 1;

  const paginatedGames = filteredGames.slice((page - 1) * pageSize, page * pageSize);

  // Handlers UI
  const toggleMenu = (index, e) => {
    e.stopPropagation();
    setActiveMenuIndex(activeMenuIndex === index ? null : index);
  };

  const closeMenu = () => setActiveMenuIndex(null);

  return (
    <div className="liste-page-container w-full flex flex-col" onClick={closeMenu}>
      
      <ListeHeader 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)} 
        t={t}
      />

      <div className="main-stage flex items-center justify-start w-full gap-5">
        <div className="cards-wrapper no-scrollbar flex gap-5 mx-auto" ref={scrollRef}>
          {/* Liste des jeux */}
          {paginatedGames.length > 0 ? (
             paginatedGames.map((game, index) => (
                <GameCard 
                  key={game.id}
                  game={game}
                  index={index}
                  variant="list"
                  activeMenuIndex={activeMenuIndex}
                  onToggleMenu={toggleMenu}
                  t={t}
                />
              ))
          ) : (
              <p className="no-result-text" style={{margin: 'auto', color: 'white'}}>Aucun jeu trouvé</p>
          )}

          {/* Carte Ajouter toujours à la fin */}
          <GameCard variant="add" t={t} />
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
      />
    </div>
  );
};

export default ListePage;