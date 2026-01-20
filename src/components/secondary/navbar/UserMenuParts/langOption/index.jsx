import Flag from "react-world-flags";
import "./langOption.css";

const LangOption = ({ code, label, flagCode, onChange }) => (
    <button 
        className="lang-option flex items-center cursor-pointer" 
        onClick={(e) => onChange(code, e)}
    >
        <Flag code={flagCode} className="w-6 h-6" /> {label}
    </button>
);
export default LangOption;