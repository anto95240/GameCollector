import "./Detail.css";

import { useLayoutEffect } from "react";
import { useLocation,useParams } from "react-router";

import DetailFooter from "@/components/main/Detail/DetailFooter";
import DetailHeader from "@/components/main/Detail/DetailHeader";
import DetailHero from "@/components/main/Detail/DetailHero";
import DetailInfoGrid from "@/components/main/Detail/DetailInfoGrid";
import { useGameDetail } from "@/hooks/domains/games/useGameDetail";

const DetailPage = () => {
  const { id, gameName, slug } = useParams();
  const { pathname } = useLocation();
  const { game, isLoading, metadata, isUpdating, handleEdit, handleDelete, handleToggleFavorite, handleUpdateGameField, handleToggleSoon } =
    useGameDetail(id, slug, gameName);

  useLayoutEffect(() => {
    const scrollContainer = document.querySelector(".layout-container");
    if (scrollContainer)
      scrollContainer.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, slug]);

  if (isLoading)
    return (
      <div className="detail-layout fade-in flex items-center justify-center">
        <p className="loading-text">Chargement...</p>
      </div>
    );
  if (!game)
    return (
      <div className="detail-layout fade-in flex items-center justify-center">
        <p className="loading-text">Jeu introuvable.</p>
      </div>
    );

  return (
    <div className="detail-layout fade-in">
      <DetailHeader onEdit={handleEdit} onDelete={handleDelete} />
      <DetailHero game={game} onToggleFavorite={handleToggleFavorite} metadata={metadata} isUpdating={isUpdating} onUpdateField={handleUpdateGameField} onToggleSoon={handleToggleSoon} />
      <DetailInfoGrid game={game} />
      <DetailFooter />
    </div>
  );
};
export default DetailPage;
