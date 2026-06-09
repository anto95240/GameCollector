import { useState } from "react";
import "./BasicSections.css";

import { faImage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import CustomSelect from "@/components/common/CustomSelect";
import FloatingInput from "@/components/common/FloatingInput";
import SectionWrapper from "@/components/secondary/AddEditGame/SectionWrapper";

export const DescriptionSection = ({ t, formData, handleChange }: any) => (
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

export const RatingSection = ({
  t,
  formData,
  handleChange,
  setFormData,
  optionsData,
}: any) => (
  <SectionWrapper id="rate" title={t("gameForm.sections.rating")}>
    <div className="select-wrapper">
      <label>{t("gameForm.fields.rating")}</label>
      <CustomSelect
        options={optionsData?.rating || []}
        value={formData.rating}
        onChange={(val) => setFormData((p: any) => ({ ...p, rating: val }))}
      />
    </div>
  </SectionWrapper>
);

export const CommentSection = ({ t, formData, handleChange }: any) => (
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

export const MetadataSection = ({
  t,
  formData,
  setFormData,
  optionsData,
  handleAddNewMetadata,
}: any) => (
  <SectionWrapper id="meta" title={t("gameForm.sections.metadata")}>
    <div className="flex gap-2.5 items-center">
      <CustomSelect
        options={optionsData?.genre || []}
        value={formData.genre}
        onChange={(val) => setFormData((p: any) => ({ ...p, genre: val }))}
      />
      <button
        type="button"
        className="btn-quick-add"
        onClick={() => handleAddNewMetadata("genre")}
        aria-label={t("common.add", { defaultValue: "Ajouter" })}
      >
        <FontAwesomeIcon icon={faImage} />
      </button>
    </div>
    <div className="flex gap-2.5 items-center mt-3">
      <CustomSelect
        options={optionsData?.platform || []}
        value={formData.platform}
        onChange={(val) => setFormData((p: any) => ({ ...p, platform: val }))}
      />
      <button
        type="button"
        className="btn-quick-add"
        onClick={() => handleAddNewMetadata("platform")}
        aria-label={t("common.add", { defaultValue: "Ajouter" })}
      >
        <FontAwesomeIcon icon={faImage} />
      </button>
    </div>
  </SectionWrapper>
);

export const ImageSection = ({ t, previewImg, handleFileChange }: any) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onFileChange = (e: any) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      setProgress(0);
      
      const interval = setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(() => setIsUploading(false), 200);
            return 100;
          }
          return p + 15;
        });
      }, 50);

      handleFileChange(e);
    }
  };

  return (
    <SectionWrapper
      id="img"
      title={
        <span>
          {t("gameForm.sections.image")} <span>*</span>
        </span>
      }
    >
      <div className="image-upload-area relative overflow-hidden">
        <input
          type="file"
          id="file-upload"
          name="file-upload"
          accept="image/*"
          onChange={onFileChange}
          hidden
        />
        <label htmlFor="file-upload" className="upload-label">
          {previewImg ? (
            <img src={previewImg} alt="Preview" className={`img-preview ${isUploading ? 'opacity-50' : 'opacity-100'} transition-opacity`} />
          ) : (
            <div className="upload-placeholder">
              <FontAwesomeIcon icon={faImage} className="upload-icon" />
              <p>
                {t("gameForm.fields.downloadImage")} <span>*</span>
              </p>
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
    </SectionWrapper>
  );
};

