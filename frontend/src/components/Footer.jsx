import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.line} />
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.brandName}>Chatrix</div>
          <div className={styles.tagline}>Summarize · Analyze · Query</div>
        </div>
        <div className={styles.links}>
          <a href="#features" className={styles.link}>Features</a>
          <a href="#steps" className={styles.link}>How It Works</a>
          <a href="#upload" className={styles.link}>Upload</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className={styles.link}>GitHub ↗</a>
        </div>
      </div>
      <div className={styles.copy}>
        Open Source · MIT License · Built with ❤️ &amp; 🤖
      </div>
    </footer>
  )
}
