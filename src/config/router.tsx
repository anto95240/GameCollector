import { createBrowserRouter } from "react-router";
import { lazy, Suspense } from "react";

// On importe uniquement les layouts de base normalement
import ProtectedRoutes from "@/components/main/ProtectedRoutes";
import AppLayout from "@/components/main/AppLayout";
import AuthLayout from "@/components/main/AuthLayout";
import SimpleLoadingSpinner from "@/components/common/SimpleLoadingSpinner";
import LoadingScreen from "@/screens/LoadingScreen";

// 🚀 LAZY LOADING : Ces pages ne seront téléchargées que lorsqu'elles seront visitées !
const HomePage = lazy(() => import("../screens/Dashboard"));
const LoginPage = lazy(() => import("../screens/Login"));
const AddEditGamePage = lazy(() => import("../screens/AddEditGame"));
const CategoryPage = lazy(() => import("../screens/Category"));
const DeconnexionPage = lazy(() => import("../screens/Deconnexion"));
const ProfilePage = lazy(() => import("../screens/Profile"));
const RegisterPage = lazy(() => import("../screens/Register"));
const StatistiquePage = lazy(() => import("../screens/Statistique"));
const ListePage = lazy(() => import("../screens/Liste"));
const DetailPage = lazy(() => import("../screens/Detail"));
const TropheesPage = lazy(() => import("../screens/Trophees"));

// Un composant qui enveloppe nos routes paresseuses pour afficher un spinner simple
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<SimpleLoadingSpinner />}>{children}</Suspense>
);

// Un wrapper léger pour la déconnexion (sans ChargementPage)
const SimpleSuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<div></div>}>{children}</Suspense>
);

let router = createBrowserRouter([
  {
    Component: AuthLayout,
    children: [
      {
        path: "/",
        element: (
          <SuspenseWrapper>
            <LoginPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: "/register",
        element: (
          <SuspenseWrapper>
            <RegisterPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },
  {
    path: "/logout",
    element: (
      <SimpleSuspenseWrapper>
        <DeconnexionPage />
      </SimpleSuspenseWrapper>
    ),
  },
  {
    path: "/loading",
    element: <LoadingScreen />,
  },
  {
    Component: ProtectedRoutes,
    children: [
      {
        Component: AppLayout,
        children: [
          {
            path: "/dashboard",
            element: (
              <SuspenseWrapper>
                <HomePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: "/categories",
            element: (
              <SuspenseWrapper>
                <CategoryPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: "/list",
            element: (
              <SuspenseWrapper>
                <ListePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: "/game/:gameName",
            element: (
              <SuspenseWrapper>
                <DetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: "/game/add-edit-game",
            element: (
              <SuspenseWrapper>
                <AddEditGamePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: "/profile",
            element: (
              <SuspenseWrapper>
                <ProfilePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: "/statistics",
            element: (
              <SuspenseWrapper>
                <StatistiquePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: "/trophies",
            element: (
              <SuspenseWrapper>
                <TropheesPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },
]);

export default router;
