import { Fragment, useState } from 'react'
import ChartTooltip, { anchorFromEvent } from './ChartTooltip'
import MonthSummaryModal from './MonthSummaryModal'
import styles from './ContributionHeatmap.module.css'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function cellColor(count, maxCount) {
  if (!count || maxCount === 0) return 'rgba(25, 15, 45, 0.8)'
  const ratio = count / maxCount
  if (ratio < 0.15) return 'rgba(80, 10, 100, 0.7)'
  if (ratio < 0.35) return 'rgba(130, 10, 160, 0.8)'
  if (ratio < 0.60) return 'rgba(190, 0, 190, 0.9)'
  if (ratio < 0.80) return 'rgba(230, 0, 210, 1)'
  return 'rgba(255, 0, 204, 1)'
}

function cellGlow(count, maxCount) {
  if (!count || maxCount === 0) return 'none'
  const ratio = count / maxCount
  if (ratio < 0.4) return 'none'
  const intensity = Math.round(ratio * 16)
  return `0 0 ${intensity}px rgba(255, 0, 204, ${ratio * 0.7})`
}

/** Build a sorted array of 31 day-values from a day→count object. */
function buildDailyArray(dayMap) {
  if (!dayMap) return []
  const maxDay = Math.max(...Object.keys(dayMap).map(Number), 1)
  return Array.from({ length: maxDay }, (_, i) => dayMap[String(i + 1)] ?? 0)
}

/** Sparkline SVG — the sole content of the hover tooltip. */
function Sparkline({ values }) {
  const W = 100, H = 36
  if (!values || values.length < 2) return null

  const max = Math.max(...values, 1)
  const PAD = 2
  const pts = values.map((v, i) => {
    const x = PAD + (i / (values.length - 1)) * (W - PAD * 2)
    const y = PAD + (1 - v / max) * (H - PAD * 2)
    return [x, y]
  })

  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  const fill = [
    `M ${pts[0][0].toFixed(1)},${H}`,
    ...pts.map(([x, y]) => `L ${x.toFixed(1)},${y.toFixed(1)}`),
    `L ${pts[pts.length - 1][0].toFixed(1)},${H}`,
    'Z',
  ].join(' ')

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,0,204,0.25)" />
          <stop offset="100%" stopColor="rgba(255,0,204,0)" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#sparkFill)" />
      <path d={d} fill="none" stroke="#ff00cc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ContributionHeatmap({ monthly_counts, daily_counts, session_id }) {
  const [tooltip,       setTooltip]       = useState(null)
  const [activeMonth,   setActiveMonth]   = useState(null) // "YYYY-MM" or null

  if (!monthly_counts || Object.keys(monthly_counts).length === 0) return null

  const maxCount = Math.max(...Object.values(monthly_counts), 1)
  const keys     = Object.keys(monthly_counts).sort()

  const byYear = {}
  keys.forEach(k => {
    const [y, m] = k.split('-')
    if (!byYear[y]) byYear[y] = {}
    byYear[y][parseInt(m, 10) - 1] = monthly_counts[k]
  })
  const years = Object.keys(byYear).sort()

  return (
    <>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <div className={styles.sectionLabel}>ACTIVITY OVERVIEW</div>
            <h2 className={styles.title}>Message Contribution Heatmap</h2>
            <p className={styles.hint}>Hover to preview · Click any month for AI summary</p>
          </div>
          <div className={styles.legend}>
            <span className={styles.legendText}>Less</span>
            {[0, 0.2, 0.4, 0.65, 1].map((r, i) => (
              <div
                key={i}
                className={styles.legendCell}
                style={{
                  background: cellColor(r * maxCount, maxCount),
                  boxShadow: cellGlow(r * maxCount, maxCount),
                }}
              />
            ))}
            <span className={styles.legendText}>More</span>
          </div>
        </div>

        <div className={styles.gridWrap}>
          <div className={styles.grid}>
            {/* Month headers */}
            <div className={styles.corner} />
            {MONTH_NAMES.map(mn => (
              <div key={mn} className={styles.monthLabel}>{mn}</div>
            ))}

            {/* Year rows */}
            {years.map(year => (
              <Fragment key={year}>
                <div className={styles.yearLabel}>{year}</div>
                {Array.from({ length: 12 }, (_, mi) => {
                  const count = byYear[year][mi] ?? null
                  const k = `${year}-${String(mi + 1).padStart(2, '0')}`
                  const inRange = Object.prototype.hasOwnProperty.call(monthly_counts, k)
                  const dayVals = buildDailyArray(daily_counts?.[k])

                  const tooltipData = (e) => ({
                    anchor: anchorFromEvent(e),
                    count,
                    month: `${MONTH_NAMES[mi]} ${year}`,
                    dayVals,
                  })

                  return inRange ? (
                    <div
                      key={`${year}-${mi}`}
                      className={styles.cell}
                      style={{
                        background: cellColor(count, maxCount),
                        boxShadow: cellGlow(count, maxCount),
                      }}
                      onMouseEnter={(e) => setTooltip(tooltipData(e))}
                      onMouseMove={(e)  => setTooltip(tooltipData(e))}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => { if (count) setActiveMonth(k) }}
                    />
                  ) : (
                    <div key={`${year}-${mi}`} className={`${styles.cell} ${styles.cellEmpty}`} />
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>

        {tooltip && (
          <ChartTooltip anchor={tooltip.anchor} variant="magenta">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: '0.82rem', color: '#aaaacc', letterSpacing: '0.3px' }}>
                <strong style={{ color: '#ff00cc', fontSize: '1rem' }}>{tooltip.count?.toLocaleString() ?? 0}</strong>
                {' messages in '}{tooltip.month}
              </span>
              {tooltip.dayVals?.length >= 2 && <Sparkline values={tooltip.dayVals} />}
            </div>
          </ChartTooltip>
        )}
      </div>

      {activeMonth && (
        <MonthSummaryModal
          yearMonth={activeMonth}
          sessionId={session_id}
          messageCount={monthly_counts[activeMonth] ?? 0}
          onClose={() => setActiveMonth(null)}
        />
      )}
    </>
  )
}
