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
import { useFuzzySearch } from "../../hooks/ui/useFuzzySearch";
import { useSearchBarShortcuts } from "../../hooks/ui/useSearchBarShortcuts";
import { useAuth } from "../../context/AuthContext";
import { useApiFilters } from "../../hooks/api/useApiFilters";
import "./Liste.css";

const ListePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const searchInputRef = useRef(null);
  const { user } = useAuth();
  const { searchTerm, setSearchTerm, debouncedTerm } = useSearchBar("");
  useSearchBarShortcuts(searchInputRef);
  const { getUserFilters, saveUserFilter, deleteUserFilter, setActiveUserFilter } = useApiFilters();
  
  const { games, metadata, isLoading, toggleFavorite, toggleSoon, removeGame } = useGamesList(debouncedTerm);
  const fuzzySearchKeys = useMemo(() => ["name", "genre", "platform", "status", "year"], []);
  const { setQuery, results: fuzzyGames } = useFuzzySearch(games, fuzzySearchKeys);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    console.debug("[liste-search] state", {
      searchTerm,
      debouncedTerm,
      totalGames: games.length,
      fuzzyGames: fuzzyGames.length,
    });
  }, [searchTerm, debouncedTerm, games.length, fuzzyGames.length]);

  const {
    selectedFilters,
    handleSelectFilter,
    removeFilter,
    clearAllFilters,
    page,
    setPage,
    filteredGames,
    setSelectedFilters,
  } = useGameFiltering(fuzzyGames);

  useEffect(() => {
    setQuery(debouncedTerm);
    setPage(1);
  }, [debouncedTerm, setQuery, setPage]);

  const { scrollRef, scroll } = useCarousel();
  const [activeTab, setActiveTab] = useState("all"); 
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);
  const [gameToDelete, setGameToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // --- filter metadata (genres, platforms, years, ratings, statuses)
  const filterData = useMemo(() => {
    if (!games) return [];

    const genres = Array.from(new Set(games.map((g) => g.genre).filter(Boolean))).sort();
    const platforms = Array.from(new Set(games.map((g) => g.platform).filter(Boolean))).sort();
    const years = Array.from(new Set(games.map((g) => Number(g.year)).filter((y) => !Number.isNaN(y))))
      .sort((a, b) => b - a)
      .map(String);
    const ratings = Array.from(new Set(games.map((g) => g.rating).filter((r) => r !== undefined && r !== null))).sort((a, b) => b - a).map(String);
    const statuses = Array.from(new Set(games.map((g) => g.status).filter(Boolean))).sort();

    const minYear = Math.min(...years.map(Number), 1900);
    const maxYear = Math.max(...years.map(Number), new Date().getFullYear());
    const minRating = Math.min(...ratings.map(Number), 0);
    const maxRating = Math.max(...ratings.map(Number), 10);

    return [
      { id: "genre", label: "Genre", options: genres },
      { id: "platform", label: "Plateforme", options: platforms },
      { id: "year", label: "Année", options: years },
      { id: "year_range", label: "Intervalle d'années", type: "range", min: minYear, max: maxYear },
      { id: "rating", label: "Note", options: ratings },
      { id: "rating_range", label: "Plage de notes", type: "range", min: minRating, max: maxRating },
      { id: "status", label: "Statut", options: statuses },
      { id: "favorite", label: "Favoris", options: ["Nos favoris", "Non favoris"] },
      { id: "soon", label: "Prochainement", options: ["Prochainement", "Pas prochainement"] },
      { id: "sort", label: "Trier par", type: "sort", options: ["Nom", "Année", "Note"] },
    ];
  }, [games]);

  // Saved filters (localStorage + placeholder for DB)
  const SAVED_KEY = "savedFilters";
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  const persistSaved = (items) => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(items));
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const loadSavedFilters = async () => {
      if (!user) return;

      try {
        const serverFilters = await getUserFilters();
        if (Array.isArray(serverFilters)) {
          const normalized = serverFilters.map((filter) => ({ ...filter, source: "server" }));
          setSavedFilters(normalized);
          persistSaved(normalized);
        }
      } catch (error) {
        // fallback to localStorage already loaded
      }
    };

    loadSavedFilters();
  }, [user, getUserFilters]);

  const normalizeSavedFilter = (entry) => ({
    id: entry.id || entry._id,
    name: entry.name,
    description: entry.description || "",
    filters: entry.filters || [],
    source: entry.source || "local",
    isActive: Boolean(entry.isActive),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  });

  const handleSaveCurrentFilters = (name) => {
    const baseEntry = normalizeSavedFilter({
      id: String(Date.now()),
      name: name || `Filtre ${new Date().toLocaleString()}`,
      filters: selectedFilters,
      source: user ? "server" : "local",
    });

    const next = [baseEntry, ...savedFilters.filter((filter) => filter.id !== baseEntry.id)];

    const sync = async () => {
      if (!user) {
        setSavedFilters(next);
        persistSaved(next);
        return;
      }

      const savedOnServer = await saveUserFilter({
        name: baseEntry.name,
        selectedFilters,
        description: JSON.stringify({ selectedFilters }),
        isActive: false,
      });

      const merged = normalizeSavedFilter({
        ...baseEntry,
        ...savedOnServer,
        source: "server",
      });

      const updated = [merged, ...savedFilters.filter((filter) => filter.id !== merged.id)];
      setSavedFilters(updated);
      persistSaved(updated);
    };

    sync().catch(() => {
      setSavedFilters(next);
      persistSaved(next);
    });
  };

  const handleApplySaved = (entry) => {
    if (!entry || !entry.filters) return;
    setSelectedFilters(entry.filters || []);
    setIsFilterOpen(false);
    setPage(1);

    if (user && entry.source === "server" && entry.id) {
      setActiveUserFilter(entry.id).catch(() => {});
    }
  };

  const handleDeleteSaved = (id) => {
    const target = savedFilters.find((s) => s.id === id);
    const next = savedFilters.filter((s) => s.id !== id);
    setSavedFilters(next);
    persistSaved(next);

    if (user && target?.source === "server") {
      deleteUserFilter(id).catch(() => {});
    }
  };

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

  // Apply sorting if a sort filter is present
  const sortedGames = useMemo(() => {
    if (!tabFilteredGames) return [];
    const sortTag = selectedFilters.find((s) => {
      const key = s.split(":")[0] || "";
      return key.toLowerCase().includes("trier") || key.toLowerCase().includes("sort");
    });

    if (!sortTag) return tabFilteredGames;

    const sortValue = sortTag.split(": ")[1] || "";
    const [sortFieldRaw, sortOrderRaw = "asc"] = sortValue.split("|");
    const sortField = sortFieldRaw || "Nom";
    const sortOrder = sortOrderRaw || "asc";
    const direction = sortOrder === "desc" ? -1 : 1;
    const copy = [...tabFilteredGames];
    switch (sortField) {
      case "Nom":
        copy.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")) * direction);
        break;
      case "Année":
        copy.sort((a, b) => (Number(a.year || 0) - Number(b.year || 0)) * direction);
        break;
      case "Note":
        copy.sort((a, b) => (Number(a.rating || 0) - Number(b.rating || 0)) * direction);
        break;
      default:
        break;
    }
    return copy;
  }, [tabFilteredGames, selectedFilters]);

  const pageSize = 8;
  const totalPages = Math.ceil(sortedGames.length / pageSize) || 1;
  const paginatedGames = sortedGames.slice((page - 1) * pageSize, page * pageSize);

  const activeId = useActiveOnScroll(scrollRef, ".observer-item", paginatedGames);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: "instant" });
    }
  }, [page, activeTab, selectedFilters]);

  const confirmDelete = () => {
    if (!gameToDelete) return;
    const id = gameToDelete.id;
    setDeletingId(id);
    setGameToDelete(null);
    setTimeout(async () => {
      await removeGame(id);
      setDeletingId(null);
    }, 700);
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
        filterData={filterData}
        onSelectFilter={handleSelectFilter}
        games={games}
        resultCount={sortedGames.length}
        savedFilters={savedFilters}
        onSaveCurrentFilters={handleSaveCurrentFilters}
        onApplySaved={handleApplySaved}
        onDeleteSaved={handleDeleteSaved}
      />
      <DeleteModal game={gameToDelete} onClose={() => setGameToDelete(null)} onConfirm={confirmDelete} t={t} />
    </div>
  );
};

export default ListePage;