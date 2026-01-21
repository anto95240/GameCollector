import { useNavigate } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import "./DetailHeader.css";

const DetailHeader = ({ onEdit, onDelete }) => {
    const navigate = useNavigate();

    return (
        <header className="detail-header">
            <button className="btn-glass" onClick={() => navigate("/list")}>
                <FontAwesomeIcon icon={faArrowLeft} /> <span>Retour</span>
            </button>
            
            <div className="action-group">
                <button className="btn-glass" title="Modifier" onClick={onEdit}>
                    <FontAwesomeIcon icon={faPen} /> <span>Modifier</span>
                </button>
                <button className="btn-glass delete" title="Supprimer" onClick={onDelete}>
                    <FontAwesomeIcon icon={faTrash} /> <span>Supprimer</span>
                </button>
            </div>
        </header>
    );
};

export default DetailHeader;