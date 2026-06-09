import '@/config/i18n'
import '@/config/interceptor'

import { useEffect } from 'react'
import { RouterProvider } from 'react-router'

import AchievementToast from '@/components/common/AchievementToast'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import ValidationToast from '@/components/common/ValidationToast'
import KeyboardHelp from '@/components/KeyboardHelp'
import KeyboardShortcutsProvider from '@/components/KeyboardShortcutsProvider'
import router from '@/config/router'
import { useAuth } from '@/context/AuthContext'
import { useAchievementTracker } from '@/hooks/domains/achievements/useAchievementTracker'
import keyboardShortcutsService from '@/services/keyboardShortcutsService'

function App() {
  useAchievementTracker()
  const { user } = useAuth()

  useEffect(() => {
    if (user?.shortcuts && user.shortcuts.length > 0) {
      keyboardShortcutsService.loadCustomBindings(user.shortcuts)
    }
  }, [user?.shortcuts])

  return (
    <ErrorBoundary>
      <div id="app-container" className="app-container">
        <RouterProvider router={router} />
        <KeyboardShortcutsProvider />
        <AchievementToast />
        <ValidationToast />
        <KeyboardHelp />
      </div>
    </ErrorBoundary>
  )
}

export default App
