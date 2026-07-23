import './WidgetWrapper.css'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { faEye, faEyeSlash, faGripVertical } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { useDashboardSettings } from '@/context/DashboardSettingsContext'
import type { WidgetId } from '@/types/dashboardSettings'

interface WidgetWrapperProps {
  widgetId: WidgetId
  page: 'dashboard' | 'stats'
  label: string
  isOverlay?: boolean
  children: React.ReactNode
  className?: string
}

const WidgetWrapper: React.FC<WidgetWrapperProps> = ({
  widgetId,
  page,
  label,
  isOverlay,
  children,
  className = '',
}) => {
  const { t } = useTranslation()
  const { isEditMode, isWidgetVisible, toggleWidgetVisibility } = useDashboardSettings()

  const visible = isWidgetVisible(page, widgetId)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: widgetId,
    disabled: !isEditMode || isOverlay,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // En mode normal : cacher si non visible
  if (!isEditMode && !visible && !isOverlay) {
    return null
  }

  // En mode normal : rendre le contenu directement (avec la className)
  if (!isEditMode && !isOverlay) {
    return className ? <div className={className}>{children}</div> : <>{children}</>
  }

  // En mode édition : wrapper avec les contrôles
  return (
    <div
      ref={isOverlay ? null : setNodeRef}
      style={isOverlay ? {} : style}
      className={`widget-wrapper is-editing ${!visible ? 'is-hidden-preview' : ''} ${isDragging && !isOverlay ? 'is-dragging' : ''} ${isOverlay ? 'is-drag-overlay' : ''} ${className}`}
    >
      <div className="widget-edit-controls">
        <div className="widget-edit-left">
          <div
            className="widget-drag-handle"
            {...(!isOverlay ? attributes : {})}
            {...(!isOverlay ? listeners : {})}
          >
            <FontAwesomeIcon icon={faGripVertical} />
          </div>
          <span className="widget-edit-label">{label}</span>
        </div>

        <div className="widget-edit-right">
          <button
            className={`widget-visibility-toggle ${visible ? 'is-visible' : 'is-hidden-btn'}`}
            onClick={() => toggleWidgetVisibility(page, widgetId)}
            disabled={isOverlay}
          >
            <FontAwesomeIcon icon={visible ? faEye : faEyeSlash} />
            <span>{visible ? t('editMode.showWidget') : t('editMode.hideWidget')}</span>
          </button>
        </div>
      </div>

      <div style={{ opacity: visible ? 1 : 0.3, pointerEvents: visible ? 'auto' : 'none' }}>
        {children}
      </div>
    </div>
  )
}

export default React.memo(WidgetWrapper)
