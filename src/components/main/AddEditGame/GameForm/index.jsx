import LoadingButton from "../../../common/LoadingButton";
import { 
    DescriptionSection, RatingSection, DetailsSection, 
    ImageSection, StatusSection, TagsSection 
} from "../Sections";
import "./GameForm.css";

const GameForm = ({ 
    formData, setFormData, handleChange, handleFileChange, 
    handleSubmit, tagInput, setTagInput, suggestedTags, 
    handleTagKeyDown, addTag, handleRemoveTag, 
    previewImg, isAnimating, isEditMode, t, navigate,
    optionsData, availableTags, handleAddNewMetadata
}) => {
    return (
        <form className="form-container" onSubmit={handleSubmit}>
            <DescriptionSection t={t} formData={formData} handleChange={handleChange} />
            <RatingSection t={t} formData={formData} handleChange={handleChange} setFormData={setFormData} optionsData={optionsData} />
            <DetailsSection t={t} formData={formData} handleChange={handleChange} setFormData={setFormData} optionsData={optionsData} handleAddNewMetadata={handleAddNewMetadata}/>
            <ImageSection t={t} previewImg={previewImg} handleFileChange={handleFileChange} />
            <StatusSection t={t} formData={formData} setFormData={setFormData} optionsData={optionsData} handleAddNewMetadata={handleAddNewMetadata}/>
            <TagsSection 
                t={t} formData={formData} tagInput={tagInput} 
                setTagInput={setTagInput} suggestedTags={suggestedTags} 
                handleTagKeyDown={handleTagKeyDown} addTag={addTag} 
                handleRemoveTag={handleRemoveTag} availableTags={availableTags}
            />

            <div className="form-actions-footer">
                <button 
                    type="button" 
                    className="btn-cancel-game" 
                    onClick={() => navigate(-1)}
                >
                    {t('common.cancel')}
                </button>
                
                <LoadingButton 
                    text={isEditMode ? t('gameForm.buttons.save') : t('gameForm.buttons.add')}
                    isAnimating={isAnimating}
                    showLoading={false}
                />
            </div>
        </form>
    );
};

export default GameForm;