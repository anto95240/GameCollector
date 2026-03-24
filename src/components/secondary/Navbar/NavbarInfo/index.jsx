import { useState, useEffect } from "react";
import UserMenu from "../UserMenu";
import { useNavbar } from "../../../../hooks/components/useNavbar";
import { useAuth } from "../../../../context/AuthContext";
import "./NavbarInfo.css";
import { API_URL } from "../../../../config/constants";

const NavbarInfo = ({ t, setActionsOpen, actionsOpen }) => {
  const [dateTime, setDateTime] = useState("");
  const [batteryLevel, setBatteryLevel] = useState(null);
  const { state, setters, actions } = useNavbar();

  const { user } = useAuth();

  const handleCloseMenu = () => {
    setActionsOpen(false);
  };

  // Gestion de la Date et de l'Heure
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = String(now.getFullYear()).slice(-2); // "2025" -> "25"
      const date = `${day}/${month}/${year}`;
      const time = now.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      setDateTime(`${date} - ${time}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Gestion de la Batterie
  useEffect(() => {
    if ("getBattery" in navigator) {
      navigator.getBattery().then((battery) => {
        const updateBattery = () =>
          setBatteryLevel(Math.floor(battery.level * 100));
        updateBattery();
        battery.addEventListener("levelchange", updateBattery);
        return () => battery.removeEventListener("levelchange", updateBattery);
      });
    }
  }, []);

  const getInitials = () => {
    if (!user) return "GC";
    const first = user.firstname?.charAt(0) || "";
    const last = user.lastname?.charAt(0) || "";
    return (first + last).toUpperCase();
  };

  // === NOUVELLES VÉRIFICATIONS (Comme sur la page profil) ===
  const isDefaultImage =
    !user?.image ||
    user.image === "https://cdn-icons-png.flaticon.com/512/847/847969.png";

  const avatarURL = user?.image
    ? user.image.startsWith("http")
      ? user.image
      : `${API_URL}/${user.image}`
    : "";

  return (
    <div className="navbar-info">
      <div className="flex flex-row items-center gap-2">
        <span className="status-indicator"></span>
        <p className="hidden sm:block">{t("navbar.online")}</p>
      </div>
      <p>{dateTime}</p>
      <p>{batteryLevel !== null ? `${batteryLevel}%` : "⚡"}</p>

      <div className="relative">
        <button
          className="navbar-connection-button"
          onClick={(e) => {
            e.stopPropagation();
            setActionsOpen((prev) => !prev);
          }}
          style={!isDefaultImage ? { padding: 0, overflow: "hidden" } : {}}
        >
          {!isDefaultImage ? (
            <img
              src={avatarURL}
              alt="Profile"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: "inherit",
              }}
            />
          ) : (
            <span>{getInitials()}</span>
          )}
        </button>

        {actionsOpen && (
          <UserMenu
            user={user}
            t={t}
            state={state}
            setters={setters}
            actions={actions}
            onClose={handleCloseMenu}
          />
        )}
      </div>
    </div>
  );
};

export default NavbarInfo;
