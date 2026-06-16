import './InfoSections.css'

import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import CustomSelect from '@/components/common/CustomSelect'
import GameField from '@/components/secondary/AddEditGame/GameField'
import SectionWrapper from '@/components/secondary/AddEditGame/SectionWrapper'

export const InfoSection = ({
  t,
  formData,
  handleChange,
  _setFormData,
  _optionsData,
  _handleAddNewMetadata,
}: any) => (
  <SectionWrapper id="info" title={t('gameForm.sections.infos')}>
    <div className="info-grid">
      <GameField
        label={t('gameForm.fields.year')}
        tooltip={t('gameForm.tooltips.releaseYear')}
        htmlFor="year-info"
      >
        <input
          type="number"
          id="year-info"
          name="year"
          value={formData.year}
          onChange={handleChange}
        />
      </GameField>
      <GameField
        label={t('gameForm.fields.playingTime')}
        tooltip={t('gameForm.tooltips.playtime')}
        htmlFor="playTime-info"
      >
        <input
          type="number"
          id="playTime-info"
          name="playTime"
          value={formData.playTime}
          onChange={handleChange}
        />
      </GameField>
      <GameField
        label={t('gameForm.fields.developer')}
        tooltip={t('gameForm.tooltips.developer')}
        htmlFor="developer-info"
      >
        <input
          type="text"
          id="developer-info"
          name="developer"
          value={formData.developer}
          onChange={handleChange}
        />
      </GameField>
    </div>
  </SectionWrapper>
)

export const StatusSection = ({
  t,
  formData,
  setFormData,
  optionsData,
  handleAddNewMetadata,
  errors,
  touched,
  handleBlur,
}: any) => (
  <SectionWrapper
    id="status"
    title={
      <span>
        {t('gameForm.sections.status')} <span>*</span>
      </span>
    }
  >
    <GameField
      label={t('gameForm.fields.status')}
      tooltip={t('gameForm.tooltips.status')}
      required={true}
      error={errors?.status}
      touched={touched?.status}
    >
      <div className="flex gap-2.5 items-center w-full">
        <CustomSelect
          options={optionsData?.status || []}
          value={formData.status}
          name="status"
          onBlur={(name: any, val: any) => handleBlur && handleBlur(name, val, formData)}
          onChange={(val: any) => setFormData((p: any) => ({ ...p, status: val }))}
        />
        <button
          type="button"
          className="btn-quick-add shrink-0"
          onClick={() => handleAddNewMetadata('status')}
          aria-label={t('common.add', { defaultValue: 'Ajouter' })}
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </GameField>
  </SectionWrapper>
)

export const AchievementsSection = ({ t, formData, handleChange }: any) => (
  <SectionWrapper id="achievements" title={t('gameForm.sections.achievements')}>
    <GameField
      label={t('gameForm.fields.achievements')}
      tooltip={t('gameForm.tooltips.achievements')}
      htmlFor="achievements-text"
    >
      <textarea
        id="achievements-text"
        name="achievements"
        rows={3}
        value={formData.achievements}
        onChange={handleChange}
      />
    </GameField>
  </SectionWrapper>
)

export const FavoriteAndSoonSection = ({ t, formData, handleChange }: any) => (
  <SectionWrapper id="flags" title={t('gameForm.sections.flags')}>
    <div className="checkbox-group">
      <label>
        <input
          type="checkbox"
          name="isFavorite"
          checked={formData.isFavorite}
          onChange={handleChange}
        />
        {t('gameForm.fields.isFavorite')}
      </label>
    </div>
    <div className="checkbox-group">
      <label>
        <input type="checkbox" name="isSoon" checked={formData.isSoon} onChange={handleChange} />
        {t('gameForm.fields.isSoon')}
      </label>
    </div>
  </SectionWrapper>
)
