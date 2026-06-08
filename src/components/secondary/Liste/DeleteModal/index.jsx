import './DeleteModal.css'

import LoadingButton from '@/components/common/LoadingButton'

const DeleteModal = ({ game, onClose, onConfirm, t }) => {
  if (!game) return null

  return (
    <div className="modal-overlay-liste" onClick={onClose}>
      <div className="modal-liste" onClick={(e) => e.stopPropagation()}>
        <h4 className="modal-title">{t('gameList.confirmDelete.title')}</h4>
        <p className="modal-text">
          {t('gameList.confirmDelete.message')}
          <br />
          <span className="modal-game-name">"{game.name}"</span>
        </p>
        <div className="modal-actions">
          <LoadingButton variant="secondary" text={t('common.cancel')} onClick={onClose} />
          <LoadingButton
            variant="danger"
            text={t('gameList.confirmDelete.confirm')}
            onClick={onConfirm}
          />
        </div>
      </div>
    </div>
  )
}

export default DeleteModal
