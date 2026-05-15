import FloatingInput from "@/components/common/FloatingInput";
import CustomSelect from "@/components/common/CustomSelect";
import SectionWrapper from "@/components/secondary/AddEditGame/SectionWrapper";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import "./InfoSections.css";

export const InfoSection = ({
  t,
  formData,
  handleChange,
  setFormData,
  optionsData,
  handleAddNewMetadata,
}) => (
  <SectionWrapper id="info" title={t("gameForm.sections.infos")}>
    <div className="info-grid">
      <FloatingInput
        name="year"
        label={t("gameForm.fields.year")}
        value={formData.year}
        onChange={handleChange}
        type="number"
      />
      <FloatingInput
        name="playTime"
        label={t("gameForm.fields.playingTime")}
        value={formData.playTime}
        onChange={handleChange}
        type="number"
      />
      <FloatingInput
        name="developer"
        label={t("gameForm.fields.developer")}
        value={formData.developer}
        onChange={handleChange}
      />
    </div>
  </SectionWrapper>
);

export const StatusSection = ({
  t,
  formData,
  setFormData,
  optionsData,
  handleAddNewMetadata,
}) => (
  <SectionWrapper
    id="status"
    title={
      <span>
        {t("gameForm.sections.status")} <span>*</span>
      </span>
    }
  >
    <div className="flex gap-2.5 items-center">
      <CustomSelect
        options={optionsData?.status || []}
        value={formData.status}
        onChange={(val) => setFormData((p) => ({ ...p, status: val }))}
      />
      <button
        type="button"
        className="btn-quick-add"
        onClick={() => handleAddNewMetadata("status")}
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>
    </div>
  </SectionWrapper>
);

export const AchievementsSection = ({ t, formData, handleChange }) => (
  <SectionWrapper id="achievements" title={t("gameForm.sections.achievements")}>
    <div className="textarea-group">
      <label>{t("gameForm.fields.achievements")}</label>
      <div className="textarea-container">
        <textarea
          name="achievements"
          rows="3"
          value={formData.achievements}
          onChange={handleChange}
        />
      </div>
    </div>
  </SectionWrapper>
);

export const FavoriteAndSoonSection = ({ t, formData, handleChange }) => (
  <SectionWrapper id="flags" title={t("gameForm.sections.flags")}>
    <div className="checkbox-group">
      <label>
        <input
          type="checkbox"
          name="isFavorite"
          checked={formData.isFavorite}
          onChange={handleChange}
        />
        {t("gameForm.fields.isFavorite")}
      </label>
    </div>
    <div className="checkbox-group">
      <label>
        <input
          type="checkbox"
          name="isSoon"
          checked={formData.isSoon}
          onChange={handleChange}
        />
        {t("gameForm.fields.isSoon")}
      </label>
    </div>
  </SectionWrapper>
);
