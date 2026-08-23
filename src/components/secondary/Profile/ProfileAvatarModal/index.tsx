import './ProfileAvatarModal.css'

import { faCloudUploadAlt, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import ActionButtons from '@/components/secondary/Profile/ActionButtons'

const ProfileAvatarModal = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSave,
  isSaving,
  t,
  getInitials,
  isDefaultImage,
}: any) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  if (!isOpen) return null

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setForm({ ...form, imageFile: e.dataTransfer.files[0] })
    }
  }

  return createPortal(
    <div className="avatar-modal-overlay fade-in" onClick={onClose}>
      <div className="avatar-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="avatar-modal-close" onClick={onClose}>
          <FontAwesomeIcon icon={faTimes} />
        </button>

        <h3 className="avatar-modal-title">{t('profile.labels.profilePicture')}</h3>

        <div className="avatar-modal-body">
          <div className="avatar-modal-preview">
            {form.imageFile ? (
              <img
                className="avatar-modal-circle"
                src={URL.createObjectURL(form.imageFile)}
                alt="Preview"
              />
            ) : !isDefaultImage ? (
              <img className="avatar-modal-circle" src={form.avatarURL} alt="User" />
            ) : (
              <div className="avatar-modal-circle no-img">{getInitials()}</div>
            )}
          </div>

          <div
            className={`avatar-drop-zone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <FontAwesomeIcon icon={faCloudUploadAlt} className="upload-icon" />
            <p>Cliquez ou glissez</p>
            <span className="upload-hint">JPG, PNG (Max 5MB)</span>
          </div>
        </div>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e: any) => {
            if (e.target.files && e.target.files[0]) {
              setForm({ ...form, imageFile: e.target.files[0] })
            }
          }}
        />

        <div className="avatar-modal-actions">
          <ActionButtons onCancel={onClose} onSave={onSave} isSaving={isSaving} t={t} />
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ProfileAvatarModal
