import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ParticlesBg from '../components/ParticlesBg'
import KPICards from '../components/KPICards'
import ContributionHeatmap from '../components/ContributionHeatmap'
import HourHeatmap from '../components/HourHeatmap'
import ParticipantBars from '../components/ParticipantBars'
import BehaviorAnalysis from '../components/BehaviorAnalysis'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const navigate        = useNavigate()

  useEffect(() => {
    const raw = localStorage.getItem('chatrix_analytics')
    if (!raw) { navigate('/'); return }
    try { setData(JSON.parse(raw)) }
    catch { navigate('/') }
  }, [navigate])

  if (!data) return null

  const { chat_name, chat_type, kpi, participants, monthly_counts, daily_counts, hourly_weekday, top_words, session_id } = data

  return (
    <div className={styles.page}>
      <ParticlesBg />

      {/* ── Top bar ── */}
      <header className={styles.topBar}>
        <div className={styles.topLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>
            ← Back
          </button>
          <div className={styles.brand}>Chatrix</div>
        </div>
        <div className={styles.chatBadge}>
          <span className={styles.chatIcon}>{chat_type === 'group' ? '👥' : '👤'}</span>
          <div>
            <div className={styles.chatName}>{chat_name || 'WhatsApp Chat'}</div>
            <div className={styles.chatType}>{chat_type === 'group' ? 'Group Chat' : 'Personal Chat'}</div>
          </div>
        </div>
        <button
          className={styles.newBtn}
          onClick={() => { localStorage.removeItem('chatrix_analytics'); navigate('/') }}
        >
          + New Analysis
        </button>
      </header>

      {/* ── Main content ── */}
      <main className={styles.main}>

        {/* Page heading */}
        <div className={styles.pageHeading}>
          <div className={styles.headingLabel}>AI DASHBOARD</div>
          <h1 className={styles.headingTitle}>
            Chat <span className={styles.hl}>Analytics</span> Report
          </h1>
          <p className={styles.headingDesc}>
            {kpi?.total_messages?.toLocaleString()} messages analyzed · {kpi?.total_participants} participants · {kpi?.duration_str} of history
          </p>
        </div>

        {/* KPI Cards */}
        <KPICards kpi={kpi} />

        {/* Contribution Heatmap */}
        <ContributionHeatmap
          monthly_counts={monthly_counts}
          daily_counts={daily_counts}
          session_id={session_id}
        />

        {/* Bottom row: Hour heatmap + Participant bars */}
        <div className={styles.bottomRow}>
          <HourHeatmap hourly_weekday={hourly_weekday} />
          <ParticipantBars participants={participants} />
        </div>

        {/* Behavioral Analysis */}
        <BehaviorAnalysis sessionId={session_id} participants={participants} />

        {/* Top words */}
        {top_words?.length > 0 && (
          <div className={styles.wordsSection}>
            <div className={styles.wordsSectionLabel}>TOP WORDS</div>
            <h2 className={styles.wordsTitle}>Most Used Words</h2>
            <div className={styles.wordCloud}>
              {top_words.map((w, i) => (
                <span
                  key={w}
                  className={styles.word}
                  style={{
                    fontSize: `${1.4 - i * 0.05}rem`,
                    opacity: 1 - i * 0.04,
                    '--wi': i,
                  }}
                >
                  {w}
                </span>
              ))}
            </div>
          </div>
        )}

      </main>

      <footer className={styles.footer}>
        <span>Chatrix · Open Source · 100% Local Processing</span>
      </footer>
    </div>
  )
}
