import "./TagsSection.css";

import { faPlus,faTag, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import FloatingInput from "@/components/common/FloatingInput";
import SectionWrapper from "@/components/secondary/AddEditGame/SectionWrapper";

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
}) => (
  <SectionWrapper id="tags" title={t("gameForm.sections.tags")}>
    {formData.tags.length > 0 && (
      <div className="tags-preview-container">
        {formData.tags.map((tagId, index) => {
          const tagObj = availableTags?.find((t) => t._id === tagId);
          const tagName = tagObj ? tagObj.tag_name : "Tag inconnu";

          return (
            <span key={index} className="tag-badge">
              {tagName}
              <button
                type="button"
                onClick={() => handleRemoveTag(tagId)}
                className="tag-remove-btn"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </span>
          );
        })}
      </div>
    )}
    <div className="tag-input-wrapper">
      <div className="tag-search-container">
        <FloatingInput
          name="tagInput"
          label={t("gameForm.fields.newTag")}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
          autocomplete="off"
        />
        {suggestedTags.length > 0 && (
          <div className="tags-suggestions-dropdown">
            {suggestedTags.map((suggestion) => (
              <div
                key={suggestion._id}
                className="tag-suggestion-item"
                onClick={() => addTag(suggestion)}
              >
                <FontAwesomeIcon
                  icon={faTag}
                  size="xs"
                  className="tag-suggestion-icon"
                />
                {suggestion.tag_name}
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        className="btn-add-tag"
        onClick={() => addTag(tagInput)}
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  </SectionWrapper>
);
