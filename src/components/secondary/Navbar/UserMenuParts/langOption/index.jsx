import "./LangOption.css";

import Flag from "react-world-flags";

const LangOption = ({ code, label, flagCode, onChange }) => (
  <button className="lang-option" onClick={(e) => onChange(code, e)}>
    <Flag code={flagCode} className="w-6 h-6" /> {label}
  </button>
);
export default LangOption;
