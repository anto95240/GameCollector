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
    previewImg, isAnimating, isEditMode, t 
}) => {
    return (
        <form className="form-container" onSubmit={handleSubmit}>
            <DescriptionSection t={t} formData={formData} handleChange={handleChange} />
            <RatingSection t={t} formData={formData} handleChange={handleChange} setFormData={setFormData} />
            <DetailsSection t={t} formData={formData} handleChange={handleChange} setFormData={setFormData} />
            <ImageSection t={t} previewImg={previewImg} handleFileChange={handleFileChange} />
            <StatusSection t={t} formData={formData} setFormData={setFormData} />
            <TagsSection 
                t={t} formData={formData} tagInput={tagInput} 
                setTagInput={setTagInput} suggestedTags={suggestedTags} 
                handleTagKeyDown={handleTagKeyDown} addTag={addTag} 
                handleRemoveTag={handleRemoveTag} 
            />

            <div className="form-actions-footer z-0">
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