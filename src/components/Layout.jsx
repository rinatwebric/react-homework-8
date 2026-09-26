import Footer from './Footer'
import Header from './Header'
import PageContent from './PageContent'
import styles from './Layout.module.scss'

function Layout() {
  return (
    <div className={styles.appShell}>
      <Header />
      <main className={styles.content}>
        <PageContent />
      </main>
      <Footer />
    </div>
  )
}

export default Layout
