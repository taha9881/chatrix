import { useEffect, useState } from 'react'
import styles from './ParticipantBars.module.css'

const BAR_COLORS = [
  'linear-gradient(90deg, #ff00cc, #b44fff)',
  'linear-gradient(90deg, #00d4ff, #00ffcc)',
  'linear-gradient(90deg, #ffd700, #ff7700)',
  'linear-gradient(90deg, #b44fff, #6600cc)',
  'linear-gradient(90deg, #00ffcc, #00aaff)',
  'linear-gradient(90deg, #ff7700, #ff0044)',
  'linear-gradient(90deg, #00d4ff, #b44fff)',
  'linear-gradient(90deg, #ff00cc, #ffd700)',
]

const GLOW_COLORS = [
  'rgba(255, 0, 204, 0.35)',
  'rgba(0, 212, 255, 0.35)',
  'rgba(255, 215, 0, 0.35)',
  'rgba(180, 79, 255, 0.35)',
  'rgba(0, 255, 204, 0.35)',
  'rgba(255, 119, 0, 0.35)',
  'rgba(0, 212, 255, 0.35)',
  'rgba(255, 0, 204, 0.35)',
]

export default function ParticipantBars({ participants }) {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200)
    return () => clearTimeout(t)
  }, [])

  if (!participants?.length) return null

  const max    = participants[0]?.messages || 1
  const TOP_N  = 12
  const shown  = participants.slice(0, TOP_N)

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>PARTICIPATION</div>
      <h2 className={styles.title}>Messages by Participant</h2>
      <p className={styles.sub}>Who carried the conversation?</p>

      <div className={styles.bars}>
        {shown.map((p, i) => {
          const pct = (p.messages / max) * 100
          return (
            <div key={p.name} className={styles.row}>
              <div className={styles.rank}>#{i + 1}</div>
              <div className={styles.name} title={p.name}>{p.name}</div>
              <div className={styles.barTrack}>
                <div
                  className={styles.bar}
                  style={{
                    width:      animated ? `${pct}%` : '0%',
                    background: BAR_COLORS[i % BAR_COLORS.length],
                    boxShadow:  `0 0 12px ${GLOW_COLORS[i % GLOW_COLORS.length]}`,
                    transitionDelay: `${i * 60}ms`,
                  }}
                >
                  <div className={styles.barSheen} />
                </div>
              </div>
              <div className={styles.stats}>
                <span className={styles.count}>{p.messages.toLocaleString()}</span>
                <span className={styles.pct}>{p.percent}%</span>
              </div>
            </div>
          )
        })}
      </div>

      {participants.length > TOP_N && (
        <div className={styles.more}>
          + {participants.length - TOP_N} more participants
        </div>
      )}
    </div>
  )
}
