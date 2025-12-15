import Flag from "react-world-flags";
import LangOption from "../langOption";
import "./languageSelector.css";

const LanguageSelector = ({ currentLang, isOpen, setOpen, onChange }) => {

    return (
        <>
            <button 
                className="lang-btn flex items-center justify-center cursor-pointer" 
                onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
                aria-label="Changer la langue"
            >
                <Flag code={currentLang === "FR" ? "FR" : "GB"} style={{ width: 24, height: 24 }} />
            </button>

            {isOpen && (
                <div className="lang-menu flex flex-col gap-1">
                    <LangOption code="FR" flagCode="FR" label="Français" onChange={onChange} />
                    <LangOption code="EN" flagCode="GB" label="English" onChange={onChange} />
                </div>
            )}
        </>
    );
};
export default LanguageSelector;