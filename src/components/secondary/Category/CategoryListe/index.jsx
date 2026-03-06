import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import "./CategoryListe.css";

const CategoryList = ({ items, isCompact, onEdit, onDelete }) => {
  if (!items || items.length === 0) {
    return (
      <div
        className="empty-list"
        style={{ padding: "2rem", textAlign: "center", opacity: 0.7 }}
      >
        Aucun élément trouvé.
      </div>
    );
  }

  return (
    <div className={`manager-list ${isCompact ? "split-view" : "full-view"}`}>
      {items.map((item, index) => {
        const itemId = item._id || item.id || index;

        // Récupère dynamiquement le nom selon la table Mongoose
        const itemName =
          item.name ||
          item.label ||
          item.genre_name ||
          item.platform_name ||
          item.tag_name ||
          item.status_name ||
          (typeof item === "string" ? item : "Élément sans nom");

        return (
          <div key={itemId} className="list-item">
            <div className="item-actions">
              <button
                className="icon-action icon-edit"
                title="Modifier"
                onClick={() => onEdit(item)}
              >
                <FontAwesomeIcon icon={faPen} />
              </button>
              <button
                className="icon-action icon-delete"
                title="Supprimer"
                onClick={() => onDelete(item)}
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
            <span className="item-name">{itemName}</span>
          </div>
        );
      })}
    </div>
  );
};

export default CategoryList;
