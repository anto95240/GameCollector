import "./GameCard.css";

import React from "react";
import {
  faEllipsisVertical,
  faHeart,
  faPen,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router";

import LazyImage from "@/components/common/LazyImage";
import { formatImageUrl, getOptimizedImageProps } from "@/utils/formatters";
import { createSlug } from "@/utils/helpers/slugGenerator";
import { usePreloadRoute } from "@/hooks/ui/usePreloadRoute";

const GameCard = ({
  game,
  variant = "list",
  index,
  activeMenuIndex,
  onToggleMenu,
  t,
  onDeleteRequest,
  onToggleFavorite,
  onClick,
  className = "",
  isActive = false,
}) => {
  const navigate = useNavigate();
  const { preloadRoute } = usePreloadRoute();

  const getGamePath = () => {
    const name = typeof game === "string" ? game : game?.name;
    return name ? `/game/${createSlug(name)}` : null;
  };

  const handleCardClick = (e) => {
    if (
      e.target.closest(".btn-dots") ||
      e.target.closest(".context-menu") ||
      e.target.closest(".icon-heart")
    ) {
      return;
    }

    if (variant === "add") {
      if (onClick) onClick();
      return;
    }

    const path = getGamePath();
    if (path) {
      navigate(path);
    }
  };

  const handlePreload = () => {
    if (variant === "add") return;
    const path = getGamePath();
    if (path) {
      preloadRoute(path);
    }
  };

  if (variant === "add") {
    return (
      <div
        className={`game-card card-add cursor-pointer ${className}`}
        onClick={handleCardClick}
      >
        <div className="card-add-content">
          <FontAwesomeIcon icon={faPlus} className="plus-icon" />
          <span>{t("gameList.addGame")}</span>
        </div>
      </div>
    );
  }

  const isListVariant = variant === "list";
  const gameName = typeof game === "string" ? game : game.name;

  // Optimized image props with lazy-loading, WebP support, and responsive sizing
  const imageProps = game?.image 
    ? getOptimizedImageProps(game.image, {
        widths: [300, 500, 800],  // Optimized for card display
        autoWebp: true,
      })
    : null;

  return (
    <div
      className={`game-card card-${variant} ${isActive ? "active-mobile" : ""} cursor-pointer ${className}`}
      onClick={handleCardClick}
      onMouseEnter={handlePreload}
      onFocus={handlePreload}
      data-id={game.id || index}
      tabIndex={0}
    >
      {/* Lazy-loaded background image with optimization */}
      {imageProps && (
        <LazyImage
          {...imageProps}
          alt={gameName}
          width={500}
          height={350}
          placeholder="blur"
          placeholderQuality={10}
          className="game-card-image-background"
        />
      )}

      <div className="card-overlay"></div>

      {isListVariant && (
        <div className="card-top">
          <FontAwesomeIcon
            icon={faHeart}
            className={`icon-heart ${game.isFavorite ? "favorite" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleFavorite) onToggleFavorite(game);
            }}
          />
          <button
            className="btn-dots"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu(index, e);
            }}
          >
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </button>
        </div>
      )}

      {isListVariant && activeMenuIndex === index && (
        <div className="context-menu" onClick={(e) => e.stopPropagation()}>
          <button
            className="ctx-item"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/game/add-edit-game", { state: { game } });
            }}
          >
            <FontAwesomeIcon icon={faPen} /> <span>{t("common.edit")}</span>
          </button>
          <button
            className="ctx-item delete"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest(game);
            }}
          >
            <FontAwesomeIcon icon={faTrash} /> <span>{t("common.delete")}</span>
          </button>
        </div>
      )}

      <p
        className={`game-title ${variant === "dashboard" ? "game-name-dashboard" : ""}`}
      >
        {gameName}
      </p>
    </div>
  );
};

// Custom comparison function for memoization
// Only re-render if game data, variant, or visibility changes
const arePropsEqual = (prevProps, nextProps) => {
  const prevGame = prevProps.game;
  const nextGame = nextProps.game;

  // Compare critical game properties that affect rendering
  const gameEqual =
    prevGame?.id === nextGame?.id &&
    prevGame?.name === nextGame?.name &&
    prevGame?.image === nextGame?.image &&
    prevGame?.rating === nextGame?.rating &&
    prevGame?.isFavorite === nextGame?.isFavorite;

  // Compare other critical props
  return (
    gameEqual &&
    prevProps.variant === nextProps.variant &&
    prevProps.index === nextProps.index &&
    prevProps.activeMenuIndex === nextProps.activeMenuIndex &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.className === nextProps.className
  );
};

export default React.memo(GameCard, arePropsEqual);
