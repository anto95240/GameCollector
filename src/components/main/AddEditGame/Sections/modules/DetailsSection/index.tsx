import "./DetailsSection.css";

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import CustomSelect from "@/components/common/CustomSelect";
import FloatingInput from "@/components/common/FloatingInput";
import SectionWrapper from "@/components/secondary/AddEditGame/SectionWrapper";

export const DetailsSection = ({
  t,
  formData,
  handleChange,
  setFormData,
  optionsData,
  handleAddNewMetadata,
  errors,
  touched,
  handleBlur
}: any) => (
  <SectionWrapper id="detail" title={t("gameForm.sections.details")}>
    <div className="details-grid">
      <div className="select-wrapper">
        <label>
          {t("gameForm.fields.genre")} <span>*</span>
        </label>
        <div className="flex gap-2.5 items-center">
          <CustomSelect
            options={optionsData?.genre || []}
            value={formData.genre}
            name="genre"
            onBlur={(name: any, val: any) => handleBlur && handleBlur(name, val, formData)}
            error={errors?.genre}
            touched={touched?.genre}
            onChange={(val: any) => setFormData((p: any) => ({ ...p, genre: val }))}
          />
          <button
            type="button"
            className="btn-quick-add"
            onClick={() => handleAddNewMetadata("genre")}
            aria-label={t("common.add", { defaultValue: "Ajouter" })}
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
      </div>
      <div className="select-wrapper">
        <label>
          {t("gameForm.fields.platform")} <span>*</span>
        </label>
        <div className="flex gap-2.5 items-center">
          <CustomSelect
            options={optionsData?.platform || []}
            value={formData.platform}
            name="platform"
            onBlur={(name: any, val: any) => handleBlur && handleBlur(name, val, formData)}
            error={errors?.platform}
            touched={touched?.platform}
            onChange={(val: any) => setFormData((p: any) => ({ ...p, platform: val }))}
          />
          <button
            type="button"
            className="btn-quick-add"
            onClick={() => handleAddNewMetadata("platform")}
            aria-label={t("common.add", { defaultValue: "Ajouter" })}
          >
            <FontAwesomeIcon icon={faPlus} />
          </button>
        </div>
      </div>
      <FloatingInput
        name="year"
        label={t("gameForm.fields.releaseYear")}
        type="number"
        value={formData.year}
        onChange={handleChange}
      />
      <FloatingInput
        name="playTime"
        label={t("gameForm.fields.playtime")}
        type="number"
        value={formData.playTime}
        onChange={handleChange}
      />
      <FloatingInput
        name="developer"
        label={t("gameForm.fields.developer")}
        value={formData.developer}
        onChange={handleChange}
      />
      <FloatingInput
        name="achievements"
        label={t("gameForm.fields.achievementsExample")}
        value={formData.achievements}
        onChange={handleChange}
      />
    </div>
  </SectionWrapper>
);
