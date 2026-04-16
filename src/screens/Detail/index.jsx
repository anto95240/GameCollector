import { useLayoutEffect } from "react";
import { useParams, useLocation } from "react-router";
import DetailHeader from "../../components/main/Detail/DetailHeader";
import DetailHero from "../../components/main/Detail/DetailHero";
import DetailInfoGrid from "../../components/main/Detail/DetailInfoGrid";
import DetailFooter from "../../components/main/Detail/DetailFooter";
import { useGameDetail } from "../../hooks/games/useGameDetail";
import "./Detail.css";

const DetailPage = () => {
  const { id, gameName, slug } = useParams();
  const { pathname } = useLocation();
  const { game, isLoading, metadata, isUpdating, handleEdit, handleDelete, handleToggleFavorite, handleUpdateGameField } =
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
      <DetailHero game={game} onToggleFavorite={handleToggleFavorite} metadata={metadata} isUpdating={isUpdating} onUpdateField={handleUpdateGameField} />
      <DetailInfoGrid game={game} />
      <DetailFooter />
    </div>
  );
};
export default DetailPage;
