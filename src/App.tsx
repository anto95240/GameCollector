import { useEffect } from 'react'
import { RouterProvider } from 'react-router'

import AchievementToast from '@/components/common/AchievementToast'
import ErrorBoundary from '@/components/common/ErrorBoundary'
import PwaUpdater from '@/components/common/PwaUpdater'
import ValidationToast from '@/components/common/ValidationToast'
import KeyboardHelp from '@/components/KeyboardHelp'
import KeyboardShortcutsProvider from '@/components/KeyboardShortcutsProvider'
import router from '@/config/router'
import { useAuth } from '@/context/AuthContext'
import { useApiShortcuts } from '@/hooks/api/useApiShortcuts'
import { useAchievementTracker } from '@/hooks/domains/achievements/useAchievementTracker'
import keyboardShortcutsService from '@/services/keyboardShortcutsService'

function App() {
  useAchievementTracker()
  const { user } = useAuth()
  const { getShortcuts } = useApiShortcuts()

  useEffect(() => {
    if (user) {
      getShortcuts().then((shortcuts: any) => {
        if (shortcuts && shortcuts.length > 0) {
          keyboardShortcutsService.loadCustomBindings(shortcuts)
        }
      })
    }
  }, [user, getShortcuts])

  return (
    <ErrorBoundary>
      <div id="app-container" className="app-container">
        <RouterProvider router={router} />
        <KeyboardShortcutsProvider />
        <AchievementToast />
        <ValidationToast />
        <KeyboardHelp />
        <PwaUpdater />
      </div>
    </ErrorBoundary>
  )
}

export default App
