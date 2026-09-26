import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.scss'

function NotFoundPage() {
  return (
    <section className={styles.notFound}>
      <p className={styles.eyebrow}>404</p>
      <h1 className={styles.title}>Страница не найдена</h1>
      <p className={styles.text}>Похоже, такой страницы в блоге нет.</p>
      <Link className={styles.primaryLink} to="/">На главную</Link>
    </section>
  )
}

export default NotFoundPage
