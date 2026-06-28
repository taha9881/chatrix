import { useState } from 'react'
import ChartTooltip, { anchorFromEvent } from './ChartTooltip'
import styles from './HourHeatmap.module.css'

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

function cellColor(count, maxCount) {
  if (!count || maxCount === 0) return 'rgba(8, 15, 35, 0.9)'
  const ratio = count / maxCount
  if (ratio < 0.15) return 'rgba(0, 30, 60, 0.8)'
  if (ratio < 0.35) return 'rgba(0, 60, 100, 0.85)'
  if (ratio < 0.60) return 'rgba(0, 120, 170, 0.9)'
  if (ratio < 0.80) return 'rgba(0, 180, 220, 0.95)'
  return 'rgba(0, 212, 255, 1)'
}

function cellGlow(count, maxCount) {
  if (!count || maxCount === 0) return 'none'
  const ratio = count / maxCount
  if (ratio < 0.4) return 'none'
  return `0 0 ${Math.round(ratio * 14)}px rgba(0, 212, 255, ${ratio * 0.65})`
}

export default function HourHeatmap({ hourly_weekday }) {
  const [tooltip, setTooltip] = useState(null)

  if (!hourly_weekday) return null

  const maxCount = Math.max(...hourly_weekday.flat(), 1)

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>TIME PATTERNS</div>
      <h2 className={styles.title}>Messages by Hour &amp; Day</h2>
      <p className={styles.sub}>When does the conversation come alive?</p>

      <div className={styles.legend}>
        <span className={styles.legendText}>Quiet</span>
        {[0, 0.2, 0.45, 0.7, 1].map((r, i) => (
          <div key={i} className={styles.legendCell}
            style={{ background: cellColor(r * maxCount, maxCount), boxShadow: cellGlow(r * maxCount, maxCount) }} />
        ))}
        <span className={styles.legendText}>Buzzing</span>
      </div>

      <div className={styles.gridWrap}>
        <div className={styles.dayHeaders}>
          <div className={styles.hourSpacer} />
          {DAYS.map(d => (
            <div key={d} className={styles.dayLabel}>{d}</div>
          ))}
        </div>

        <div className={styles.rows}>
          {HOURS.map((hour, hi) => (
            <div key={hour} className={styles.row}>
              <div className={styles.hourLabel}>{hour}</div>
              {DAYS.map((_, di) => {
                const count = hourly_weekday[hi]?.[di] ?? 0
                return (
                  <div
                    key={di}
                    className={styles.cell}
                    style={{ background: cellColor(count, maxCount), boxShadow: cellGlow(count, maxCount) }}
                    onMouseEnter={(e) => setTooltip({ anchor: anchorFromEvent(e), count, hour, day: DAYS[di] })}
                    onMouseMove={(e)  => setTooltip({ anchor: anchorFromEvent(e), count, hour, day: DAYS[di] })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {tooltip && (
        <ChartTooltip anchor={tooltip.anchor} variant="cyan">
          <strong>{tooltip.count?.toLocaleString()}</strong> messages · {tooltip.day} {tooltip.hour}:00
        </ChartTooltip>
      )}
    </div>
  )
}
