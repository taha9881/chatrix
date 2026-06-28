import styles from './Hero.module.css'

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.glow1} />
      <div className={styles.glow2} />

      <h1 className={styles.title}>Chatrix</h1>

      <div className={styles.tagline}>
        <span className={styles.tag1}>SUMMARIZE</span>
        <span className={styles.divider}>|</span>
        <span className={styles.tag2}>ANALYZE</span>
        <span className={styles.divider}>|</span>
        <span className={styles.tag3}>QUERY</span>
      </div>

      <p className={styles.desc}>
        Drop your <span className={styles.hl}>WhatsApp chat</span> ZIP, and watch
        <span className={styles.hl2}> Generative AI</span> transform every message into a{' '}
        <span className={styles.hl3}>living, breathing dashboard</span>.
        Solo DMs, group conversations, English or Hindi — we decode it all.
      </p>

      <div className={styles.badges}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} style={{ background: '#ff00cc' }} />
          Single &amp; Group Chats
        </span>
        <span className={styles.badge}>
          <span className={styles.badgeDot} style={{ background: '#00d4ff' }} />
          English &amp; Hindi
        </span>
        <span className={styles.badge}>
          <span className={styles.badgeDot} style={{ background: '#ffd700' }} />
          100% Open Source
        </span>
        <span className={styles.badge}>
          <span className={styles.badgeDot} style={{ background: '#00ffcc' }} />
          Runs Locally
        </span>
      </div>

      <a href="#upload" className={styles.heroBtn}>
        <span className={styles.heroBtnText}>🚀 Analyze My Chat</span>
      </a>

      <div className={styles.scrollHint}>
        <span className={styles.scrollArrow}>↓</span>
        <span>Scroll to explore</span>
      </div>
    </section>
  )
}
