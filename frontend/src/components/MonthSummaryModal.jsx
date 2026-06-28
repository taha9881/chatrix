import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './MonthSummaryModal.module.css'

const API_BASE = 'http://localhost:8000'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatMonth(yearMonth) {
  if (!yearMonth) return ''
  const [y, m] = yearMonth.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
}

function TopicChip({ label }) {
  return <span className={styles.chip}>{label}</span>
}

export default function MonthSummaryModal({ yearMonth, sessionId, messageCount, onClose }) {
  const [status, setStatus]   = useState('loading') // loading | success | error
  const [topics, setTopics]   = useState([])
  const [summary, setSummary] = useState('')
  const [error, setError]     = useState('')
  const overlayRef            = useRef(null)

  useEffect(() => {
    if (!yearMonth || !sessionId) return

    setStatus('loading')
    setTopics([])
    setSummary('')
    setError('')

    const controller = new AbortController()

    fetch(`${API_BASE}/month-summary`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ session_id: sessionId, month: yearMonth }),
      signal:  controller.signal,
    })
      .then(res => {
        if (!res.ok) return res.json().then(e => { throw new Error(e.detail || `Server error ${res.status}`) })
        return res.json()
      })
      .then(data => {
        if (data.status === 'error' || data.status === 'parse_error' || data.status === 'insufficient_data') {
          throw new Error(data.error || 'Analysis failed.')
        }
        setTopics(data.topics || [])
        setSummary(data.summary || '')
        setStatus('success')
      })
      .catch(err => {
        if (err.name === 'AbortError') return
        setError(err.message)
        setStatus('error')
      })

    return () => controller.abort()
  }, [yearMonth, sessionId])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose()
  }

  if (!yearMonth) return null

  return createPortal(
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.modal}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>MONTH SUMMARY</div>
            <h2 className={styles.title}>{formatMonth(yearMonth)}</h2>
            {messageCount > 0 && (
              <div className={styles.meta}>{messageCount.toLocaleString()} messages this month</div>
            )}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>AI is reading the conversation…</p>
            <p className={styles.loadingHint}>Powered by Ollama · runs locally</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className={styles.errorWrap}>
            <div className={styles.errorIcon}>⚠</div>
            <p className={styles.errorText}>{error}</p>
            <p className={styles.errorHint}>Make sure Ollama is running with the configured model.</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className={styles.body}>
            {topics.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>TOP TOPICS DISCUSSED</div>
                <div className={styles.chips}>
                  {topics.map(t => <TopicChip key={t} label={t} />)}
                </div>
              </div>
            )}

            {summary && (
              <div className={styles.section}>
                <div className={styles.sectionLabel}>CONVERSATION SUMMARY</div>
                <p className={styles.summary}>{summary}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>,
    document.body,
  )
}
