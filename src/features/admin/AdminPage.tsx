import {
  Bell,
  Download,
  FileText,
  LogOut,
  MapPin,
  RefreshCw,
  Shield,
  UserCheck,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ReportCategory } from '../../shared/lib/categories'
import { cx } from '../../shared/lib/cx'
import { Button } from '../../shared/ui/Button'
import { ToastContainer } from '../../shared/ui/Toast'
import { useToasts } from '../../shared/ui/useToasts'
import type { ReportStatus, ReportWithTriage } from '../../shared/types/database'
import {
  clearModeratorSession,
  fetchAdminReports,
  getStoredModeratorEmail,
  getStoredModeratorToken,
  loginModerator,
} from './admin-api'
import {
  calculateAdminKpi,
  filterReports,
  type ReportFilterOptions,
} from './admin-utils'
import { AdminAlertsTab } from './components/AdminAlertsTab'
import { AdminFilterBar } from './components/AdminFilterBar'
import { AdminKpiCards } from './components/AdminKpiCards'
import { AdminLoginDialog } from './components/AdminLoginDialog'
import { AdminReportDrawer } from './components/AdminReportDrawer'
import { AdminReportList } from './components/AdminReportList'

export default function AdminPage() {
  const { t } = useTranslation()
  const { toasts, dismissToast, showSuccess, showError, showInfo } = useToasts()

  // Состояние авторизации
  const [moderatorEmail, setModeratorEmail] = useState<string | null>(getStoredModeratorEmail())
  const [showLoginDialog, setShowLoginDialog] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'reports' | 'alerts'>('reports')

  // Загрузка данных
  const [reports, setReports] = useState<ReportWithTriage[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Выбранная заявка для детального просмотра
  const [selectedReport, setSelectedReport] = useState<ReportWithTriage | null>(null)

  // Состояние фильтрации
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all')
  const [dangerOnly, setDangerOnly] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Функция загрузки данных с автологином демо-модератора
  const loadData = useCallback(async (isSilent = false) => {
    setIsLoading(true)
    setLoadError(null)

    try {
      // Если сессии нет — пробуем войти под модератором пилота
      if (!getStoredModeratorToken()) {
        try {
          const auth = await loginModerator('mod@suutech.kg', 'suutech2026')
          setModeratorEmail(auth.email)
        } catch {
          // Игнорируем и загружаем публичные данные
        }
      }

      const data = await fetchAdminReports()
      setReports(data)
      if (isSilent) {
        showInfo('Список обновлён', `Загружено заявок: ${data.length}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Не удалось загрузить заявки'
      console.warn('[admin] Ошибка загрузки заявок:', err)
      setLoadError(msg)
      showError('Ошибка загрузки заявок', msg)
    } finally {
      setIsLoading(false)
    }
  }, [showInfo, showError])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Расчёт KPI
  const kpiStats = useMemo(() => calculateAdminKpi(reports), [reports])

  // Фильтрованный список заявок
  const filteredReports = useMemo(() => {
    const opts: ReportFilterOptions = {
      status: statusFilter,
      category: categoryFilter,
      dangerOnly,
      search: searchQuery,
    }
    return filterReports(reports, opts)
  }, [reports, statusFilter, categoryFilter, dangerOnly, searchQuery])

  // Обновление одной заявки в состоянии
  const handleReportUpdated = (updated: ReportWithTriage) => {
    setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    setSelectedReport(updated)
  }

  // Экспорт в CSV с BOM для Excel (§12)
  const handleExportCsv = () => {
    if (filteredReports.length === 0) return

    const headers = [
      'ID',
      'Дата',
      'Статус',
      'Категория жителя',
      'Комментарий',
      'Опасность 112',
      'Широта (lat)',
      'Долгота (lng)',
      'Заметка модератора',
    ]

    const escapeCsv = (val: unknown) => {
      if (val == null) return '""'
      const str = String(val).replace(/"/g, '""')
      return `"${str}"`
    }

    const rows = filteredReports.map((r) => [
      escapeCsv(r.id),
      escapeCsv(r.created_at),
      escapeCsv(r.status),
      escapeCsv(r.category_user ?? ''),
      escapeCsv(r.comment ?? ''),
      escapeCsv(r.immediate_danger ? 'ДА' : 'НЕТ'),
      escapeCsv(r.lat ?? ''),
      escapeCsv(r.lng ?? ''),
      escapeCsv(r.moderator_note ?? ''),
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `suutech-reports-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    showSuccess('Экспорт завершён', `Сохранено строк: ${rows.length}`)
  }

  const handleLogout = () => {
    clearModeratorSession()
    setModeratorEmail(null)
    showInfo('Вы вышли из системы', 'Переключено в режим гостя')
  }

  const handleLoginSuccess = (email: string) => {
    setModeratorEmail(email)
    setShowLoginDialog(false)
    showSuccess('Вход выполнен', `Вы вошли как ${email}`)
    loadData()
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row bg-background">
      {/* Toast-уведомления поверх всех окон */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Сайдбар */}
      <aside className="bg-ink text-on-ink md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:flex md:flex-col md:justify-between p-4 md:p-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="text-xl font-extrabold tracking-tight">
              SuuTech
            </Link>
          </div>

          <p className="mt-1 text-xs text-on-ink/60">
            {t('admin.sidebarSubtitle', 'Панель модератора пилота')}
          </p>

          <nav className="mt-6 space-y-1.5">
            <div className="flex items-center gap-2 rounded-xl bg-brand-deep px-3 py-2 text-sm font-semibold text-white">
              <Shield className="size-4" />
              {t('admin.navReports', 'Очередь заявок')}
            </div>

            <Link
              to="/map"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-on-ink/75 hover:bg-on-ink/10 transition-colors"
            >
              <MapPin className="size-4" />
              {t('admin.navMap', 'Карта пилота')}
            </Link>
          </nav>
        </div>

        {/* Профиль и статус авторизации */}
        <div className="mt-6 border-t border-on-ink/10 pt-4">
          {moderatorEmail ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400">
                  <UserCheck className="size-3" />
                  Модератор
                </p>
                <p className="truncate text-xs font-semibold text-on-ink/90">{moderatorEmail}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-on-ink/60 hover:bg-on-ink/10 hover:text-on-ink transition-colors"
                title={t('admin.logout', 'Выйти')}
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="md"
              onClick={() => setShowLoginDialog(true)}
              className="w-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              {t('admin.loginButton', 'Вход модератора')}
            </Button>
          )}
        </div>
      </aside>

      {/* Основная рабочая область */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <div className="mx-auto max-w-6xl space-y-5">
          {/* Верхняя шапка */}
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('admin.kicker', 'Пилотная зона: с. Ак-Өлөң (Иссык-Куль)')}
              </p>
              <h1 className="text-2xl font-extrabold text-ink md:text-3xl">
                {t('admin.title', 'Модерация заявок жителей')}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => loadData(true)}
                disabled={isLoading}
                className="gap-1.5 text-xs h-9 min-h-9"
              >
                <RefreshCw className={cx('size-3.5', isLoading && 'animate-spin')} />
                {t('common.refresh', 'Обновить')}
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={handleExportCsv}
                disabled={filteredReports.length === 0}
                className="gap-1.5 text-xs h-9 min-h-9"
                title={t('admin.exportTitle', 'Экспорт фильтрованного списка в CSV для Excel')}
              >
                <Download className="size-3.5" />
                {t('admin.exportBtn', 'CSV')}
              </Button>
            </div>
          </header>

          {/* Переключение вкладок: Заявки / Оповещения */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={cx(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors',
                activeTab === 'reports'
                  ? 'bg-ink text-on-ink shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-ink',
              )}
            >
              <FileText className="size-4" />
              <span>{t('admin.tabs.reports', 'Обращения жителей')}</span>
              <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-extrabold">
                {reports.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('alerts')}
              className={cx(
                'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors',
                activeTab === 'alerts'
                  ? 'bg-ink text-on-ink shadow-xs'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-ink',
              )}
            >
              <Bell className="size-4" />
              <span>{t('admin.tabs.alerts', 'Оповещения службы')}</span>
            </button>
          </div>

          {activeTab === 'alerts' ? (
            <AdminAlertsTab
              onNotify={(type, title, message) => {
                if (type === 'success') showSuccess(title, message)
                else if (type === 'error') showError(title, message)
                else showInfo(title, message)
              }}
            />
          ) : (
            <>
              {/* Плашка ошибки загрузки */}
              {loadError && (
                <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-900 shadow-xs flex items-center justify-between">
                  <span>{loadError}</span>
                  <button
                    type="button"
                    onClick={() => loadData(false)}
                    className="rounded-lg bg-rose-200/80 px-2.5 py-1 text-xs font-bold text-rose-950 hover:bg-rose-300 transition-colors"
                  >
                    {t('common.retry', 'Повторить')}
                  </button>
                </div>
              )}

              {/* KPI Дашборд (4 карточки) */}
              <AdminKpiCards
                stats={kpiStats}
                activeStatus={statusFilter}
                onSelectStatus={setStatusFilter}
              />

              {/* Панель поиска и фильтров */}
              <AdminFilterBar
                status={statusFilter}
                onStatusChange={setStatusFilter}
                category={categoryFilter}
                onCategoryChange={setCategoryFilter}
                dangerOnly={dangerOnly}
                onDangerOnlyChange={setDangerOnly}
                search={searchQuery}
                onSearchChange={setSearchQuery}
                totalCount={reports.length}
                filteredCount={filteredReports.length}
              />

              {/* Список заявок */}
              {isLoading && reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
                  <RefreshCw className="size-6 animate-spin text-brand-deep" />
                  <p className="mt-3 text-xs font-semibold text-muted-foreground">
                    {t('common.loading', 'Загрузка обращений...')}
                  </p>
                </div>
              ) : (
                <AdminReportList
                  reports={filteredReports}
                  selectedReportId={selectedReport?.id ?? null}
                  onSelectReport={setSelectedReport}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Выдвижная карточка заявки */}
      {selectedReport && (
        <AdminReportDrawer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onReportUpdated={handleReportUpdated}
          onNotify={(type, title, message) => {
            if (type === 'success') showSuccess(title, message)
            else if (type === 'error') showError(title, message)
            else showInfo(title, message)
          }}
        />
      )}

      {/* Модалка входа */}
      {showLoginDialog && (
        <AdminLoginDialog
          onSuccess={handleLoginSuccess}
          onContinueAsGuest={() => setShowLoginDialog(false)}
        />
      )}
    </div>
  )
}
