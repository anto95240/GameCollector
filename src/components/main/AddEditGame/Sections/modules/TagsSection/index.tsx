import './TagsSection.css'

import { faPlus, faTag, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import GameField from '@/components/secondary/AddEditGame/GameField'
import SectionWrapper from '@/components/secondary/AddEditGame/SectionWrapper'

export const TagsSection = ({
  t,
  formData,
  tagInput,
  setTagInput,
  suggestedTags,
  handleTagKeyDown,
  addTag,
  handleRemoveTag,
  availableTags,
  errors,
  touched,
  handleBlur,
}: any) => (
  <SectionWrapper id="tags" title={t('gameForm.sections.tags')}>
    {(formData.tags || []).length > 0 && (
      <div className="tags-preview-container">
        {(formData.tags || []).map((tagId: any, index: any) => {
          const tagObj = availableTags?.find((t: any) => t._id === tagId)
          const tagName = tagObj ? tagObj.tag_name : 'Tag inconnu'

          return (
            <span key={index} className="tag-badge">
              {tagName}
              <button
                type="button"
                onClick={() => handleRemoveTag(tagId)}
                className="tag-remove-btn"
                aria-label={t('common.delete', { defaultValue: 'Supprimer' })}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </span>
          )
        })}
      </div>
    )}
    <GameField
      label={t('gameForm.fields.newTag')}
      tooltip={t('gameForm.tooltips.tags')}
      htmlFor="tags"
      error={errors?.tags}
      touched={touched?.tags}
    >
      <div className="tag-input-wrapper w-full">
        <div className="tag-search-container flex-1 relative w-full">
          <input
            type="text"
            id="tags"
            name="tags"
            value={tagInput}
            onChange={(e: any) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            onBlur={(e: any) => handleBlur && handleBlur('tags', e.target.value, formData)}
            autoComplete="off"
            className="w-full"
          />
          {suggestedTags.length > 0 && (
            <div className="tags-suggestions-dropdown">
              {suggestedTags.map((suggestion: any) => (
                <div
                  key={suggestion._id}
                  className="tag-suggestion-item"
                  onClick={() => addTag(suggestion)}
                >
                  <FontAwesomeIcon icon={faTag} size="xs" className="tag-suggestion-icon" />
                  {suggestion.tag_name}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className="btn-add-tag shrink-0"
          onClick={() => addTag(tagInput)}
          aria-label={t('common.add', { defaultValue: 'Ajouter' })}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </GameField>
  </SectionWrapper>
)
