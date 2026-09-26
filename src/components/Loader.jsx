import styles from './Loader.module.scss'

function Loader() {
  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span>Загрузка страницы...</span>
    </div>
  )
}

export default Loader
