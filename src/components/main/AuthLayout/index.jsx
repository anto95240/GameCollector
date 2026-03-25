import { Outlet, useLocation } from "react-router";
import "../../../screens/Login/Login.css"; 
import "../../../screens/Register/Register.css";

const AuthLayout = () => {
  const location = useLocation();
  const isRegister = location.pathname === "/register";

  return (
    <div className="auth-container">
      {/* La carte reste totalement fixe et immobile */}
      <div className={`auth-card console-border-card ${isRegister ? "register-card" : ""}`}>
        
        {/* Le contenu à l'intérieur est le seul à s'animer */}
        <div key={location.pathname} >
          <Outlet />
        </div>

      </div>
    </div>
  );
};

export default AuthLayout;