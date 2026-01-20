import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faImage, faTimes, faTag, faPlus } from "@fortawesome/free-solid-svg-icons";
import FloatingInput from "../../../common/FloatingInput";
import CustomSelect from "../../../common/CustomSelect";
import { MOCK_OPTIONS } from "../../../../hooks/useAddEditGame";
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
            required 
        />
        <div className="textarea-group">
            <label>{t('gameForm.fields.description')}</label>
            <textarea 
                name="description" 
                rows="4" 
                value={formData.description} 
                onChange={handleChange} 
            />
        </div>
    </SectionWrapper>
);

// --- Section Note (Rating) ---
export const RatingSection = ({ t, formData, handleChange, setFormData }) => (
    <SectionWrapper id="rate" title={t('gameForm.sections.rating')}>
        <div className="select-wrapper">
            <label>{t('gameForm.fields.rating')}</label>
            <CustomSelect 
                options={MOCK_OPTIONS.rating} 
                value={formData.rating} 
                onChange={(val) => setFormData(p => ({...p, rating: val}))} 
            />
        </div>
        <div className="textarea-group mt-4">
            <label>{t('gameForm.fields.comment')}</label>
            <textarea 
                name="comment" 
                rows="3" 
                value={formData.comment} 
                onChange={handleChange} 
            />
        </div>
    </SectionWrapper>
);

// --- Section Détails ---
export const DetailsSection = ({ t, formData, handleChange, setFormData }) => (
    <SectionWrapper id="detail" title={t('gameForm.sections.details')}>
        <div className="form-grid">
            <div className="select-wrapper">
                <label>{t('gameForm.fields.genre')}</label>
                <CustomSelect 
                    options={MOCK_OPTIONS.genre} 
                    value={formData.genre} 
                    onChange={(val) => setFormData(p => ({...p, genre: val}))} 
                />
            </div>
            <div className="select-wrapper">
                <label>{t('gameForm.fields.platform')}</label>
                <CustomSelect 
                    options={MOCK_OPTIONS.platform} 
                    value={formData.platform} 
                    onChange={(val) => setFormData(p => ({...p, platform: val}))} 
                />
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
                label="Temps de jeu (h)" 
                type="number" 
                value={formData.playTime} 
                onChange={handleChange} 
            />
            <FloatingInput 
                name="developer" 
                label="Développeur" 
                value={formData.developer} 
                onChange={handleChange} 
            />
            <FloatingInput 
                name="achievements" 
                label="Succès (ex: 45/50)" 
                value={formData.achievements} 
                onChange={handleChange} 
            />
        </div>
    </SectionWrapper>
);

// --- Section Image ---
export const ImageSection = ({ t, previewImg, handleFileChange }) => (
    <SectionWrapper id="img" title={t('gameForm.sections.image')}>
        <div className="image-upload-area">
            <input 
                type="file" 
                id="file-upload" 
                accept="image/*" 
                onChange={handleFileChange} 
                hidden 
            />
            <label htmlFor="file-upload" className="upload-label">
                {previewImg ? (
                    <img src={previewImg} alt="Preview" className="img-preview" />
                ) : (
                    <div className="upload-placeholder">
                        <FontAwesomeIcon icon={faImage} size="2x" />
                        <p>Glisser ou cliquer pour ajouter</p>
                    </div>
                )}
            </label>
        </div>
    </SectionWrapper>
);

// --- Section Statut ---
export const StatusSection = ({ t, formData, setFormData }) => (
    <SectionWrapper id="status" title={t('gameForm.sections.status')}>
        <CustomSelect 
            options={MOCK_OPTIONS.status} 
            value={formData.status} 
            onChange={(val) => setFormData(p => ({...p, status: val}))} 
        />
    </SectionWrapper>
);

// --- Section Tags ---
export const TagsSection = ({ t, formData, tagInput, setTagInput, suggestedTags, handleTagKeyDown, addTag, handleRemoveTag }) => (
    <SectionWrapper id="tags" title={t('gameForm.sections.tags')}>
        {formData.tags.length > 0 && (
            <div className="tags-preview-container">
                {formData.tags.map((tag, index) => (
                    <span key={index} className="tag-badge">
                        {tag}
                        <button type="button" onClick={() => handleRemoveTag(tag)} className="tag-remove-btn">
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </span>
                ))}
            </div>
        )}
        <div className="tag-input-wrapper">
            <div className="tag-search-container">
                <FloatingInput 
                    name="tagInput" 
                    label="Rechercher ou créer un tag..." 
                    value={tagInput} 
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown} 
                    autocomplete="off"
                />
                {suggestedTags.length > 0 && (
                    <div className="tags-suggestions-dropdown">
                        {suggestedTags.map((suggestion, index) => (
                            <div key={index} className="tag-suggestion-item" onClick={() => addTag(suggestion)}>
                                <FontAwesomeIcon icon={faTag} size="xs" className="tag-suggestion-icon" />
                                {suggestion}
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