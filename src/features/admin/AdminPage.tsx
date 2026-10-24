import {
  Download,
  LogOut,
  MapPin,
  RefreshCw,
  Shield,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { ReportCategory, UrgencyLevel } from '../../shared/lib/categories'
import { cx } from '../../shared/lib/cx'
import { Button } from '../../shared/ui/Button'
import { DemoTag } from '../../shared/ui/DemoTag'
import type { ReportStatus, ReportWithTriage } from '../../shared/types/database'
import {
  clearModeratorSession,
  fetchAdminReports,
  getStoredModeratorEmail,
  getStoredModeratorToken,
} from './admin-api'
import {
  calculateAdminKpi,
  filterReports,
  type ReportFilterOptions,
} from './admin-utils'
import { AdminFilterBar } from './components/AdminFilterBar'
import { AdminKpiCards } from './components/AdminKpiCards'
import { AdminLoginDialog } from './components/AdminLoginDialog'
import { AdminReportDrawer } from './components/AdminReportDrawer'
import { AdminReportList } from './components/AdminReportList'

export default function AdminPage() {
  const { t } = useTranslation()

  // Состояние авторизации
  const [moderatorEmail, setModeratorEmail] = useState<string | null>(getStoredModeratorEmail())
  const [showLoginDialog, setShowLoginDialog] = useState<boolean>(!getStoredModeratorToken())

  // Загрузка данных
  const [reports, setReports] = useState<ReportWithTriage[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Выбранная заявка для просмотра
  const [selectedReport, setSelectedReport] = useState<ReportWithTriage | null>(null)

  // Состояние фильтрации
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('all')
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyLevel | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ReportCategory | 'all'>('all')
  const [needsReviewOnly, setNeedsReviewOnly] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [duplicateGroupFilter, setDuplicateGroupFilter] = useState<string | null>(null)

  // Функция загрузки данных
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const data = await fetchAdminReports()
      setReports(data)
    } catch (err) {
      console.warn('[admin] Ошибка загрузки заявок:', err)
      setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить заявки')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Расчёт KPI
  const kpiStats = useMemo(() => calculateAdminKpi(reports), [reports])

  // Фильтрованный список заявок
  const filteredReports = useMemo(() => {
    const opts: ReportFilterOptions = {
      status: statusFilter,
      urgency: urgencyFilter,
      category: categoryFilter,
      needsReviewOnly,
      search: searchQuery,
      duplicateGroup: duplicateGroupFilter,
    }
    return filterReports(reports, opts)
  }, [reports, statusFilter, urgencyFilter, categoryFilter, needsReviewOnly, searchQuery, duplicateGroupFilter])

  // Обновление одной заявки в состоянии после изменения статуса или триажа
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
      'Опасность',
      'Широта (lat)',
      'Долгота (lng)',
      'AI Категория',
      'AI Срочность',
      'AI Уверенность',
      'AI Резюме',
      'AI Действие',
      'AI Группа дубликатов',
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
      escapeCsv(r.ai_triage?.category_ai ?? ''),
      escapeCsv(r.ai_triage?.urgency_ai ?? ''),
      escapeCsv(r.ai_triage?.confidence != null ? `${Math.round(r.ai_triage.confidence * 100)}%` : ''),
      escapeCsv(r.ai_triage?.summary ?? ''),
      escapeCsv(r.ai_triage?.recommended_action ?? ''),
      escapeCsv(r.ai_triage?.duplicate_group ?? ''),
      escapeCsv(r.moderator_note ?? ''),
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `suutech-reports-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleLogout = () => {
    clearModeratorSession()
    setModeratorEmail(null)
    setShowLoginDialog(true)
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row bg-background">
      {/* Сайдбар */}
      <aside className="bg-ink text-on-ink md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:flex md:flex-col md:justify-between p-4 md:p-6">
        <div>
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="text-xl font-extrabold tracking-tight">
              SuuTech
            </Link>
            <span className="rounded-md border border-brand-bright/40 bg-brand-bright/20 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase text-brand-bright">
              Admin v2.0
            </span>
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

        {/* Профиль и выход */}
        <div className="mt-6 border-t border-on-ink/10 pt-4">
          {moderatorEmail ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-on-ink/50">Модератор</p>
                <p className="truncate text-xs font-semibold text-on-ink/90">{moderatorEmail}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-on-ink/60 hover:bg-on-ink/10 hover:text-on-ink"
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
              className="w-full text-xs"
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
                {t('admin.title', 'Модерация и AI-триаж заявок')}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                onClick={loadData}
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
                title={t('admin.exportHint', 'Экспорт отфильтрованных заявок в CSV (Excel)')}
              >
                <Download className="size-3.5" />
                CSV
              </Button>

              <DemoTag />
            </div>
          </header>

          {loadError && (
            <div className="flex items-center justify-between rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-950">
              <span>{loadError}</span>
              <Button size="md" variant="outline" onClick={loadData}>
                {t('common.retry', 'Повторить')}
              </Button>
            </div>
          )}

          {/* 1. Дашборд KPI счётчиков */}
          <AdminKpiCards
            stats={kpiStats}
            activeStatus={statusFilter}
            onSelectStatus={(st) => setStatusFilter(st)}
            needsReviewActive={needsReviewOnly}
            onToggleNeedsReview={() => setNeedsReviewOnly((prev) => !prev)}
          />

          {/* 2. Панель фильтров */}
          <AdminFilterBar
            status={statusFilter}
            onStatusChange={setStatusFilter}
            urgency={urgencyFilter}
            onUrgencyChange={setUrgencyFilter}
            category={categoryFilter}
            onCategoryChange={setCategoryFilter}
            needsReviewOnly={needsReviewOnly}
            onNeedsReviewChange={setNeedsReviewOnly}
            search={searchQuery}
            onSearchChange={setSearchQuery}
            duplicateGroup={duplicateGroupFilter}
            onClearDuplicateGroup={() => setDuplicateGroupFilter(null)}
            totalCount={reports.length}
            filteredCount={filteredReports.length}
          />

          {/* 3. Список заявок */}
          {isLoading && reports.length === 0 ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="size-6 animate-spin text-brand-deep" />
            </div>
          ) : (
            <AdminReportList
              reports={filteredReports}
              selectedReportId={selectedReport?.id ?? null}
              onSelectReport={(r) => setSelectedReport(r)}
              onFilterByDuplicateGroup={(grp) => setDuplicateGroupFilter(grp)}
            />
          )}
        </div>
      </main>

      {/* Модальное окно входа модератора */}
      {showLoginDialog && (
        <AdminLoginDialog
          onSuccess={(email) => {
            setModeratorEmail(email)
            setShowLoginDialog(false)
            loadData()
          }}
          onContinueAsGuest={() => setShowLoginDialog(false)}
        />
      )}

      {/* Детальный просмотр заявки (Drawer) */}
      <AdminReportDrawer
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
        onReportUpdated={handleReportUpdated}
        onFilterByDuplicateGroup={(grp) => {
          setDuplicateGroupFilter(grp)
          setSelectedReport(null)
        }}
      />
    </div>
  )
}
