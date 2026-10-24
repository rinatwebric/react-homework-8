import { describe, expect, it } from 'vitest'
import type { ReportWithTriage } from '../../shared/types/database'
import {
  calculateAdminKpi,
  filterReports,
  isDuplicateDistance,
  parseResidentRisk,
} from './admin-utils'

describe('admin-utils', () => {
  describe('parseResidentRisk', () => {
    it('определяет critical при immediate_danger', () => {
      expect(parseResidentRisk({ immediate_danger: true, comment: null })).toBe('critical')
    })

    it('определяет critical при наличии метки критического риска в комментарии', () => {
      expect(
        parseResidentRisk({
          immediate_danger: false,
          comment: '[Критический риск / ЧС] Срочно!',
        }),
      ).toBe('critical')
    })

    it('определяет elevated при высоком риске в комментарии', () => {
      expect(
        parseResidentRisk({
          immediate_danger: false,
          comment: '[Высокий риск] Вода поднимается',
        }),
      ).toBe('elevated')
    })

    it('определяет moderate при умеренном риске в комментарии', () => {
      expect(
        parseResidentRisk({
          immediate_danger: false,
          comment: '[Умеренный риск] Сырость в подвале',
        }),
      ).toBe('moderate')
    })

    it('возвращает null, если риск не указан и нет опасности', () => {
      expect(
        parseResidentRisk({
          immediate_danger: false,
          comment: 'Просто текст',
        }),
      ).toBeNull()
      expect(
        parseResidentRisk({
          immediate_danger: false,
          comment: null,
        }),
      ).toBeNull()
    })
  })
  describe('isDuplicateDistance', () => {
    const center = { lat: 42.34793, lng: 76.1669 }

    it('149 метров считается дубликатом', () => {
      const p149m = { lat: center.lat + 0.00133, lng: center.lng }
      expect(isDuplicateDistance(center, p149m)).toBe(true)
    })

    it('151 метр не считается дубликатом', () => {
      const p151m = { lat: center.lat + 0.00137, lng: center.lng }
      expect(isDuplicateDistance(center, p151m)).toBe(false)
    })
  })

  describe('calculateAdminKpi', () => {
    it('верно считает показатели по статусам и review', () => {
      const mockReports: ReportWithTriage[] = [
        {
          id: '1',
          client_id: 'c1',
          created_at: '2026-10-24T10:00:00Z',
          captured_at: null,
          photo_path: null,
          lat: 42.3,
          lng: 76.1,
          accuracy_m: 5,
          zone_id: null,
          category_user: 'basement_water',
          comment: 'Подвал затоплен',
          location_adjusted_m: 0,
          immediate_danger: false,
          weather_snapshot: null,
          created_by: null,
          status: 'new',
          moderator_note: null,
          device_hash: null,
          ip_hash: null,
          is_demo: false,
          lat_public: 42.3,
          lng_public: 76.1,
          ai_triage: {
            report_id: '1',
            category_ai: 'basement_water',
            urgency_ai: 'high',
            summary: 'Вода в подвале',
            recommended_action: 'Откачка',
            duplicate_group: null,
            confidence: 0.8,
            needs_human_review: false,
            model: 'test',
            created_at: '2026-10-24T10:01:00Z',
          },
        },
        {
          id: '2',
          client_id: 'c2',
          created_at: '2026-10-24T11:00:00Z',
          captured_at: null,
          photo_path: null,
          lat: 42.3,
          lng: 76.1,
          accuracy_m: 5,
          zone_id: null,
          category_user: 'standing_water',
          comment: null,
          location_adjusted_m: 0,
          immediate_danger: true,
          weather_snapshot: null,
          created_by: null,
          status: 'triaged',
          moderator_note: null,
          device_hash: null,
          ip_hash: null,
          is_demo: false,
          lat_public: 42.3,
          lng_public: 76.1,
          ai_triage: {
            report_id: '2',
            category_ai: 'standing_water',
            urgency_ai: 'critical',
            summary: 'Опасность',
            recommended_action: 'Срочный выезд',
            duplicate_group: null,
            confidence: 0.5,
            needs_human_review: true,
            model: 'test',
            created_at: '2026-10-24T11:01:00Z',
          },
        },
        {
          id: '3',
          client_id: 'c3',
          created_at: '2026-10-24T12:00:00Z',
          captured_at: null,
          photo_path: null,
          lat: 42.3,
          lng: 76.1,
          accuracy_m: 5,
          zone_id: null,
          category_user: 'damp_wall',
          comment: 'Сырость',
          location_adjusted_m: 0,
          immediate_danger: false,
          weather_snapshot: null,
          created_by: null,
          status: 'in_progress',
          moderator_note: null,
          device_hash: null,
          ip_hash: null,
          is_demo: false,
          lat_public: 42.3,
          lng_public: 76.1,
          ai_triage: null,
        },
        {
          id: '4',
          client_id: 'c4',
          created_at: '2026-10-24T13:00:00Z',
          captured_at: null,
          photo_path: null,
          lat: 42.3,
          lng: 76.1,
          accuracy_m: 5,
          zone_id: null,
          category_user: 'road_flooding',
          comment: 'Затопило дорогу',
          location_adjusted_m: 0,
          immediate_danger: false,
          weather_snapshot: null,
          created_by: null,
          status: 'resolved',
          moderator_note: 'Труба прочищена',
          device_hash: null,
          ip_hash: null,
          is_demo: false,
          lat_public: 42.3,
          lng_public: 76.1,
          ai_triage: null,
        },
      ]

      const kpi = calculateAdminKpi(mockReports)
      expect(kpi.newCount).toBe(1)
      expect(kpi.triagedCount).toBe(1)
      expect(kpi.inProgressCount).toBe(1)
      expect(kpi.resolvedCount).toBe(1)
      expect(kpi.rejectedCount).toBe(0)
      expect(kpi.needsReviewCount).toBe(1)
    })
  })

  describe('filterReports', () => {
    const sample: ReportWithTriage[] = [
      {
        id: 'rep-01',
        client_id: 'c1',
        created_at: '2026-10-24T10:00:00Z',
        captured_at: null,
        photo_path: null,
        lat: 42.3,
        lng: 76.1,
        accuracy_m: 5,
        zone_id: null,
        category_user: 'basement_water',
        comment: 'Вода в погребе',
        location_adjusted_m: 0,
        immediate_danger: false,
        weather_snapshot: null,
        created_by: null,
        status: 'new',
        moderator_note: null,
        device_hash: null,
        ip_hash: null,
        is_demo: false,
        lat_public: 42.3,
        lng_public: 76.1,
        ai_triage: {
          report_id: 'rep-01',
          category_ai: 'basement_water',
          urgency_ai: 'high',
          summary: 'Погреб затоплен',
          recommended_action: 'Откачка',
          duplicate_group: 'grp-1',
          confidence: 0.9,
          needs_human_review: false,
          model: 'test',
          created_at: '2026-10-24T10:01:00Z',
        },
      },
      {
        id: 'rep-02',
        client_id: 'c2',
        created_at: '2026-10-24T11:00:00Z',
        captured_at: null,
        photo_path: null,
        lat: 42.3,
        lng: 76.1,
        accuracy_m: 5,
        zone_id: null,
        category_user: 'drainage_issue',
        comment: 'Арык забит мусором',
        location_adjusted_m: 0,
        immediate_danger: false,
        weather_snapshot: null,
        created_by: null,
        status: 'triaged',
        moderator_note: null,
        device_hash: null,
        ip_hash: null,
        is_demo: false,
        lat_public: 42.3,
        lng_public: 76.1,
        ai_triage: {
          report_id: 'rep-02',
          category_ai: 'drainage_issue',
          urgency_ai: 'medium',
          summary: 'Засор арыка',
          recommended_action: 'Прочистить',
          duplicate_group: null,
          confidence: 0.5,
          needs_human_review: true,
          model: 'test',
          created_at: '2026-10-24T11:01:00Z',
        },
      },
    ]

    it('фильтрует по статусу', () => {
      const res = filterReports(sample, { status: 'new' })
      expect(res.length).toBe(1)
      expect(res[0]?.id).toBe('rep-01')
    })

    it('фильтрует по срочности', () => {
      const res = filterReports(sample, { urgency: 'high' })
      expect(res.length).toBe(1)
      expect(res[0]?.id).toBe('rep-01')
    })

    it('фильтрует по needs_human_review', () => {
      const res = filterReports(sample, { needsReviewOnly: true })
      expect(res.length).toBe(1)
      expect(res[0]?.id).toBe('rep-02')
    })

    it('фильтрует по поисковой строке', () => {
      const res = filterReports(sample, { search: 'мусор' })
      expect(res.length).toBe(1)
      expect(res[0]?.id).toBe('rep-02')
    })

    it('фильтрует по duplicateGroup', () => {
      const res = filterReports(sample, { duplicateGroup: 'grp-1' })
      expect(res.length).toBe(1)
      expect(res[0]?.id).toBe('rep-01')
    })

    it('фильтрует по категории', () => {
      const res = filterReports(sample, { category: 'drainage_issue' })
      expect(res.length).toBe(1)
      expect(res[0]?.id).toBe('rep-02')
    })

    it('фильтрует по флагу dangerOnly', () => {
      const withDanger: ReportWithTriage[] = [
        ...sample,
        {
          ...sample[0]!,
          id: 'rep-danger',
          immediate_danger: true,
        },
      ]
      const res = filterReports(withDanger, { dangerOnly: true })
      expect(res.length).toBe(1)
      expect(res[0]?.id).toBe('rep-danger')
    })

    it('фильтрует по highRiskOnly (по comment, immediate_danger и ai urgency)', () => {
      const reports: ReportWithTriage[] = [
        {
          ...sample[0]!,
          id: 'r-moderate',
          comment: '[Умеренный риск] Вода капает',
          immediate_danger: false,
          ai_triage: { ...sample[0]!.ai_triage!, urgency_ai: 'low' },
        },
        {
          ...sample[0]!,
          id: 'r-elevated-comment',
          comment: '[Высокий риск] Вода поднимается',
          immediate_danger: false,
          ai_triage: { ...sample[0]!.ai_triage!, urgency_ai: 'low' },
        },
        {
          ...sample[0]!,
          id: 'r-critical-comment',
          comment: '[Критический риск / ЧС] Затопило дом',
          immediate_danger: false,
          ai_triage: null,
        },
        {
          ...sample[0]!,
          id: 'r-danger-flag',
          comment: 'Обычный текст',
          immediate_danger: true,
          ai_triage: null,
        },
        {
          ...sample[0]!,
          id: 'r-ai-high',
          comment: null,
          immediate_danger: false,
          ai_triage: { ...sample[0]!.ai_triage!, urgency_ai: 'high' },
        },
        {
          ...sample[0]!,
          id: 'r-ai-critical',
          comment: null,
          immediate_danger: false,
          ai_triage: { ...sample[0]!.ai_triage!, urgency_ai: 'critical' },
        },
      ]

      const res = filterReports(reports, { highRiskOnly: true })
      const matchedIds = res.map((r) => r.id)

      expect(matchedIds).toContain('r-elevated-comment')
      expect(matchedIds).toContain('r-critical-comment')
      expect(matchedIds).toContain('r-danger-flag')
      expect(matchedIds).toContain('r-ai-high')
      expect(matchedIds).toContain('r-ai-critical')
      expect(matchedIds).not.toContain('r-moderate')
      expect(res.length).toBe(5)
    })

    it('поиск находит заявку по id и по moderator_note', () => {
      const reportsWithNotes: ReportWithTriage[] = [
        {
          ...sample[0]!,
          id: 'report-abc-123',
          moderator_note: null,
        },
        {
          ...sample[1]!,
          id: 'report-xyz-789',
          moderator_note: 'Проверено инспектором МЧС',
        },
      ]

      expect(filterReports(reportsWithNotes, { search: 'abc-123' })[0]?.id).toBe('report-abc-123')
      expect(filterReports(reportsWithNotes, { search: 'инспектором' })[0]?.id).toBe('report-xyz-789')
      expect(filterReports(reportsWithNotes, { search: 'несуществующий' }).length).toBe(0)
    })
  })
})
