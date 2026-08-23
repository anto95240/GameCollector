import './AddEditGame.css'

import SideNav from '@/components/common/SideNav'
import SkeletonText from '@/components/common/Skeleton/SkeletonText'
import SuccessOverlay from '@/components/common/SuccessOverlay'
import GameForm from '@/components/main/AddEditGame/GameForm'
import FormHeader from '@/components/secondary/AddEditGame/FormHeader'
import { SECTIONS } from '@/config/constants'
import { useAddEditGame } from '@/hooks/domains/games/useAddEditGame'

const AddEditGamePage = () => {
  const {
    t,
    navigate,
    isEditMode,
    gameToEdit,
    activeSection,
    showMobileMenu,
    setShowMobileMenu,
    scrollToSection,
    formData,
    setFormData,
    handleChange,
    handleFileChange,
    handleSubmit,
    tagInput,
    setTagInput,
    suggestedTags,
    handleTagKeyDown,
    addTag,
    handleRemoveTag,
    previewImg,
    isAnimating,
    isLoading,
    optionsData,
    availableTags,
    handleAddNewMetadata,
    errors,
    touched,
    handleBlur,
    showConfirmModal,
    setShowConfirmModal,
    confirmSubmit,
    handleExternalGameSelected,
  } = useAddEditGame()

  const title = isEditMode
    ? `${t('common.edit')} ${gameToEdit?.name ?? ''}`
    : t('gameForm.addTitle')

  return (
    <div className="add-edit-page fade-in">
      <FormHeader navigate={navigate} title={title} t={t} />

      <div className="page-content">
        {!isAnimating && (
          <SideNav
            sections={SECTIONS}
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
        ) : isLoading ? (
          <div className="form-container fade-in flex flex-col gap-6 w-full max-w-4xl mx-auto p-4">
            <SkeletonText height="60px" className="rounded-xl w-full" />
            <SkeletonText height="150px" className="rounded-xl w-full" />
            <SkeletonText height="100px" className="rounded-xl w-full" />
            <SkeletonText height="200px" className="rounded-xl w-full" />
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
            optionsData={optionsData}
            availableTags={availableTags}
            handleAddNewMetadata={handleAddNewMetadata}
            errors={errors}
            touched={touched}
            handleBlur={handleBlur}
            showConfirmModal={showConfirmModal}
            setShowConfirmModal={setShowConfirmModal}
            confirmSubmit={confirmSubmit}
            handleExternalGameSelected={handleExternalGameSelected}
          />
        )}
      </div>
    </div>
  )
}

export default AddEditGamePage
