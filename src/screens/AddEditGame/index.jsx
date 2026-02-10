import { useAddEditGame } from "../../hooks/useAddEditGame";
import FormHeader from "../../components/secondary/AddEditGame/FormHeader";
import GameNav from "../../components/main/AddEditGame/GameNav";
import GameForm from "../../components/main/AddEditGame/GameForm";
import SuccessOverlay from "../../components/common/SuccessOverlay";
import "./AddEditGame.css";

const AddEditGamePage = () => {
    const {
        t, navigate, isEditMode, gameToEdit,
        activeSection, showMobileMenu, setShowMobileMenu, scrollToSection,
        formData, setFormData, handleChange, handleFileChange, handleSubmit,
        tagInput, setTagInput, suggestedTags, handleTagKeyDown, addTag, handleRemoveTag,
        previewImg, isAnimating
    } = useAddEditGame();

    const title = isEditMode
        ? `${t("common.edit")} ${gameToEdit?.name ?? ""}`
        : t("gameForm.addTitle");

    return (
        <div className="add-edit-page fade-in">
            <FormHeader
                navigate={navigate}
                title={title}
                t={t}
            />

            <div className="page-content">
                {!isAnimating && (
                    <GameNav 
                        activeSection={activeSection} 
                        scrollToSection={scrollToSection} 
                        showMobileMenu={showMobileMenu} 
                        setShowMobileMenu={setShowMobileMenu} 
                        t={t}
                    />
                )}

                {isAnimating ? (
                    <SuccessOverlay 
                        message={isEditMode ? t('gameForm.loading.editTitle') : t('gameForm.loading.addTitle')} 
                        subMessage={t('gameForm.loading.message')}
                    />
                ) : (
                    <GameForm 
                        t={t}
                        navigate={navigate}
                        isEditMode={isEditMode}
                        formData={formData}
                        setFormData={setFormData}
                        handleChange={handleChange}
                        handleFileChange={handleFileChange}
                        handleSubmit={handleSubmit}
                        tagInput={tagInput}
                        setTagInput={setTagInput}
                        suggestedTags={suggestedTags}
                        handleTagKeyDown={handleTagKeyDown}
                        addTag={addTag}
                        handleRemoveTag={handleRemoveTag}
                        previewImg={previewImg}
                        isAnimating={isAnimating}
                    />
                )}
            </div>
        </div>
    );
};

export default AddEditGamePage;