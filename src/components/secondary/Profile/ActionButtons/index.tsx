import './ActionButtons.css';

export interface ActionButtonsProps {
  onCancel?: () => void;
  onDownload?: () => void;
  onSave?: () => void;
  onDelete?: () => void;
  t: any;
  labels?: {
    download?: string;
    cancel?: string;
    save?: string;
    delete?: string;
    [key: string]: string | undefined;
  };
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onCancel, onDownload, onSave, onDelete, t, labels = {} }: any) => {
  return (
    <>
      {onDownload && (
        <button className="btn-action btn-download" onClick={onDownload}>
          {labels.download || t('profile.labels.profilePicture')}
        </button>
      )}

      {onCancel && (
        <button className="btn-action btn-cancel" onClick={onCancel}>
          {labels.cancel || t('common.cancel')}
        </button>
      )}

      {onSave && (
        <button className="btn-action btn-save" onClick={onSave}>
          {labels.save || t('common.save')}
        </button>
      )}

      {onDelete && (
        <button className="btn-action btn-delete" onClick={onDelete}>
          {labels.delete || t('profile.delete.button')}
        </button>
      )}
    </>
  )
}

export default ActionButtons
