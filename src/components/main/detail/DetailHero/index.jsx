import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar as faStarFull,
  faCalendarAlt,
  faHeart,
  faCheck,
  faGamepad,
  faArchive,
} from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarEmpty } from "@fortawesome/free-regular-svg-icons";
import "./DetailHero.css";
import { useTranslation } from "react-i18next";
import { MOCK_OPTIONS } from "../../../../config/constants";

const DetailHero = ({ game, onToggleFavorite, metadata = {}, isUpdating = false, onUpdateField = () => {} }) => {
  const { t } = useTranslation();
  const [isOwned, setIsOwned] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [ratingDropdownOpen, setRatingDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  const ratingDropdownRef = useRef(null);

  // Fermer les dropdowns quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target)) {
        setStatusDropdownOpen(false);
      }
      if (ratingDropdownRef.current && !ratingDropdownRef.current.contains(e.target)) {
        setRatingDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculer isOwned en fonction du status (Wishlist = false, autres = true)
  useEffect(() => {
    const statusName = game.status || "";
    setIsOwned(statusName.toLowerCase() !== "wishlist");
  }, [game.status]);

  const statusOptions = [
    { value: "", label: t("gameForm.fields.selectStatus") || "Sélectionner un statut" },
    ...(metadata.statuses || []).map(s => ({ value: s._id, label: s.status_name }))
  ];

  const ratingOptions = metadata.rating || MOCK_OPTIONS.rating;

  const handleStatusSelect = (val) => {
    onUpdateField("status_id", val);
    setStatusDropdownOpen(false);
  };

  const handleRatingSelect = (val) => {
    onUpdateField("note", val);
    setRatingDropdownOpen(false);
  };
  return (
    <section className="hero-section">
      <img src={game.imageUrl} alt={game.name} className="hero-cover" />

      <div className="hero-content">
        <div className="tags-row">
          {game.tags.map((tag, i) => (
            <span key={i} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="detail-title">{game.name}</h1>

        <div className="meta-bar">
          <div className="meta-item rating-interactive">
            <div className="rating-container">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className="star-btn"
                  onClick={() => handleRatingSelect(star)}
                  disabled={isUpdating}
                  title={`${star} étoile${star > 1 ? 's' : ''}`}
                >
                  <FontAwesomeIcon icon={star <= (game.note || 0) ? faStarFull : faStarEmpty} />
                </button>
              ))}
              <span className="rating-value"><strong>{game.note || 0}/5</strong></span>
            </div>
            {ratingDropdownOpen && (
              <div className="dropdown-menu rating-dropdown">
                {ratingOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className={`dropdown-item ${game.note === parseInt(opt.value) ? "active" : ""}`}
                    onClick={() => handleRatingSelect(opt.value)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="meta-item">
            <FontAwesomeIcon icon={faCalendarAlt} />{" "}
            {t("gameDetail.addedToCollection")}{" "}
            <strong>{game.addedDate}</strong>
          </div>
        </div>

        <div className="hero-actions">
          <div className="action-item owned-badge">
            <FontAwesomeIcon icon={faArchive} />{" "}
            <span>{isOwned ? "Possédé" : "Non possédé"}</span>
          </div>

          <button
            className={`btn-secondary-action ${game.isFavorite ? "active" : ""}`}
            onClick={onToggleFavorite}
          >
            <FontAwesomeIcon icon={faHeart} />{" "}
            {game.isFavorite ? t("common.favorite") : t("common.favorite")}
          </button>

          <div className="status-dropdown-wrapper" ref={statusDropdownRef}>
            <button
              className="btn-secondary-action status"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              disabled={isUpdating}
            >
              <FontAwesomeIcon icon={game.status === "Terminé" ? faCheck : faGamepad} />
              {game.status}
            </button>
            {statusDropdownOpen && (
              <div className="dropdown-menu status-dropdown">
                {statusOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className={`dropdown-item ${game.status_id === opt.value ? "active" : ""}`}
                    onClick={() => handleStatusSelect(opt.value)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DetailHero;
