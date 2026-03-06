import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import "./DetailHeader.css";
import { useTranslation } from "react-i18next";

const DetailHeader = ({ onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="detail-header">
      <button className="btn-glass back" onClick={() => navigate("/list")}>
        <FontAwesomeIcon icon={faArrowLeft} /> <span>{t("common.back")}</span>
      </button>

      <div className="action-group">
        <button className="btn-glass edit" title="Modifier" onClick={onEdit}>
          <FontAwesomeIcon icon={faPen} /> <span>{t("common.edit")}</span>
        </button>
        <button
          className="btn-glass delete"
          title="Supprimer"
          onClick={onDelete}
        >
          <FontAwesomeIcon icon={faTrash} /> <span>{t("delete")}</span>
        </button>
      </div>
    </header>
  );
};

export default DetailHeader;
