import './PatchNotes.css'

import React from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'

import { GitHubRelease } from '@/hooks/domains/versioning/useGithubReleases'

interface PatchNotesModalProps {
  release: GitHubRelease | null
  onClose: () => void
}

const PatchNotesModal: React.FC<PatchNotesModalProps> = ({ release, onClose }) => {
  const { t } = useTranslation()

  if (!release) return null

  return (
    <div className="patch-notes-overlay">
      <div className="patch-notes-container">
        <div className="patch-notes-header">
          <h2>{t('patchNotes.title')}</h2>
          <div className="patch-notes-version">
            {release.tag_name.startsWith('v') ? release.tag_name : `v${release.tag_name}`}
          </div>
        </div>

        <div className="patch-notes-content">
          <ReactMarkdown>{release.body}</ReactMarkdown>
        </div>

        <div className="patch-notes-footer">
          <button className="patch-notes-close-btn" onClick={onClose}>
            {t('patchNotes.closeBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PatchNotesModal
