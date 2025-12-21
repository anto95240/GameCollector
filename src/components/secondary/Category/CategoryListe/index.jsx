import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPen, faTrash } from "@fortawesome/free-solid-svg-icons";
import "./categoryListe.css"

const CategoryList = ({ items, isCompact }) => {
    return (
        <div className={`manager-list ${isCompact ? "split-view" : "full-view"}`}>
            {items.map((item, index) => (
                <div key={index} className="list-item">
                    <div className="item-actions">
                        <button className="icon-action icon-edit" title="Modifier">
                            <FontAwesomeIcon icon={faPen} />
                        </button>
                        <button className="icon-action icon-delete" title="Supprimer">
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