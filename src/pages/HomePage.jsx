import { Link } from 'react-router-dom'
import styles from './HomePage.module.scss'

function HomePage() {
  return (
    <section className={styles.welcome}>
      <p className={styles.eyebrow}>Пространство для идей</p>
      <h1 className={styles.title}>Добро пожаловать в блог</h1>
      <p className={styles.lead}>Здесь собраны короткие заметки о работе, вдохновении и развитии.</p>
      <Link className={styles.primaryLink} to="/posts">Читать посты</Link>
    </section>
  )
}

export default HomePage
