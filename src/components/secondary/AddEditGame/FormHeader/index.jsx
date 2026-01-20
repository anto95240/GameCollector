import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import "./FormHeader.css";

const FormHeader = ({ navigate, title, t }) => (
    <header className="page-header">
        <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            <FontAwesomeIcon icon={faArrowLeft} /> <span>{t('common.back')}</span>
        </button>
        <h1 className="page-title">{title}</h1>
        <div className="spacer"></div>
    </header>
);
export default FormHeader;