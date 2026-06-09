import './LangOption.css'

import FlagIcon from '@/components/common/FlagIcon'

const LangOption = ({ code, label, flagCode, onChange }: any) => (
  <button className="lang-option" onClick={(e: any) => onChange(code, e)}>
    <FlagIcon code={flagCode} className="w-6 h-6" /> {label}
  </button>
)
export default LangOption
