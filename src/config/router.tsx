import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'

// On importe uniquement les layouts de base normalement
import ErrorBoundary from '@/components/common/ErrorBoundary'
import SimpleLoadingSpinner from '@/components/common/SimpleLoadingSpinner'
import AppLayout from '@/components/main/AppLayout'
import AuthLayout from '@/components/main/AuthLayout'
import ProtectedRoutes from '@/components/main/ProtectedRoutes'
import LoadingScreen from '@/screens/LoadingScreen'

// 🚀 LAZY LOADING : Ces pages ne seront téléchargées que lorsqu'elles seront visitées !
const HomePage = lazy(() => import('../screens/Dashboard'))
const LoginPage = lazy(() => import('../screens/Login'))
const ForgotPasswordPage = lazy(() => import('../screens/ForgotPassword'))
const ResetPasswordPage = lazy(() => import('../screens/ResetPassword'))
const AddEditGamePage = lazy(() => import('../screens/AddEditGame'))
const CategoryPage = lazy(() => import('../screens/Category'))
const DeconnexionPage = lazy(() => import('../screens/Deconnexion'))
const ProfilePage = lazy(() => import('../screens/Profile'))
const RegisterPage = lazy(() => import('../screens/Register'))
const StatistiquePage = lazy(() => import('../screens/Statistique'))
const ListePage = lazy(() => import('../screens/Liste'))
const DetailPage = lazy(() => import('../screens/Detail'))
const TropheesPage = lazy(() => import('../screens/Trophees'))
const WelcomePage = lazy(() => import('../screens/Welcome'))
const SettingsPage = lazy(() => import('../screens/Settings'))

// Un composant qui enveloppe nos routes paresseuses pour afficher un spinner simple et capturer les erreurs de page
const SuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<SimpleLoadingSpinner />}>{children}</Suspense>
  </ErrorBoundary>
)

// Un wrapper léger pour la déconnexion (sans ChargementPage)
const SimpleSuspenseWrapper = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<div></div>}>{children}</Suspense>
  </ErrorBoundary>
)

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <SimpleSuspenseWrapper>
        <WelcomePage />
      </SimpleSuspenseWrapper>
    ),
  },
  {
    Component: AuthLayout,
    children: [
      {
        path: '/login',
        element: (
          <SuspenseWrapper>
            <LoginPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/forgot-password',
        element: (
          <SuspenseWrapper>
            <ForgotPasswordPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/reset-password',
        element: (
          <SuspenseWrapper>
            <ResetPasswordPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: '/register',
        element: (
          <SuspenseWrapper>
            <RegisterPage />
          </SuspenseWrapper>
        ),
      },
    ],
  },
  {
    path: '/logout',
    element: (
      <SimpleSuspenseWrapper>
        <DeconnexionPage />
      </SimpleSuspenseWrapper>
    ),
  },
  {
    path: '/loading',
    element: <LoadingScreen />,
  },
  {
    Component: ProtectedRoutes,
    children: [
      {
        Component: AppLayout,
        children: [
          {
            path: '/dashboard',
            element: (
              <SuspenseWrapper>
                <HomePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/categories',
            element: (
              <SuspenseWrapper>
                <CategoryPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/list',
            element: (
              <SuspenseWrapper>
                <ListePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/game/:gameName',
            element: (
              <SuspenseWrapper>
                <DetailPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/game/add-edit-game',
            element: (
              <SuspenseWrapper>
                <AddEditGamePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/profile',
            element: (
              <SuspenseWrapper>
                <ProfilePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/statistics',
            element: (
              <SuspenseWrapper>
                <StatistiquePage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/trophies',
            element: (
              <SuspenseWrapper>
                <TropheesPage />
              </SuspenseWrapper>
            ),
          },
          {
            path: '/settings',
            element: (
              <SuspenseWrapper>
                <SettingsPage />
              </SuspenseWrapper>
            ),
          },
        ],
      },
    ],
  },
])

export default router
