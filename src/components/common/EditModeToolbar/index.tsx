import './EditModeToolbar.css'

import { faCheck, faPen, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useTranslation } from 'react-i18next'

import { useDashboardSettings } from '@/context/DashboardSettingsContext'

const EditModeToolbar = () => {
  const { t } = useTranslation()
  const { isSaving, saveSettings, cancelEdit } = useDashboardSettings()

  return (
    <div className="edit-mode-toolbar">
      <div className="toolbar-label">
        <FontAwesomeIcon icon={faPen} />
        <span>{t('editMode.toggle')}</span>
      </div>

      <div className="toolbar-divider" />

      <button className="toolbar-btn btn-save" onClick={saveSettings} disabled={isSaving}>
        {isSaving ? <div className="toolbar-saving-spinner" /> : <FontAwesomeIcon icon={faCheck} />}
        {t('editMode.save')}
      </button>

      <button className="toolbar-btn btn-cancel" onClick={cancelEdit} disabled={isSaving}>
        <FontAwesomeIcon icon={faTimes} />
        {t('editMode.cancel')}
      </button>
    </div>
  )
}

export default EditModeToolbar
