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
import DetailPage from "../screens/Detail";
// import ProtectedRoutes from "../components/ProtectedRoutes"
import AppLayout from "../components/main/AppLayout";
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
      path: "/logout",
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
            path: "/categories",
            Component: CategoryPage,
          },
          {
            path: "/list",
            Component: ListePage
          },
          {
            path: "/game/:gameName",
            Component: DetailPage
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
            path: "/statistics",
            Component: StatistiquePage,
          }
        ]
      }
    // ]
  // },  
]
);

export default router;

