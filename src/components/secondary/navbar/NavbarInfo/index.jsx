import { useState, useEffect } from "react";
import UserMenu from "../UserMenu";
import { useNavbar } from "../../../../hooks/useNavbar";
import "./NavbarInfo.css";  

const NavbarInfo = ({t, setActionsOpen, actionsOpen}) => {
  const [dateTime, setDateTime] = useState("");
  const [batteryLevel, setBatteryLevel] = useState(null);
  const { state, setters, actions } = useNavbar();

  const handleCloseMenu = () => {
    setActionsOpen(false);
  };

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

  useEffect(() => {
    if ("getBattery" in navigator) {
      navigator.getBattery().then((battery) => {
        const updateBattery = () => setBatteryLevel(Math.floor(battery.level * 100));
        updateBattery();
        battery.addEventListener("levelchange", updateBattery);
        return () => battery.removeEventListener("levelchange", updateBattery);
      });
    }
  }, []);

  return (
    <div className="navbar-info flex flex-row items-center gap-3 md:gap-6 ml-auto"> 
        <div className="flex flex-row items-center gap-2">
          <span className="status-indicator"></span>
          <p className="hidden sm:block">{t("navbar.online")}</p> 
        </div>
        <p>{dateTime}</p>
        <p>{batteryLevel !== null ? `${batteryLevel}%` : "⚡"}</p>

        {/* --- AJOUT DU WRAPPER RELATIF ICI --- */}
        <div className="relative" >
            <button 
              className="navbar-connection-button flex items-center justify-center" 
              onClick={(e) => { e.stopPropagation(); setActionsOpen(prev => !prev); }}
            >
              <h1>AR</h1>
            </button>

            {/* Le menu s'affichera par dessus tout, ancré à ce bloc */}
            {actionsOpen && (
              <UserMenu t={t} state={state} setters={setters} actions={actions} onClose={handleCloseMenu} />
            )}
        </div>
    </div>
  );
};

export default NavbarInfo;
