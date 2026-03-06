import { useRef } from "react";
import ProfileCard from "../../../secondary/Profile/ProfileCard";
import ActionButtons from "../../../secondary/Profile/ActionButtons";
import SimpleInput from "../../../secondary/Profile/SimpleInput";
import "./ProfilSection.css";

const ProfilSection = ({ user, form, setForm, t, handleSaveProfile }) => {
  const fileInputRef = useRef(null);

  const handleCancel = () => {
    setForm((prev) => ({
      ...prev,
      firstname: user?.firstname || "",
      lastname: user?.lastname || "",
      username: user?.username || "",
      imageFile: null,
      avatarURL: user?.image || "",
    }));
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const getInitials = () => {
    const first = form.firstname?.charAt(0) || "";
    const last = form.lastname?.charAt(0) || "";
    return `${first}${last}`.toUpperCase();
  };

  const isDefaultImage =
    form.avatarURL ===
      "https://cdn-icons-png.flaticon.com/512/847/847969.png" ||
    !form.avatarURL;

  return (
    <ProfileCard
      id="profile-section"
      title={t("profile.links.details")}
      actions={
        <ActionButtons
          onCancel={handleCancel}
          onSave={handleSaveProfile}
          t={t}
        />
      }
    >
      <div className="profile-form-layout">
        {/* Champs texte */}
        <div className="profile-fields">
          <SimpleInput
            label={t("profile.labels.firstName")}
            value={form.firstname}
            onChange={(e) => setForm({ ...form, firstname: e.target.value })}
          />
          <SimpleInput
            label={t("profile.labels.name")}
            value={form.lastname}
            onChange={(e) => setForm({ ...form, lastname: e.target.value })}
          />
          <SimpleInput
            label={t("profile.labels.username")}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>

        {/* Avatar */}
        <div className="profile-avatar">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setForm({ ...form, imageFile: e.target.files[0] });
              }
            }}
          />

          <div className="avatar-wrapper">
            {form.imageFile ? (
              <img
                className="avatar-circle"
                src={URL.createObjectURL(form.imageFile)}
                alt="Preview"
              />
            ) : !isDefaultImage ? (
              <img className="avatar-circle" src={form.avatarURL} alt="User" />
            ) : (
              <div className="avatar-circle no-img">{getInitials()}</div>
            )}
          </div>

          <ActionButtons
            onDownload={handleImageClick}
            t={t}
            labels={{
              download: t("profile.labels.profilePicture"),
            }}
          />
        </div>
      </div>
    </ProfileCard>
  );
};

export default ProfilSection;
