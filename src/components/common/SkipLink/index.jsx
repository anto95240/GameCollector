import './SkipLink.css'

const SkipLink = ({ t }) => {
  return (
    <a href="#main-content" className="skip-link">
      {t
        ? t('common.skipLink', { defaultValue: 'Aller au contenu principal' })
        : 'Aller au contenu principal'}
    </a>
  )
}

export default SkipLink
