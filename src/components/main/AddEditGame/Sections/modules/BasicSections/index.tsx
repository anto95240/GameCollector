import "./BasicSections.css";

import { faImage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import CustomSelect from "@/components/common/CustomSelect";
import FloatingInput from "@/components/common/FloatingInput";
import SectionWrapper from "@/components/secondary/AddEditGame/SectionWrapper";

interface SectionProps {
  t: any;
  formData?: any;
  handleChange: any;
  setFormData?: React.Dispatch<React.SetStateAction<any>>;
  optionsData?: any;
  handleAddNewMetadata?: (type: string) => void;
  previewImg?: string | null;
  handleFileChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export const DescriptionSection: React.FC<SectionProps> = ({ t, formData, handleChange }) => (
  <SectionWrapper id="desc" title={t("gameForm.sections.description")}>
    <FloatingInput
      name="name"
      label={t("gameForm.fields.name")}
      value={formData.name}
      onChange={handleChange}
      required={true}
    />
    <div className="textarea-group">
      <label>{t("gameForm.fields.description")}</label>
      <div className="textarea-container">
        <textarea
          name="description"
          rows={4}
          value={formData.description}
          onChange={handleChange}
        />
      </div>
    </div>
  </SectionWrapper>
);

export const RatingSection: React.FC<SectionProps> = ({
  t,
  formData,
  handleChange,
  setFormData,
  optionsData,
}) => (
  <SectionWrapper id="rate" title={t("gameForm.sections.rating")}>
    <div className="select-wrapper">
      <label>{t("gameForm.fields.rating")}</label>
      <CustomSelect
        options={optionsData?.rating || []}
        value={formData.rating}
        onChange={(val) => setFormData?.((p: any) => ({ ...p, rating: val }))}
      />
    </div>
  </SectionWrapper>
);

export const CommentSection: React.FC<SectionProps> = ({ t, formData, handleChange }) => (
  <SectionWrapper id="com" title={t("gameForm.sections.comment")}>
    <div className="textarea-group">
      <label>{t("gameForm.fields.comment")}</label>
      <div className="textarea-container">
        <textarea
          name="comment"
          rows={3}
          value={formData.comment}
          onChange={handleChange}
        />
      </div>
    </div>
  </SectionWrapper>
);

export const MetadataSection: React.FC<SectionProps> = ({
  t,
  formData,
  setFormData,
  optionsData,
  handleAddNewMetadata,
}) => (
  <SectionWrapper id="meta" title={t("gameForm.sections.metadata")}>
    <div className="flex gap-2.5 items-center">
      <CustomSelect
        options={optionsData?.genre || []}
        value={formData.genre}
        onChange={(val) => setFormData?.((p: any) => ({ ...p, genre: val }))}
      />
      <button
        type="button"
        className="btn-quick-add"
        onClick={() => handleAddNewMetadata?.("genre")}
        aria-label={t("common.add", { defaultValue: "Ajouter" })}
      >
        <FontAwesomeIcon icon={faImage} />
      </button>
    </div>
    <div className="flex gap-2.5 items-center mt-3">
      <CustomSelect
        options={optionsData?.platform || []}
        value={formData.platform}
        onChange={(val) => setFormData?.((p: any) => ({ ...p, platform: val }))}
      />
      <button
        type="button"
        className="btn-quick-add"
        onClick={() => handleAddNewMetadata?.("platform")}
        aria-label={t("common.add", { defaultValue: "Ajouter" })}
      >
        <FontAwesomeIcon icon={faImage} />
      </button>
    </div>
  </SectionWrapper>
);

export const ImageSection: React.FC<SectionProps> = ({ t, previewImg, handleFileChange }) => (
  <SectionWrapper
    id="img"
    title={
      <span>
        {t("gameForm.sections.image")} <span>*</span>
      </span>
    }
  >
    <div className="image-upload-area">
      <input
        type="file"
        id="file-upload"
        name="file-upload"
        accept="image/*"
        onChange={handleFileChange}
        hidden
      />
      <label htmlFor="file-upload" className="upload-label">
        {previewImg ? (
          <img src={previewImg} alt="Preview" className="img-preview" />
        ) : (
          <div className="upload-placeholder">
            <FontAwesomeIcon icon={faImage} className="upload-icon" />
            <p>
              {t("gameForm.fields.downloadImage")} <span>*</span>
            </p>
          </div>
        )}
      </label>
    </div>
  </SectionWrapper>
);
