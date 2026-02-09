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

    return (
        <div className="add-edit-page fade-in">
            <FormHeader 
                navigate={navigate} 
                t={t} 
                title={isEditMode ? `Modification de ${gameToEdit?.name}` : t('gameForm.addTitle')} 
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
                        message={isEditMode ? "Modifications enregistrées !" : "Jeu ajouté avec succès !"} 
                        subMessage="Redirection vers la fiche du jeu..."
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