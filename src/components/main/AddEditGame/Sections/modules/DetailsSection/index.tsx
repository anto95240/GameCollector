import './DetailsSection.css'

import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import CustomSelect from '@/components/common/CustomSelect'
import GameField from '@/components/secondary/AddEditGame/GameField'
import SectionWrapper from '@/components/secondary/AddEditGame/SectionWrapper'

export const DetailsSection = ({
  t,
  formData,
  handleChange,
  setFormData,
  optionsData,
  handleAddNewMetadata,
  errors,
  touched,
  handleBlur,
}: any) => (
  <SectionWrapper id="detail" title={t('gameForm.sections.details')}>
    <div className="details-grid">
      <GameField
        label={t('gameForm.fields.genre')}
        tooltip={t('gameForm.tooltips.genre')}
        required={true}
        error={errors?.genre}
        touched={touched?.genre}
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
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
      </GameField>

      <GameField
        label={t('gameForm.fields.platform')}
        tooltip={t('gameForm.tooltips.platform')}
        required={true}
        error={errors?.platform}
        touched={touched?.platform}
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
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
      </GameField>

      <GameField
        label={t('gameForm.fields.releaseYear')}
        tooltip={t('gameForm.tooltips.releaseYear')}
        htmlFor="year"
      >
        <input type="number" id="year" name="year" value={formData.year} onChange={handleChange} />
      </GameField>

      <GameField
        label={t('gameForm.fields.playtime')}
        tooltip={t('gameForm.tooltips.playtime')}
        htmlFor="playTime"
      >
        <input
          type="number"
          id="playTime"
          name="playTime"
          value={formData.playTime}
          onChange={handleChange}
        />
      </GameField>

      <GameField
        label={t('gameForm.fields.developer')}
        tooltip={t('gameForm.tooltips.developer')}
        htmlFor="developer"
      >
        <input
          type="text"
          id="developer"
          name="developer"
          value={formData.developer}
          onChange={handleChange}
        />
      </GameField>

      <GameField
        label={t('gameForm.fields.achievementsExample')}
        tooltip={t('gameForm.tooltips.achievements')}
        htmlFor="achievements"
      >
        <input
          type="text"
          id="achievements"
          name="achievements"
          value={formData.achievements}
          onChange={handleChange}
        />
      </GameField>
    </div>
  </SectionWrapper>
)
