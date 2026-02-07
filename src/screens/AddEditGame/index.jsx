import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { useAddEditGame } from "../../hooks/useAddEditGame";
import FormHeader from "../../components/secondary/AddEditGame/FormHeader";
import GameNav from "../../components/main/AddEditGame/GameNav";
import GameForm from "../../components/main/AddEditGame/GameForm";
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
                    <div className="save-success-overlay fade-in">
                        <div className="success-content">
                            <div className="success-icon-wrapper">
                                <FontAwesomeIcon icon={faCheckCircle} className="success-icon" />
                                <div className="success-ripple"></div>
                            </div>
                            <h2>{isEditMode ? "Modifications enregistrées !" : "Jeu ajouté avec succès !"}</h2>
                            <p>Redirection vers la fiche du jeu...</p>
                            <FontAwesomeIcon icon={faSpinner} spin className="redirect-spinner" />
                        </div>
                    </div>
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