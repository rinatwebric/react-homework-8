/**
 * Оболочка приложения: контент + нижняя навигация с четырьмя разделами (макет).
 * Mobile-first: телефон — основная ширина, на десктопе контент по центру.
 */
import { Droplet, Home, MapPin, ScanLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'
import { cx } from '../shared/lib/cx'

const NAV_ITEMS = [
  { to: '/', labelKey: 'nav.home', icon: Home, end: true },
  { to: '/scan', labelKey: 'nav.scan', icon: ScanLine, end: false },
  { to: '/map', labelKey: 'nav.map', icon: MapPin, end: false },
  { to: '/water', labelKey: 'nav.water', icon: Droplet, end: false },
] as const

export function Layout() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <main className="flex-1 px-4 pt-6 pb-28">
        <Outlet />
      </main>

      <nav
        aria-label={t('nav.label')}
        className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md border-t border-border bg-card px-1 pb-[env(safe-area-inset-bottom)]"
      >
        {NAV_ITEMS.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }: { isActive: boolean }) =>
              cx(
                'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors',
                isActive ? 'text-brand' : 'text-muted-foreground hover:text-brand',
              )
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <Icon aria-hidden className="size-6" strokeWidth={isActive ? 2.5 : 1.9} />
                {t(labelKey)}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}