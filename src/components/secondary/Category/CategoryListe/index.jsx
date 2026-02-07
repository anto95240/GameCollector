import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import "./CategoryListe.css"

const CategoryList = ({ items, isCompact, onEdit, onDelete }) => {
    return (
        <div className={`manager-list ${isCompact ? "split-view" : "full-view"}`}>
            {items.map((item, index) => (
                <div key={index} className="list-item">
                    <div className="item-actions">
                        <button className="icon-action icon-edit" title="Modifier" onClick={() => onEdit(item)}>
                            <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button className="icon-action icon-delete" title="Supprimer" onClick={() => onDelete(item)}>
                            <FontAwesomeIcon icon={faTrash} />
                        </button>
                    </div>
                    <span className="item-name">{item}</span>
                </div>
            ))}
        </div>
    );
};

export default CategoryList;