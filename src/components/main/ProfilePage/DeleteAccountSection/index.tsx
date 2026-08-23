import './DeleteAccountSection.css'

import { useState } from 'react'

import ActionButtons from '@/components/secondary/Profile/ActionButtons'
import InlineFormItem from '@/components/secondary/Profile/InlineFormItem'
import ProfileCard from '@/components/secondary/Profile/ProfileCard'

const DeleteAccountSection = ({ setUiState, t }: any) => {
  const [showForm, setShowForm] = useState(false)

  return (
    <ProfileCard
      id="account-delete-section"
      className="delete-account-card"
      title={t('profile.links.deleteAccount')}
    >
      <div
        className="delete-content-row"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '0',
          width: '100%',
        }}
      >
        <InlineFormItem
          label={t('profile.links.deleteAccount')}
          showForm={showForm}
          toggleForm={() => setShowForm(!showForm)}
          hideInput={true}
        >
          <div
            className="delete-warning-container"
            style={{
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.3)',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <p
              className="delete-warning-text"
              style={{ margin: 0, opacity: 0.8, fontSize: '14px' }}
            >
              {t('profile.delete.warning1')} <br />
              {t('profile.delete.warning2')}
            </p>

            <div className="delete-action-wrapper" style={{ marginLeft: '20px' }}>
              <ActionButtons
                onDelete={() => setUiState((prev: any) => ({ ...prev, showDeletePopup: true }))}
                t={t}
              />
            </div>
          </div>
        </InlineFormItem>
      </div>
    </ProfileCard>
  )
}

export default DeleteAccountSection
