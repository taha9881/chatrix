import { createPortal } from 'react-dom'
import styles from './ChartTooltip.module.css'

const OFFSET_X = 14
const OFFSET_Y = 16

export function anchorFromEvent(e) {
  return { x: e.clientX, y: e.clientY }
}

export default function ChartTooltip({ anchor, variant = 'magenta', children }) {
  if (!anchor) return null

  // Decide whether to show above or below the cursor
  const showAbove = anchor.y > 120

  const style = {
    left: Math.min(anchor.x + OFFSET_X, window.innerWidth - 220),
    top: showAbove
      ? anchor.y - OFFSET_Y
      : anchor.y + OFFSET_Y,
  }

  return createPortal(
    <div
      className={`${styles.tooltip} ${styles[variant]} ${showAbove ? styles.above : styles.below}`}
      style={style}
    >
      {children}
    </div>,
    document.body,
  )
}
