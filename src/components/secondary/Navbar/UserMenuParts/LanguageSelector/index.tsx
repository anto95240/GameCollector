import './LanguageSelector.css'

import FlagIcon from '@/components/common/FlagIcon'
import LangOption from '@/components/secondary/Navbar/UserMenuParts/LangOption'

const LanguageSelector = ({ currentLang, isOpen, setOpen, onChange }: any) => {
  return (
    <>
      <button
        className="lang-btn"
        onClick={(e: any) => {
          e.stopPropagation()
          setOpen((prev: any) => !prev)
        }}
        aria-label="Changer la langue"
      >
        <FlagIcon code={currentLang === 'FR' ? 'FR' : 'GB'} className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="lang-menu">
          <LangOption code="FR" flagCode="FR" label="Français" onChange={onChange} />
          <LangOption code="EN" flagCode="GB" label="English" onChange={onChange} />
        </div>
      )}
    </>
  )
}
export default LanguageSelector
