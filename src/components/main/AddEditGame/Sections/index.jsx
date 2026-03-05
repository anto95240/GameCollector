import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faTimes, faTag, faPlus } from "@fortawesome/free-solid-svg-icons";
import FloatingInput from "../../../common/FloatingInput";
import CustomSelect from "../../../common/CustomSelect";
import SectionWrapper from "../../../secondary/AddEditGame/SectionWrapper";
import "./Sections.css";

// --- Section Description ---
export const DescriptionSection = ({ t, formData, handleChange }) => (
    <SectionWrapper id="desc" title={t('gameForm.sections.description')}>
        <FloatingInput 
            name="name" 
            label={t('gameForm.fields.name')} 
            value={formData.name} 
            onChange={handleChange} 
            required={true}
        />
        <div className="textarea-group">
            <label>{t('gameForm.fields.description')}</label>
            <div className="textarea-container">
                <textarea 
                    name="description" 
                    rows="4" 
                    value={formData.description} 
                    onChange={handleChange} 
                />
            </div>
        </div>
    </SectionWrapper>
);

// --- Section Note (Rating) ---
export const RatingSection = ({ t, formData, handleChange, setFormData, optionsData }) => (
    <SectionWrapper id="rate" title={t('gameForm.sections.rating')}>
        <div className="select-wrapper">
            <label>{t('gameForm.fields.rating')}</label>
            <CustomSelect 
                options={optionsData?.rating || []} 
                value={formData.rating} 
                onChange={(val) => setFormData(p => ({...p, rating: val}))} 
            />
        </div>
        <div className="textarea-group mt-4">
            <label>{t('gameForm.fields.comment')}</label>
            <div className="textarea-container">
                <textarea 
                    name="comment" 
                    rows="3" 
                    value={formData.comment} 
                    onChange={handleChange} 
                />
            </div>
        </div>
    </SectionWrapper>
);

// --- Section Détails ---
export const DetailsSection = ({ t, formData, handleChange, setFormData, optionsData, handleAddNewMetadata }) => (
    <SectionWrapper id="detail" title={t('gameForm.sections.details')}>
        <div className="form-grid">
            <div className="select-wrapper">
                <label>{t('gameForm.fields.genre')} <span>*</span></label>
                <div className="flex gap-2.5 items-center">
                    <CustomSelect 
                        options={optionsData?.genre || []} 
                        value={formData.genre} 
                        onChange={(val) => setFormData(p => ({...p, genre: val}))} 
                    />
                    <button type="button" className="btn-quick-add" onClick={() => handleAddNewMetadata('genre')}>
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
            </div>
            <div className="select-wrapper">
                <label>{t('gameForm.fields.platform')} <span>*</span></label>
                <div className="flex gap-2.5 items-center">
                    <CustomSelect 
                        options={optionsData?.platform || []} 
                        value={formData.platform} 
                        onChange={(val) => setFormData(p => ({...p, platform: val}))} 
                    />
                    <button type="button" className="btn-quick-add" onClick={() => handleAddNewMetadata('platform')}>
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
            </div>
            <FloatingInput 
                name="year" 
                label={t('gameForm.fields.releaseYear')} 
                type="number" 
                value={formData.year} 
                onChange={handleChange} 
            />
            <FloatingInput 
                name="playTime" 
                label={t('gameForm.fields.playtime')} 
                type="number" 
                value={formData.playTime} 
                onChange={handleChange} 
            />
            <FloatingInput 
                name="developer" 
                label={t('gameForm.fields.developer')} 
                value={formData.developer} 
                onChange={handleChange} 
            />
            <FloatingInput 
                name="achievements" 
                label={t('gameForm.fields.achievementsExample')}
                value={formData.achievements} 
                onChange={handleChange} 
            />
        </div>
    </SectionWrapper>
);

// --- Section Image ---
export const ImageSection = ({ t, previewImg, handleFileChange }) => (
    <SectionWrapper id="image" title={
        <span>{t('gameForm.sections.image')} <span>*</span></span>
    }>
        <div className="image-upload-area">
            <input 
                type="file" 
                id="file-upload" 
                accept="image/*" 
                onChange={handleFileChange} 
                hidden 
                required={!previewImg} 
            />
            <label htmlFor="file-upload" className="upload-label">
                {previewImg ? (
                    <img src={previewImg} alt="Preview" className="img-preview" />
                ) : (
                    <div className="upload-placeholder">
                        <FontAwesomeIcon icon={faImage} className="upload-icon" />
                        <p>{t('gameForm.fields.downloadImage')} <span>*</span></p>
                    </div>
                )}
            </label>
        </div>
    </SectionWrapper>
);

// --- Section Statut ---
export const StatusSection = ({ t, formData, setFormData, optionsData, handleAddNewMetadata }) => (
    <SectionWrapper id="status" title={
        <span>{t('gameForm.sections.status')} <span>*</span></span>
    }>
        <div className="flex gap-2.5 items-center">
            <CustomSelect 
                options={optionsData?.status || []} 
                value={formData.status} 
                onChange={(val) => setFormData(p => ({...p, status: val}))} 
            />
            <button type="button" className="btn-quick-add" onClick={() => handleAddNewMetadata('status')}>
                <FontAwesomeIcon icon={faPlus} />
            </button>
        </div>
    </SectionWrapper>
);

// --- Section Tags ---
export const TagsSection = ({ t, formData, tagInput, setTagInput, suggestedTags, handleTagKeyDown, addTag, handleRemoveTag, availableTags }) => (
    <SectionWrapper id="tags" title={t('gameForm.sections.tags')}>
        {formData.tags.length > 0 && (
            <div className="tags-preview-container">
                {formData.tags.map((tagId, index) => {
                    const tagObj = availableTags?.find(t => t._id === tagId);
                    const tagName = tagObj ? tagObj.tag_name : "Tag inconnu";

                    return (
                        <span key={index} className="tag-badge">
                            {tagName}
                            <button type="button" onClick={() => handleRemoveTag(tagId)} className="tag-remove-btn">
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
                    label={t('gameForm.fields.newTag')}
                    value={tagInput} 
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown} 
                    autocomplete="off"
                />
                {suggestedTags.length > 0 && (
                    <div className="tags-suggestions-dropdown">
                        {suggestedTags.map((suggestion) => (
                            <div key={suggestion._id} className="tag-suggestion-item" onClick={() => addTag(suggestion)}>
                                <FontAwesomeIcon icon={faTag} size="xs" className="tag-suggestion-icon" />
                                {suggestion.tag_name}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <button type="button" className="btn-add-tag" onClick={() => addTag(tagInput)}>
                <FontAwesomeIcon icon={faPlus} />
            </button>
        </div>
    </SectionWrapper>
);