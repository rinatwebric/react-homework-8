import styles from './AboutPage.module.scss'

function AboutPage() {
  return (
    <section className={styles.pageCopy}>
      <p className={styles.eyebrow}>О проекте</p>
      <h1 className={styles.title}>Место для полезных мыслей</h1>
      <p className={styles.text}>Этот учебный блог создан на React. Здесь можно просматривать публикации и открывать каждую запись на отдельной странице.</p>
    </section>
  )
}

export default AboutPage
