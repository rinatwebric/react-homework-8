import { Link, useParams } from 'react-router-dom'
import posts from '../data/posts.json'
import styles from './PostPage.module.scss'

function PostPage() {
  const { id } = useParams()
  const post = posts.find((item) => String(item.id) === id)

  if (!post) {
    return (
      <section className={styles.notFound}>
        <p className={styles.eyebrow}>404</p>
        <h1 className={styles.title}>Пост не найден</h1>
        <Link className={styles.primaryLink} to="/posts">Вернуться к постам</Link>
      </section>
    )
  }

  return (
    <article className={styles.article}>
      <Link className={styles.backLink} to="/posts">← Все посты</Link>
      <p className={styles.eyebrow}>Пост {post.id}</p>
      <h1 className={styles.title}>{post.title}</h1>
      <p className={styles.text}>{post.text}</p>
    </article>
  )
}

export default PostPage
