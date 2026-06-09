import "./DetailInfoGrid.css";

import {
  faCalendarAlt,
  faClock,
  faCode,
  faGamepad,
  faLayerGroup,
  faQuoteLeft,
  faTrophy,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslation } from "react-i18next";

import StatItem from "@/components/secondary/Detail/StatItem";
import { sanitizeHtml } from "@/utils/sanitize";

const DetailInfoGrid = ({ game }: { game: any }) => {
  const { t } = useTranslation();

  return (
    <div className="content-grid">
      {/* Colonne Gauche : Narration */}
      <div className="narrative-col">
        <div className="bento-card">
          <h3>{t("gameForm.sections.description")}</h3>
          <div 
            className="description-text" 
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(game.description) }} 
          />
        </div>

        <div className="bento-card note-card">
          <h3>
            <FontAwesomeIcon icon={faQuoteLeft} className="note-icon-title" />{" "}
            {t("gameForm.fields.comment")}
          </h3>
          <div className="user-note-container">
            <div 
              className="user-note-text" 
              dangerouslySetInnerHTML={{ __html: `"${sanitizeHtml(game.comment || "")}"` }} 
            />
          </div>
        </div>
      </div>

      {/* Colonne Droite : Données Techniques */}
      <div className="data-col">
        <div className="bento-card">
          <h3>Informations</h3>
          <div className="stats-list">
            <StatItem
              icon={faLayerGroup}
              label={t("gameForm.fields.genre")}
              value={game.genre}
            />
            <StatItem
              icon={faCalendarAlt}
              label={t("gameForm.fields.releaseYear")}
              value={game.year}
            />
            {game.developer && (
              <StatItem
                icon={faCode}
                label={t("gameForm.fields.developer")}
                value={game.developer}
              />
            )}
            <StatItem
              icon={faGamepad}
              label={t("gameForm.fields.platform")}
              value={game.platform}
            />
            <StatItem
              icon={faClock}
              label={t("gameForm.fields.playtime")}
              value={game.playing_time}
            />
            <StatItem
              icon={faTrophy}
              label={t("gameForm.fields.achievements")}
              value={game.succes}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailInfoGrid;
