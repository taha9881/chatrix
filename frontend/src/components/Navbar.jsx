import styles from './Navbar.module.css'

export default function Navbar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Chatrix</span>
      </div>
      <div className={styles.links}>
        <a href="#features" className={styles.link}>Features</a>
        <a href="#steps" className={styles.link}>How It Works</a>
        <a href="#upload" className={styles.ctaBtn}>Upload ZIP</a>
      </div>
    </nav>
  )
}
