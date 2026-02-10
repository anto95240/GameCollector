import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAngleDoubleLeft, faAngleLeft, faAngleRight, faAngleDoubleRight } from "@fortawesome/free-solid-svg-icons";
import "./Pagination.css";

const Pagination = ({ page, totalPages, onPrev, onNext, onFirst, onLast }) => {
    return (
        <div className="pagination-footer">
            {/* Première page */}
            <button 
                className="page-btn" 
                onClick={onFirst} 
                disabled={page === 1}
            >
                <FontAwesomeIcon icon={faAngleDoubleLeft} />
            </button>

            {/* Page précédente */}
            <button 
                className="page-btn" 
                onClick={onPrev} 
                disabled={page === 1}
            >
                <FontAwesomeIcon icon={faAngleLeft} />
            </button>
            
            {/* Info page */}
            <span className="page-info">{page} / {totalPages}</span>

            {/* Page suivante */}
            <button 
                className="page-btn" 
                onClick={onNext} 
                disabled={page === totalPages}
            >
                <FontAwesomeIcon icon={faAngleRight} />
            </button>

            {/* Dernière page */}
            <button 
                className="page-btn" 
                onClick={onLast} 
                disabled={page === totalPages}
            >
                <FontAwesomeIcon icon={faAngleDoubleRight} />
            </button>
        </div>
    );
};

export default Pagination;
