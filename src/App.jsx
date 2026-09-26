import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import posts from './data/posts.json'
import './App.css'

function Loader() {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader__spinner" aria-hidden="true" />
      <span>Загрузка страницы...</span>
    </div>
  )
}

function PageTransition() {
  const { pathname } = useLocation()

  return <RouteContent key={pathname} />
}

function RouteContent() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 400)

    return () => window.clearTimeout(timer)
  }, [])

  return isLoading ? <Loader /> : <Outlet />
}

function Layout() {
  return (
    <div className="app-shell">
      <header className="header">
        <Link className="brand" to="/">Блог</Link>
        <nav className="navigation" aria-label="Основная навигация">
          <Link to="/">Главная</Link>
          <Link to="/about">О нас</Link>
          <Link to="/posts">Посты</Link>
        </nav>
      </header>

      <main className="content">
        <PageTransition />
      </main>

      <footer className="footer">© 2026</footer>
    </div>
  )
}

function Home() {
  return (
    <section className="welcome">
      <p className="eyebrow">Пространство для идей</p>
      <h1>Добро пожаловать в блог</h1>
      <p className="lead">Здесь собраны короткие заметки о работе, вдохновении и развитии.</p>
      <Link className="primary-link" to="/posts">Читать посты</Link>
    </section>
  )
}

function About() {
  return (
    <section className="page-copy">
      <p className="eyebrow">О проекте</p>
      <h1>Место для полезных мыслей</h1>
      <p>Этот учебный блог создан на React. Здесь можно просматривать публикации и открывать каждую запись на отдельной странице.</p>
    </section>
  )
}

function Posts() {
  return (
    <section>
      <div className="section-heading">
        <p className="eyebrow">Все публикации</p>
        <h1>Посты</h1>
      </div>
      <div className="posts-grid">
        {posts.map((post) => (
          <article className="post-card" key={post.id}>
            <p className="post-card__number">Пост {post.id}</p>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            <Link className="text-link" to={`/posts/${post.id}`}>Открыть пост <span aria-hidden="true">→</span></Link>
          </article>
        ))}
      </div>
    </section>
  )
}

function PostDetails() {
  const { id } = useParams()
  const post = posts.find((item) => String(item.id) === id)

  if (!post) {
    return (
      <section className="page-copy not-found">
        <p className="eyebrow">404</p>
        <h1>Пост не найден</h1>
        <Link className="primary-link" to="/posts">Вернуться к постам</Link>
      </section>
    )
  }

  return (
    <article className="article">
      <Link className="back-link" to="/posts">← Все посты</Link>
      <p className="eyebrow">Пост {post.id}</p>
      <h1>{post.title}</h1>
      <p className="article__text">{post.text}</p>
    </article>
  )
}

function NotFound() {
  return (
    <section className="page-copy not-found">
      <p className="eyebrow">404</p>
      <h1>Страница не найдена</h1>
      <p>Похоже, такой страницы в блоге нет.</p>
      <Link className="primary-link" to="/">На главную</Link>
    </section>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="posts" element={<Posts />} />
          <Route path="posts/:id" element={<PostDetails />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
