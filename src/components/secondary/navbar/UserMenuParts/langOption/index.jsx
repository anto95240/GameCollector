import Flag from "react-world-flags";
import "./langOption.css";

const LangOption = ({ code, label, flagCode, onChange }) => (
    <button 
        className="lang-option flex items-center cursor-pointer" 
        onClick={(e) => onChange(code, e)}
    >
        <Flag code={flagCode} style={{ width: 22, height: 22 }} /> {label}
    </button>
);
export default LangOption;