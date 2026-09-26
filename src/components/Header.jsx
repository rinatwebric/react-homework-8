import { Link } from 'react-router-dom'
import styles from './Header.module.scss'

function Header() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} to="/">Блог</Link>

      <nav className={styles.navigation} aria-label="Основная навигация">
        <Link to="/">Главная</Link>
        <Link to="/about">О нас</Link>
        <Link to="/posts">Посты</Link>
      </nav>
    </header>
  )
}

export default Header
