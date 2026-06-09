import "./DeleteModal.css";

import LoadingButton from "@/components/common/LoadingButton";
import { useEscapeKeyCloser } from "@/hooks/ui/useEscapeKeyCloser";
import { useFocusTrap } from "@/hooks/ui/useFocusTrap";

interface DeleteModalProps {
  game: any;
  onClose: () => void;
  onConfirm: () => void;
  t: any;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ game, onClose, onConfirm, t }) => {
  const modalRef = useFocusTrap(true);
  
  useEscapeKeyCloser(() => {
    onClose();
  }, true);

  if (!game) return null;

  return (
    <div className="modal-overlay-liste" onClick={onClose}>
      <div 
        className="modal-liste" 
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <h4 id="modal-title" className="modal-title">{t("gameList.confirmDelete.title")}</h4>
        <p className="modal-text">
          {t("gameList.confirmDelete.message")}
          <br />
          <span className="modal-game-name">"{game.name}"</span>
        </p>
        <div className="modal-actions">
          <LoadingButton variant="secondary" text={t("common.cancel")} onClick={onClose} />
          <LoadingButton variant="danger" text={t("gameList.confirmDelete.confirm")} onClick={onConfirm} />
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;