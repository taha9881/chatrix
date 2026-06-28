import styles from './Steps.module.css'

const STEPS = [
  {
    num: '01',
    color: '#ff00cc',
    emoji: '📱',
    title: 'Export from WhatsApp',
    desc: 'Open any chat in WhatsApp → tap the ⋮ menu → "More" → "Export Chat". Choose "Without Media" for the fastest upload.',
    tip: 'Works on Android & iOS',
  },
  {
    num: '02',
    color: '#ffd700',
    emoji: '📦',
    title: 'Download the ZIP',
    desc: 'WhatsApp bundles your chat into a .zip file. Save it anywhere on your device — your Downloads, Desktop, wherever you like.',
    tip: 'The ZIP stays on your device',
  },
  {
    num: '03',
    color: '#00d4ff',
    emoji: '🚀',
    title: 'Upload to Chatrix',
    desc: 'Drag-and-drop (or browse) your .zip into the upload zone below. Chatrix does the rest — parsing, analysing, and building your AI dashboard.',
    tip: 'Processing takes only seconds',
  },
]

export default function Steps() {
  return (
    <section className={styles.section} id="steps">
      <div className={styles.inner}>
        <div className={styles.sectionLabel}>HOW IT WORKS</div>
        <h2 className={styles.heading}>
          3 steps to your{' '}
          <span className={styles.hl}>AI-powered</span> chat dashboard
        </h2>

        <div className={styles.stepsRow}>
          {STEPS.map((s, i) => (
            <div key={s.num} className={styles.stepWrap}>
              <div className={styles.card} style={{ '--c': s.color }}>
                <div className={styles.numBadge}>{s.num}</div>
                <div className={styles.emojiBox}>{s.emoji}</div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
                <span className={styles.tipTag}>✦ {s.tip}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={styles.connector}>
                  <svg viewBox="0 0 60 20" className={styles.arrow}>
                    <path d="M0 10 Q30 0 60 10" stroke="url(#grad)" strokeWidth="2" fill="none" strokeDasharray="4 3" />
                    <polygon points="56,6 64,10 56,14" fill="#b44fff" />
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ff00cc" />
                        <stop offset="100%" stopColor="#00d4ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
