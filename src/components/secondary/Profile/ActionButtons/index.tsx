import './ActionButtons.css';

export interface ActionButtonsProps {
  onCancel?: () => void;
  onDownload?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  t: any;
  isSaving?: boolean;
  labels?: {
    download?: string;
    cancel?: string;
    save?: string;
    delete?: string;
    [key: string]: string | undefined;
  };
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onCancel, onDownload, onSave, onDelete, t, isSaving, labels = {} }: any) => {
  return (
    <>
      {onDownload && (
        <button className="btn-action btn-download" onClick={onDownload} disabled={isSaving}>
          {labels.download || t('profile.labels.profilePicture')}
        </button>
      )}

      {onCancel && (
        <button className="btn-action btn-cancel" onClick={onCancel} disabled={isSaving}>
          {labels.cancel || t('common.cancel')}
        </button>
      )}

      {onSave && (
        <button className="btn-action btn-save" onClick={onSave} disabled={isSaving}>
          {isSaving ? <span className="loader-circle-small"></span> : (labels.save || t('common.save'))}
        </button>
      )}

      {onDelete && (
        <button className="btn-action btn-delete" onClick={onDelete} disabled={isSaving}>
          {labels.delete || t('profile.delete.button')}
        </button>
      )}
    </>
  )
}

export default ActionButtons
