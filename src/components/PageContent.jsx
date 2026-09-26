import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Loader from './Loader'

function PageContent() {
  const { pathname } = useLocation()

  return <PageContentWithLoader key={pathname} />
}

function PageContentWithLoader() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 400)

    return () => window.clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <Loader />
  }

  return <Outlet />
}

export default PageContent
