import { useEffect, useState } from 'react'
import styles from './KPICards.module.css'

function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    let start = 0
    const step  = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setVal(target); clearInterval(timer) }
      else setVal(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return val
}

function KPICard({ icon, label, value, sub, color, delay = 0 }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const isNumber = typeof value === 'number'
  const animated = useCountUp(visible && isNumber ? value : 0)
  const display  = isNumber ? animated.toLocaleString() : value

  return (
    <div className={styles.card} style={{ '--c': color, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(20px)', transition: 'opacity 0.5s, transform 0.5s' }}>
      <div className={styles.iconRing}>
        <span className={styles.icon}>{icon}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.value}>{display}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
        <div className={styles.label}>{label}</div>
      </div>
      <div className={styles.glowBar} />
    </div>
  )
}

export default function KPICards({ kpi }) {
  if (!kpi) return null
  return (
    <div className={styles.grid}>
      <KPICard icon="💬" label="Total Messages"     value={kpi.total_messages}    color="#ff00cc" delay={0} />
      <KPICard icon="👥" label="Participants"        value={kpi.total_participants} color="#00d4ff" delay={100} />
      <KPICard icon="📅" label="Chat Duration"       value={kpi.duration_str}      sub={`${kpi.first_date} → ${kpi.last_date}`} color="#ffd700" delay={200} />
      <KPICard icon="🏆" label="Most Active"         value={kpi.most_active_user}  sub={`${kpi.most_active_count?.toLocaleString()} messages`} color="#b44fff" delay={300} />
    </div>
  )
}
