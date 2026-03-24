import { useState, useEffect, useRef } from "react";
import { faUser, faLock, faUserSlash } from "@fortawesome/free-solid-svg-icons";

import "./Profile.css";
import { useProfile } from "../../hooks/components/useProfile";

import ProfilSection from "../../components/main/ProfilePage/ProfilSection";
import ConnexionSection from "../../components/main/ProfilePage/ConnexionSection";
import DeleteAccountSection from "../../components/main/ProfilePage/DeleteAccountSection";
import SideNav from "../../components/common/SideNav";

const PROFILE_SECTIONS = [
  { id: "profile-section", icon: faUser, label: "profile.links.details" },
  { id: "login-section", icon: faLock, label: "profile.links.authMethod" },
  {
    id: "account-delete-section",
    icon: faUserSlash,
    label: "profile.links.deleteAccount",
  },
];

const ProfilePage = () => {
  const {
    user,
    form,
    setForm,
    uiState,
    setUiState,
    t,
    handleSaveProfile,
    handleDeleteUser,
    handleDownloadData,
  } = useProfile();

  const [activeSection, setActiveSection] = useState("profile-section");
  const isClickScrolling = useRef(false);

  useEffect(() => {
    const handleIntersect = (entries) => {
      if (isClickScrolling.current) return;

      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    };

    const observer = new IntersectionObserver(handleIntersect, {
      root: null,
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0,
    });

    const sections = document.querySelectorAll(".profile-section-item");
    sections.forEach((section) => observer.observe(section));

    return () => sections.forEach((section) => observer.unobserve(section));
  }, []);

  const toggleMobileMenu = () => {
    setUiState((prev) => ({ ...prev, showMobileMenu: !prev.showMobileMenu }));
  };

  const closeMobileMenu = () => {
    setUiState((prev) => ({ ...prev, showMobileMenu: false }));
  };

  const handleScrollToSection = (e, id) => {
    if (e) e.preventDefault();

    isClickScrolling.current = true;
    setActiveSection(id);

    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      closeMobileMenu();

      setTimeout(() => {
        isClickScrolling.current = false;
      }, 1000);
    }
  };

  return (
    <div>
      <div className="profile-container">
        <SideNav
          sections={PROFILE_SECTIONS}
          activeSection={activeSection}
          scrollToSection={handleScrollToSection}
          showMobileMenu={uiState.showMobileMenu}
          setShowMobileMenu={(val) =>
            setUiState((prev) => ({ ...prev, showMobileMenu: val }))
          }
          t={t}
        />

        {/* Contenu Principal */}
        <div className="profile-content">
          <div id="profile-section" className="profile-section-item">
            <ProfilSection
              user={user}
              form={form}
              setForm={setForm}
              t={t}
              handleSaveProfile={handleSaveProfile}
              handleDownloadData={handleDownloadData}
            />
          </div>

          <div id="login-section" className="profile-section-item">
            <ConnexionSection
              user={user}
              form={form}
              setForm={setForm}
              uiState={uiState}
              setUiState={setUiState}
              t={t}
              handleSaveProfile={handleSaveProfile}
            />
          </div>

          <div id="account-delete-section" className="profile-section-item">
            <DeleteAccountSection setUiState={setUiState} t={t} />
          </div>
        </div>
      </div>

      {uiState.showDeletePopup && (
        <div
          className="modal-overlay"
          onClick={() =>
            setUiState((prev) => ({ ...prev, showDeletePopup: false }))
          }
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h4>{t("profile.delete.popupTitle")}</h4>
            <p>{t("profile.delete.popupMessage")}</p>
            <div className="modal-actions">
              <button
                className="btn-light"
                onClick={() =>
                  setUiState((prev) => ({ ...prev, showDeletePopup: false }))
                }
              >
                {t("common.cancel")}
              </button>
              <button className="btn-red" onClick={handleDeleteUser}>
                {t("profile.delete.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
