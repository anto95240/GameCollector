import "./CategoryForm.css";

import { useEffect, useRef,useState } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "@/context";
import { useApiMetadata } from "@/hooks/api/useApiMetadata";
import { useFormValidation } from "@/hooks/ui/useFormValidation";
import { triggerAchievementCheck } from "@/services/achievementService";
import { incrementStoredUserMetric } from "@/utils/userStorage";
import { validateCategory } from "@/utils/validators/gameValidators";

const CategoryForm = ({
  categoryType,
  isOpen,
  onClose,
  isEdit,
  initialData,
  onSuccess,
}: any) => {
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    order: "",
    color: "#ffffff",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { showSuccess, showError, showCreated, showUpdated } = useToast();

  const { createMetadata, updateMetadata } = useApiMetadata();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const validateFn = (data: any) => validateCategory(data.name);
  const { errors, touched, handleBlur, validateAll } = useFormValidation(validateFn, formData);

  useEffect(() => {
    if (isEdit && initialData) {
      // Lecture dynamique du nom pour l'édition
      const itemName =
        initialData.name ||
        initialData.label ||
        initialData.genre_name ||
        initialData.platform_name ||
        initialData.tag_name ||
        initialData.status_name ||
        (typeof initialData === "string" ? initialData : "");

      setFormData({
        name: itemName,
        brand: initialData.brand || "",
        order: initialData.order || "",
        color: initialData.color || "#ffffff",
      });
    } else {
      setFormData({ name: "", brand: "", order: "", color: "#ffffff" });
    }
  }, [isEdit, initialData, categoryType]);

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const getFormTitle = () => {
    const action = isEdit
      ? t("categories.editTitle")
      : t("categories.addTitle");
    const suffix =
      ({
        genre: t("categories.titleGenre"),
        platform: t("categories.titlePlatform"),
        tag: t("categories.titleTag"),
        status: t("categories.titleStatus"),
      } as Record<string, string>)[categoryType] || "";
    return `${action} ${suffix}`;
  };

  const getCategoryLabel = () => {
    const labels: Record<string, string> = {
      genre: t("categories.titleGenre") || "Genre",
      platform: t("categories.titlePlatform") || "Plateforme",
      tag: t("categories.titleTag") || "Tag",
      status: t("categories.titleStatus") || "Statut",
    };
    return labels[categoryType] || "Catégorie";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll(formData)) {
      setTimeout(() => {
        const firstError = document.querySelector('.border-red-500, .has-error') as HTMLElement;
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (firstError.focus) firstError.focus();
        } else if (nameInputRef.current) {
          nameInputRef.current.focus();
        }
      }, 100);
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    try {
      // Construction du payload avec les clés exactes attendues par Mongoose
      const payload: any = { color: formData.color };

      switch (categoryType) {
        case "genre":
          payload.genre_name = formData.name;
          break;
        case "platform":
          payload.platform_name = formData.name;
          payload.brand = formData.brand;
          break;
        case "tag":
          payload.tag_name = formData.name;
          payload.order = Number(formData.order) || 0;
          break;
        case "status":
          payload.status_name = formData.name;
          break;
        default:
          payload.name = formData.name;
      }

      if (isEdit) {
        const id = initialData._id || initialData.id;
        await updateMetadata(categoryType, id, payload);

        incrementStoredUserMetric("updatedCategoriesCount");

        const categoryLabel = getCategoryLabel();
        showUpdated(`${categoryLabel}: "${formData.name}"`);
      } else {
        await createMetadata(categoryType, payload);

        incrementStoredUserMetric("customCategoriesCreated");

        const categoryLabel = getCategoryLabel();
        showCreated(`${categoryLabel}: "${formData.name}"`);
      }

      triggerAchievementCheck();

      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erreur lors de l'enregistrement :", error);
      showError(t("common.savingError") || "Erreur lors de la sauvegarde");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`manager-form-container ${isOpen ? "open" : "closed"}`}>
      <div className="manager-form-wrapper">
        <p className="form-title-inner">{getFormTitle()}</p>

        <form className="form-fields" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t("categories.fields.name")}</label>
            <input
              ref={nameInputRef}
              type="text"
              className={`form-input category ${errors.name && touched.name ? 'border-red-500' : ''}`}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              onBlur={() => handleBlur("name")}
              required
              disabled={isSubmitting}
            />
            {errors.name && touched.name && (
              <span className="error-text text-red-500 text-sm mt-1 ml-1 block">{errors.name}</span>
            )}
          </div>

          {categoryType === "tag" && (
            <div className="form-group">
              <label>{t("categories.fields.order")}</label>
              <input
                type="number"
                className="form-input category"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: e.target.value })
                }
                disabled={isSubmitting}
              />
            </div>
          )}

          {categoryType === "platform" && (
            <div className="form-group">
              <label>{t("categories.fields.brand")}</label>
              <input
                type="text"
                className="form-input category"
                value={formData.brand}
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                disabled={isSubmitting}
              />
            </div>
          )}

          <div className="form-group">
            <label>{t("categories.fields.color")}</label>
            <input
              type="color"
              className="color-picker-square"
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              disabled={isSubmitting}
            />
            <div className="flex-1"></div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel-category"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn-addEdit-category"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Enregistrement..."
                : isEdit
                  ? t("categories.edit")
                  : t("categories.add")}
            </button>
          </div>
        </form>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1e1e24] border border-[#2a2a35] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {isEdit ? t("categories.editTitle", { defaultValue: "Confirmer la modification" }) : t("categories.addTitle", { defaultValue: "Confirmer l'ajout" })}
            </h3>
            <p className="text-gray-300 mb-6">
              {t("gameForm.modals.confirmMessage", { defaultValue: "Voulez-vous vraiment enregistrer ces informations ?" })}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-white bg-gray-600 hover:bg-gray-500 transition-colors"
              >
                {t("common.cancel")}
              </button>
              <button 
                type="button" 
                onClick={confirmSubmit}
                className="px-4 py-2 rounded-lg text-white bg-purple-600 hover:bg-purple-500 transition-colors"
              >
                {t("common.save", { defaultValue: "Enregistrer" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryForm;
