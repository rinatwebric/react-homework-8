import { Link } from 'react-router-dom'
import posts from '../data/posts.json'
import styles from './PostsPage.module.scss'

function PostsPage() {
  return (
    <section>
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Все публикации</p>
        <h1 className={styles.title}>Посты</h1>
      </div>

      <div className={styles.postsGrid}>
        {posts.map((post) => (
          <article className={styles.postCard} key={post.id}>
            <p className={styles.postNumber}>Пост {post.id}</p>
            <h2 className={styles.postTitle}>{post.title}</h2>
            <p className={styles.excerpt}>{post.excerpt}</p>
            <Link className={styles.textLink} to={`/posts/${post.id}`}>
              Открыть пост <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}

export default PostsPage
