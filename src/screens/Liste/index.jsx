import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
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

import "./Liste.css";

const ListePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { searchTerm, setSearchTerm, debouncedTerm } = useSearchBar("");
  const { games, metadata, isLoading, toggleFavorite, removeGame } =
    useGamesList(debouncedTerm);

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

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);
  const [gameToDelete, setGameToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const pageSize = 8;
  const totalPages = Math.ceil(filteredGames.length / pageSize) || 1;
  const paginatedGames = filteredGames.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const activeId = useActiveOnScroll(
    scrollRef,
    ".observer-item",
    paginatedGames,
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [debouncedTerm, selectedFilters, page]);

  const filterData = useMemo(() => {
    if (!metadata) return [];
    const years = [...new Set(games.map((g) => g.year).filter(Boolean))]
      .sort((a, b) => b - a)
      .map(String);
    return [
      {
        id: "genre",
        label: "Genre",
        options: metadata.genres?.map((g) => g.genre_name) || [],
      },
      {
        id: "platform",
        label: "Plateforme",
        options: metadata.platforms?.map((p) => p.platform_name) || [],
      },
      { id: "year", label: "Année", options: years },
      {
        id: "rating",
        label: "Note",
        options: [
          "5 étoiles",
          "4 étoiles",
          "3 étoiles",
          "2 étoiles",
          "1 étoiles",
        ],
      },
      {
        id: "status",
        label: "Statut",
        options: metadata.statuses?.map((s) => s.status_name) || [],
      },
      {
        id: "favorite",
        label: "Favoris",
        options: ["Nos favoris", "Pas en favoris"],
      },
      {
        id: "soon",
        label: "Prochainement",
        options: ["Prochainement", "Déjà possédé"],
      },
    ];
  }, [metadata, games]);

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
    <div
      className="liste-page-container w-full flex flex-col"
      onClick={() => setActiveMenuIndex(null)}
    >
      <ListeHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        t={t}
        onClick={() => navigate("/game/add-edit-game")}
        totalGames={filteredGames.length}
      />

      <div className="main-stage">
        {isLoading && games.length === 0 ? (
          <p className="loading-text text-center w-full mt-12">Chargement...</p>
        ) : (
          <div className="list-carousel mx-auto">
            <button
              className="list-arrow arrow-left"
              onClick={(e) => {
                e.stopPropagation();
                scroll("left");
              }}
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>

            <div className="cards-wrapper mx-auto" ref={scrollRef}>
              {paginatedGames.length > 0 ? (
                <>
                  {paginatedGames.map((game, index) => (
                    <div
                      key={game.id}
                      data-id={String(game.id)}
                      className={`console-entry-anim observer-item ${deletingId === game.id ? "deleting" : ""}`}
                    >
                      <GameCard
                        game={game}
                        index={index}
                        variant="list"
                        isActive={activeId === String(game.id)}
                        activeMenuIndex={activeMenuIndex}
                        onToggleMenu={(i, e) => {
                          e.stopPropagation();
                          setActiveMenuIndex(activeMenuIndex === i ? null : i);
                        }}
                        onDeleteRequest={() => setGameToDelete(game)}
                        onToggleFavorite={toggleFavorite}
                        t={t}
                      />
                    </div>
                  ))}

                  <div className="shrink-0 observer-item">
                    <GameCard
                      variant="add"
                      t={t}
                      onClick={() => navigate("/game/add-edit-game")}
                    />
                  </div>
                </>
              ) : (
                <p className="no-result-text m-auto">Aucun jeu trouvé</p>
              )}
            </div>

            <button
              className="list-arrow arrow-right"
              onClick={(e) => {
                e.stopPropagation();
                scroll("right");
              }}
            >
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
        filterData={filterData}
        onSelectFilter={handleSelectFilter}
        games={games}
        resultCount={filteredGames.length}
      />

      <DeleteModal
        game={gameToDelete}
        onClose={() => setGameToDelete(null)}
        onConfirm={confirmDelete}
        t={t}
      />
    </div>
  );
};

export default ListePage;
