import { Lock, Shield, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { loginModerator, storeModeratorSession } from '../admin-api'

interface AdminLoginDialogProps {
  onSuccess: (email: string) => void
  onContinueAsGuest: () => void
}

export function AdminLoginDialog({ onSuccess, onContinueAsGuest }: AdminLoginDialogProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await loginModerator(email, password)
      onSuccess(res.email)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = () => {
    // Демо-вход для жюри и ревью хакатона
    const demoEmail = 'moderator@suutech.kg'
    storeModeratorSession('demo_moderator_token', demoEmail)
    onSuccess(demoEmail)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-xs">
      <Card className="w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand-deep">
            <Shield className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">
              {t('admin.login.title', 'Вход в панель модератора')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t('admin.login.subtitle', 'Служба сортировки и обработки сигналов v2.0')}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Email</label>
            <div className="relative">
              <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mod@suutech.kg"
                className="w-full rounded-xl border border-border bg-background py-2 pr-3 pl-9 text-sm text-ink focus:border-brand-deep focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1">Пароль</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background py-2 pr-3 pl-9 text-sm text-ink focus:border-brand-deep focus:outline-none"
              />
            </div>
          </div>

          <Button type="submit" variant="primary" disabled={isLoading} className="w-full mt-2">
            {isLoading ? t('common.loading', 'Вход...') : t('admin.login.submit', 'Войти как модератор')}
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleDemoLogin}
            className="w-full text-xs font-semibold"
          >
            {t('admin.login.demoButton', 'Войти как дежурный модератор (демо для жюри)')}
          </Button>

          <button
            type="button"
            onClick={onContinueAsGuest}
            className="text-xs text-muted-foreground hover:text-ink text-center py-1 underline"
          >
            {t('admin.login.guestMode', 'Продолжить в режиме просмотра (только чтение)')}
          </button>
        </div>
      </Card>
    </div>
  )
}
