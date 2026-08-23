import './BugReportSection.css'

import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBug, faLightbulb, faPaperPlane } from '@fortawesome/free-solid-svg-icons'

import ProfileCard from '@/components/secondary/Profile/ProfileCard'
import LoadingButton from '@/components/common/LoadingButton'
import InlineFormItem from '@/components/secondary/Profile/InlineFormItem'

const BugReportSection = ({ user, t }: any) => {
  const [type, setType] = useState<'bug' | 'suggestion' | ''>('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setStatus('loading')

    try {
      const response = await fetch('/api/send-bug-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email, type, message }),
      })

      if (!response.ok) throw new Error('Failed to send')

      setStatus('success')
      setMessage('')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  return (
    <ProfileCard id="bug-report-section" title={t('profile.bugReport.title')}>
      <div
        className="bug-report-container"
        style={{ display: 'flex', flexDirection: 'column', gap: '0' }}
      >
        <InlineFormItem
          label={t('profile.bugReport.typeBug')}
          showForm={type === 'bug'}
          toggleForm={() => setType(type === 'bug' ? '' : 'bug')}
        >
          <form onSubmit={handleSubmit} className="bug-report-form" style={{ marginTop: '1rem' }}>
            <textarea
              className="cyber-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('profile.bugReport.messagePlaceholder')}
              rows={5}
              required
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'var(--color-text)',
                resize: 'vertical',
                outline: 'none',
                boxShadow:
                  'inset 0 2px 10px rgba(255, 255, 255, 0.05), 0 4px 15px rgba(0, 0, 0, 0.2)',
              }}
            />

            {status === 'error' && <p className="error-text">{t('profile.bugReport.error')}</p>}
            {status === 'success' && (
              <p className="success-text">{t('profile.bugReport.success')}</p>
            )}

            <div
              className="bug-report-footer"
              style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}
            >
              <LoadingButton
                text={t('profile.bugReport.submit')}
                isAnimating={status === 'loading'}
                loadingVariant="login"
                variant="primary"
              />
            </div>
          </form>
        </InlineFormItem>

        <InlineFormItem
          label={t('profile.bugReport.typeSuggestion')}
          showForm={type === 'suggestion'}
          toggleForm={() => setType(type === 'suggestion' ? '' : 'suggestion')}
        >
          <form onSubmit={handleSubmit} className="bug-report-form" style={{ marginTop: '1rem' }}>
            <textarea
              className="cyber-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('profile.bugReport.messagePlaceholder')}
              rows={5}
              required
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'var(--color-text)',
                resize: 'vertical',
                outline: 'none',
                boxShadow:
                  'inset 0 2px 10px rgba(255, 255, 255, 0.05), 0 4px 15px rgba(0, 0, 0, 0.2)',
              }}
            />

            {status === 'error' && <p className="error-text">{t('profile.bugReport.error')}</p>}
            {status === 'success' && (
              <p className="success-text">{t('profile.bugReport.success')}</p>
            )}

            <div
              className="bug-report-footer"
              style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}
            >
              <LoadingButton
                text={t('profile.bugReport.submit')}
                isAnimating={status === 'loading'}
                loadingVariant="login"
                variant="primary"
              />
            </div>
          </form>
        </InlineFormItem>
      </div>
    </ProfileCard>
  )
}

export default BugReportSection
