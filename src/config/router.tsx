import { createBrowserRouter } from "react-router";

import HomePage from "../screens/Dashboard";
import LoginPage from "../screens/Login"; 
import AddEditGamePage from "../screens/AddEditGame";
import CategoryPage from "../screens/Category";
import DeconnexionPage from "../screens/Deconnexion";
import ProfilePage from "../screens/Profile";
import RegisterPage from "../screens/Register";
import StatistiquePage from "../screens/Statistique";
import ListePage from "../screens/Liste";
// import ProtectedRoutes from "../components/ProtectedRoutes"
import AppLayout from "../components/AppLayout";
import ChargementPage from "../screens/Chargement";

let router = createBrowserRouter([
    {
      path: "/",
      Component: LoginPage,
    }, 
    {
      path: "/register",
      Component: RegisterPage,
    },
    {
      path: "/loading",
      Component: ChargementPage,
    },
    {
      path: "/deconnexion",
      Component: DeconnexionPage,
    },
    // {
    //   Component: ProtectedRoutes,
    //   children: [
      {
        Component: AppLayout,
        children: [  
          {
            path: "/dashboard",
            Component: HomePage,
          }, 
          {
            path: "/category",
            Component: CategoryPage,
          },
          {
            path: "/liste",
            Component: ListePage
          },
          {
            path: "/add-edit-game",
            Component: AddEditGamePage,
          },
          {
            path: "/profile",
            Component: ProfilePage,
          },
          {
            path: "/statistique",
            Component: StatistiquePage,
          }
        ]
      }
    // ]
  // },  
]
);

export default router;

