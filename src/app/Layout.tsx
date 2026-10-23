/**
 * Оболочка приложения: шапка, контент, нижняя навигация.
 * Mobile-first: максимум ширины на телефоне, на десктопе — по центру.
 */
import { Home, Map, ScanLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { cx } from '../shared/lib/cx'

type NavItemProps = {
  to: string
  label: string
  icon: typeof Home
  end?: boolean
}

function NavItem({ to, label, icon: Icon, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
          isActive ? 'text-brand' : 'text-muted-foreground hover:text-brand',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon aria-hidden className="size-6" strokeWidth={isActive ? 2.5 : 2} />
          {label}
        </>
      )}
    </NavLink>
  )
}

export function Layout() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center gap-2 px-4 pt-3 pb-2">
        <img src="/logo.svg" alt="" aria-hidden className="size-8 rounded-lg" />
        <span className="text-lg font-bold text-brand">{t('app.name')}</span>
        <span className="ml-auto text-xs text-muted-foreground">{t('app.tagline')}</span>
      </header>

      <main className="flex-1 px-4 pt-2 pb-28">
        <Outlet />
      </main>

      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <NavItem to="/" label={t('nav.home')} icon={Home} end />
        <NavItem to="/scan" label={t('nav.scan')} icon={ScanLine} />
        <NavItem to="/map" label={t('nav.map')} icon={Map} />
      </nav>
    </div>
  )
}