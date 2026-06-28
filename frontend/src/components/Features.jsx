import styles from './Features.module.css'

const FEATURES = [
  {
    icon: '🤖',
    color: '#ff00cc',
    title: 'Generative AI Analysis',
    desc: 'Powered by cutting-edge LLMs that read every message and produce human-like summaries, mood scores, and conversation insights.',
  },
  {
    icon: '👥',
    color: '#00d4ff',
    title: 'Group & Solo Chats',
    desc: 'Whether it\'s a 1-on-1 DM or a chaos-filled group of 200 people, Chatrix breaks down who said what, when, and how much.',
  },
  {
    icon: '🌐',
    color: '#ffd700',
    title: 'English & Hindi',
    desc: 'Bilingual AI understands code-mixed Hinglish conversations natively — no translation needed, full accuracy guaranteed.',
  },
  {
    icon: '🔒',
    color: '#00ffcc',
    title: 'Runs 100% Locally',
    desc: 'Open source and self-hosted. Your private chats never leave your machine. No cloud, no tracking, no compromises.',
  },
  {
    icon: '📊',
    color: '#b44fff',
    title: 'Rich Dashboards',
    desc: 'Interactive charts, message heatmaps, top talkers, word clouds, sentiment timelines — all auto-generated from your ZIP.',
  },
  {
    icon: '⚡',
    color: '#ff7700',
    title: 'Instant Processing',
    desc: 'Upload → Analyze → Explore in seconds. Handles thousands of messages without breaking a sweat.',
  },
]

export default function Features() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.sectionLabel}>WHAT WE DO</div>
      <h2 className={styles.heading}>
        Your chats contain{' '}
        <span className={styles.hl}>stories</span>.{' '}
        <br />
        We help you{' '}
        <span className={styles.hl2}>read them</span>.
      </h2>

      <div className={styles.grid}>
        {FEATURES.map((f) => (
          <div key={f.title} className={styles.card} style={{ '--accent': f.color }}>
            <div className={styles.iconWrap}>
              <span className={styles.icon}>{f.icon}</span>
              <div className={styles.iconGlow} />
            </div>
            <h3 className={styles.cardTitle}>{f.title}</h3>
            <p className={styles.cardDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
