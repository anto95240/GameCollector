import './GameForm.css'

import LoadingButton from '@/components/common/LoadingButton'
import {
  DescriptionSection,
  DetailsSection,
  ExternalSearchSection,
  ImageSection,
  RatingSection,
  StatusSection,
  TagsSection,
} from '@/components/main/AddEditGame/Sections'

const GameForm = ({
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
  isEditMode,
  t,
  navigate,
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
}: any) => {
  return (
    <>
      <form className="form-container" onSubmit={handleSubmit}>
        {!isEditMode && <ExternalSearchSection t={t} onGameSelected={handleExternalGameSelected} />}
        <DescriptionSection
          t={t}
          formData={formData}
          handleChange={handleChange}
          errors={errors}
          touched={touched}
          handleBlur={handleBlur}
        />
        <RatingSection
          t={t}
          formData={formData}
          handleChange={handleChange}
          setFormData={setFormData}
          optionsData={optionsData}
        />
        <DetailsSection
          t={t}
          formData={formData}
          handleChange={handleChange}
          setFormData={setFormData}
          optionsData={optionsData}
          handleAddNewMetadata={handleAddNewMetadata}
          errors={errors}
          touched={touched}
          handleBlur={handleBlur}
        />
        <ImageSection
          t={t}
          previewImg={previewImg}
          handleFileChange={handleFileChange}
          errors={errors}
          touched={touched}
        />
        <StatusSection
          t={t}
          formData={formData}
          setFormData={setFormData}
          optionsData={optionsData}
          handleAddNewMetadata={handleAddNewMetadata}
          errors={errors}
          touched={touched}
          handleBlur={handleBlur}
        />
        <TagsSection
          t={t}
          formData={formData}
          tagInput={tagInput}
          setTagInput={setTagInput}
          suggestedTags={suggestedTags}
          handleTagKeyDown={handleTagKeyDown}
          addTag={addTag}
          handleRemoveTag={handleRemoveTag}
          availableTags={availableTags}
          errors={errors}
          touched={touched}
          handleBlur={handleBlur}
        />

        <div className="form-actions-footer">
          <button type="button" className="btn-cancel-game" onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </button>

          <LoadingButton
            text={isEditMode ? t('gameForm.buttons.save') : t('gameForm.buttons.add')}
            isAnimating={isAnimating}
            showLoading={false}
            disabled={isAnimating}
          />
        </div>
      </form>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1e1e24] border border-[#2a2a35] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {isEditMode
                ? t('gameForm.modals.confirmEdit', { defaultValue: 'Confirmer la modification' })
                : t('gameForm.modals.confirmAdd', { defaultValue: "Confirmer l'ajout" })}
            </h3>
            <p className="text-gray-300 mb-6">
              {t('gameForm.modals.confirmMessage', {
                defaultValue: 'Voulez-vous vraiment enregistrer ces informations ?',
              })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-white bg-gray-600 hover:bg-gray-500 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmSubmit}
                className="px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-500 transition-colors"
              >
                {t('common.save', { defaultValue: 'Enregistrer' })}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GameForm
