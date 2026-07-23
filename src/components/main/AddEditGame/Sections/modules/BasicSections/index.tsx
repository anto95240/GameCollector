import './BasicSections.css'

import { faImage } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'

import CustomSelect from '@/components/common/CustomSelect'
import GameField from '@/components/secondary/AddEditGame/GameField'
import SectionWrapper from '@/components/secondary/AddEditGame/SectionWrapper'

export const DescriptionSection = ({
  t,
  formData,
  handleChange,
  errors,
  touched,
  handleBlur,
}: any) => (
  <SectionWrapper id="desc" title={t('gameForm.sections.description')}>
    <GameField
      label={t('gameForm.fields.name')}
      required={true}
      tooltip={t('gameForm.tooltips.name')}
      error={errors?.name}
      touched={touched?.name}
      htmlFor="name"
    >
      <input
        type="text"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        onBlur={(e: any) => handleBlur && handleBlur('name', e.target.value, formData)}
      />
    </GameField>

    <GameField
      label={t('gameForm.fields.description')}
      tooltip={t('gameForm.tooltips.description')}
      htmlFor="description"
    >
      <textarea
        id="description"
        name="description"
        rows={4}
        value={formData.description}
        onChange={handleChange}
      />
    </GameField>
  </SectionWrapper>
)

export const RatingSection = ({ t, formData, handleChange, setFormData, optionsData }: any) => (
  <SectionWrapper id="rate" title={t('gameForm.sections.rating')}>
    <GameField label={t('gameForm.fields.rating')} tooltip={t('gameForm.tooltips.rating')}>
      <CustomSelect
        options={optionsData?.rating || []}
        value={formData.rating}
        onChange={(val: any) => setFormData((p: any) => ({ ...p, rating: val }))}
      />
    </GameField>

    <GameField
      label={t('gameForm.fields.comment')}
      tooltip={t('gameForm.tooltips.comment')}
      htmlFor="comment"
    >
      <textarea
        id="comment"
        name="comment"
        rows={3}
        value={formData.comment}
        onChange={handleChange}
      />
    </GameField>
  </SectionWrapper>
)

export const MetadataSection = ({
  t,
  formData,
  setFormData,
  optionsData,
  handleAddNewMetadata,
  errors,
  touched,
  handleBlur,
}: any) => (
  <SectionWrapper id="meta" title={t('gameForm.sections.metadata')}>
    <GameField
      label={t('gameForm.fields.genre')}
      tooltip={t('gameForm.tooltips.genre')}
      error={errors?.genre}
      touched={touched?.genre}
      required={true}
    >
      <div className="flex gap-2.5 items-center w-full">
        <CustomSelect
          options={optionsData?.genre || []}
          value={formData.genre}
          name="genre"
          onBlur={(name: any, val: any) => handleBlur && handleBlur(name, val, formData)}
          onChange={(val: any) => setFormData((p: any) => ({ ...p, genre: val }))}
        />
        <button
          type="button"
          className="btn-quick-add shrink-0"
          onClick={() => handleAddNewMetadata('genre')}
          aria-label={t('common.add', { defaultValue: 'Ajouter' })}
        >
          <FontAwesomeIcon icon={faImage} />
        </button>
      </div>
    </GameField>

    <GameField
      label={t('gameForm.fields.platform')}
      tooltip={t('gameForm.tooltips.platform')}
      error={errors?.platform}
      touched={touched?.platform}
      required={true}
    >
      <div className="flex gap-2.5 items-center w-full">
        <CustomSelect
          options={optionsData?.platform || []}
          value={formData.platform}
          name="platform"
          onBlur={(name: any, val: any) => handleBlur && handleBlur(name, val, formData)}
          onChange={(val: any) => setFormData((p: any) => ({ ...p, platform: val }))}
        />
        <button
          type="button"
          className="btn-quick-add shrink-0"
          onClick={() => handleAddNewMetadata('platform')}
          aria-label={t('common.add', { defaultValue: 'Ajouter' })}
        >
          <FontAwesomeIcon icon={faImage} />
        </button>
      </div>
    </GameField>
  </SectionWrapper>
)

export const ImageSection = ({ t, previewImg, handleFileChange, errors, touched }: any) => {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isDragOver, setIsDragOver] = useState(false)

  const onFileChange = (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true)
      setProgress(0)

      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(interval)
            setTimeout(() => setIsUploading(false), 200)
            return 100
          }
          return p + 15
        })
      }, 50)

      handleFileChange(e)
    }
  }

  const handleDragOver = (e: any) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: any) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: any) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileChange({ target: { files: e.dataTransfer.files } })
    }
  }

  return (
    <SectionWrapper id="img" title={t('gameForm.sections.image')}>
      <GameField
        label={t('gameForm.sections.image')}
        required={true}
        tooltip={t('gameForm.tooltips.image')}
        error={errors?.image}
        touched={touched?.image}
      >
        <div
          className={`image-upload-area relative overflow-hidden transition-all duration-200 ${isDragOver ? 'ring-2 ring-brand-primary ring-offset-2 ring-offset-[var(--bg-card)] scale-[1.02]' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            name="file-upload"
            accept="image/*"
            onChange={onFileChange}
            hidden
          />
          <label
            htmlFor="file-upload"
            className={`upload-label ${errors?.image && touched?.image ? 'border-red-500 border-2' : ''} ${isDragOver ? 'border-brand-primary bg-white/5' : ''}`}
          >
            {previewImg ? (
              <img
                src={previewImg}
                alt="Preview"
                className={`img-preview ${isUploading ? 'opacity-50' : 'opacity-100'} transition-opacity`}
              />
            ) : (
              <div className="upload-placeholder">
                <FontAwesomeIcon icon={faImage} className="upload-icon" />
                <p>{t('gameForm.fields.downloadImage')}</p>
              </div>
            )}
          </label>
          {isUploading && (
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-800/50 z-10">
              <div
                className="h-full bg-purple-500 transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </GameField>
    </SectionWrapper>
  )
}
