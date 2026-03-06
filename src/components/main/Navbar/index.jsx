import "./Navbar.css";

import NavbarInfo from "../../secondary/Navbar/NavbarInfo";
import NavLinks from "../../secondary/Navbar/NavLinks";

import { useNavbar } from "./../../../hooks/components/useNavbar";

const Navbar = () => {
  const { t, state, setters } = useNavbar();
  const { actionsOpen } = state;
  const { setActionsOpen } = setters;

  return (
    <>
      <header className="navbar px-4 sm:px-6">
        <img className="navbar-img" src="/logo.png" alt="Logo" />

        <nav className="navbar-links">
          <NavLinks t={t} />
        </nav>

        <NavbarInfo
          t={t}
          setActionsOpen={setActionsOpen}
          actionsOpen={actionsOpen}
        />
      </header>
    </>
  );
};

export default Navbar;
