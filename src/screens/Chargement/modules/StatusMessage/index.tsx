import './StatusMessage.css'

import { useTranslation } from 'react-i18next'

const StatusMessage = ({ isLogout }: any) => {
  const { t } = useTranslation()
  const statusKey = isLogout ? 'auth.loading.statusLogout' : 'auth.loading.statusLogin'

  return (
    <div className="status-message">
      <span>{t(statusKey)}</span>
      <span className="dot dot-1"></span>
      <span className="dot dot-2"></span>
      <span className="dot dot-3"></span>
    </div>
  )
}

export default StatusMessage
