import { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faGamepad,
  faHeart,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import ListeHeader from "../../components/secondary/Liste/ListeHeader";
import FilterPanel from "../../components/secondary/Liste/filtre/FilterPanel";
import Pagination from "../../components/secondary/Liste/Pagination";
import GameCard from "../../components/common/GameCard";
import DeleteModal from "../../components/secondary/Liste/DeleteModal";
import { useGameFiltering } from "../../hooks/games/useGameFiltering";
import { useActiveOnScroll } from "../../hooks/ui/useActiveOnScroll";
import { useGamesList } from "../../hooks/games/useGamesList";
import { useCarousel } from "../../hooks/ui/useCarousel";
import { useSearchBar } from "../../hooks/ui/useSearchBar";
import { useSearchBarShortcuts } from "../../hooks/ui/useSearchBarShortcuts";
import "./Liste.css";

const ListePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const { searchTerm, setSearchTerm, debouncedTerm } = useSearchBar("");
  useSearchBarShortcuts(searchInputRef);
  
  const { games, metadata, isLoading, toggleFavorite, toggleSoon, removeGame } = useGamesList(debouncedTerm);

  const {
    selectedFilters,
    handleSelectFilter,
    removeFilter,
    clearAllFilters,
    page,
    setPage,
    filteredGames,
  } = useGameFiltering(games);

  const { scrollRef, scroll } = useCarousel();
  const [activeTab, setActiveTab] = useState("all"); 
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);
  const [gameToDelete, setGameToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filtrage par onglet basé sur les données MongoDB (isSoon / isFavorite)[cite: 3, 5]
  const tabFilteredGames = useMemo(() => {
    if (activeTab === "favorites") {
      return filteredGames.filter((game) => game.isFavorite === true);
    }
    if (activeTab === "wishlist") {
      return filteredGames.filter((game) => game.isSoon === true);
    }
    return filteredGames;
  }, [filteredGames, activeTab]);

  const pageSize = 8;
  const totalPages = Math.ceil(tabFilteredGames.length / pageSize) || 1;
  const paginatedGames = tabFilteredGames.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const activeId = useActiveOnScroll(scrollRef, ".observer-item", paginatedGames);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [page, activeTab]);

  const confirmDelete = () => {
    if (!gameToDelete) return;
    const id = gameToDelete.id;
    setDeletingId(id);
    setGameToDelete(null);
    setTimeout(async () => {
      await removeGame(id);
      setDeletingId(null);
    }, 400);
  };

  return (
    <div className="liste-page-container w-full flex flex-col" onClick={() => setActiveMenuIndex(null)}>
      <ListeHeader
        ref={searchInputRef}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        t={t}
        onClick={() => navigate("/game/add-edit-game")}
        totalGames={tabFilteredGames.length}
      />

      {/* Onglets Responsives */}
      <div className="list-tabs-navigation">
        <button className={`tab-link ${activeTab === 'all' ? 'is-active' : ''}`} onClick={() => handleTabChange('all')}>
          <FontAwesomeIcon icon={faGamepad} className="tab-icon" />
          <span className="tab-text">Tous</span>
        </button>
        <button className={`tab-link ${activeTab === 'favorites' ? 'is-active' : ''}`} onClick={() => handleTabChange('favorites')}>
          <FontAwesomeIcon icon={faHeart} className="tab-icon" />
          <span className="tab-text">Favoris</span>
        </button>
        <button className={`tab-link ${activeTab === 'wishlist' ? 'is-active' : ''}`} onClick={() => handleTabChange('wishlist')}>
          <FontAwesomeIcon icon={faClock} className="tab-icon" />
          <span className="tab-text">Wishlist</span>
        </button>
      </div>

      <div className="main-stage">
        {isLoading && games.length === 0 ? (
          <p className="loading-text text-center w-full mt-12">Chargement...</p>
        ) : (
          <div className="list-carousel mx-auto tab-content-anim" key={activeTab}>
            <button className="list-arrow arrow-left" onClick={(e) => { e.stopPropagation(); scroll("left"); }}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className="cards-wrapper mx-auto" ref={scrollRef}>
              {paginatedGames.length > 0 ? (
                <>
                  {paginatedGames.map((game, index) => (
                    <div key={`${activeTab}-${game.id}`} data-id={String(game.id)} className={`console-entry-anim observer-item ${deletingId === game.id ? "deleting" : ""}`}>
                      <GameCard
                        game={game}
                        index={index}
                        variant="list"
                        isActive={activeId === String(game.id)}
                        activeMenuIndex={activeMenuIndex}
                        onToggleMenu={(i, e) => { e.stopPropagation(); setActiveMenuIndex(activeMenuIndex === i ? null : i); }}
                        onDeleteRequest={() => setGameToDelete(game)}
                        onToggleFavorite={toggleFavorite}
                        t={t}
                      />
                    </div>
                  ))}
                  <div className="shrink-0 observer-item">
                    <GameCard variant="add" t={t} onClick={() => navigate("/game/add-edit-game")} />
                  </div>
                </>
              ) : (
                <p className="no-result-text m-auto">Aucun jeu trouvé</p>
              )}
            </div>
            <button className="list-arrow arrow-right" onClick={(e) => { e.stopPropagation(); scroll("right"); }}>
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}
      </div>
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          onFirst={() => setPage(1)}
          onLast={() => setPage(totalPages)}
        />
      )}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        selectedFilters={selectedFilters}
        onRemoveFilter={removeFilter}
        onClearAll={clearAllFilters}
        filterData={[]} 
        onSelectFilter={handleSelectFilter}
        games={games}
        resultCount={tabFilteredGames.length}
      />
      <DeleteModal game={gameToDelete} onClose={() => setGameToDelete(null)} onConfirm={confirmDelete} t={t} />
    </div>
  );
};

export default ListePage;