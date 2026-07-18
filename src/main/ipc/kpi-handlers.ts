import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type { KpiIndicatorDto, KpiMeasurementDto, KpiSaveInput } from '@shared/ipc-types'

/**
 * 관제탑 홈 KPI 지수 (0066) — 지표 정의 + 월별 측정값.
 * 측정값이 없으면 latest=null → 화면은 '미입력' 정직 표시(가짜 숫자 금지).
 */
export function registerKpiHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.KPI_HOME, (): KpiIndicatorDto[] => {
    try {
      const rows = db
        .prepare(
          `SELECT id, name, unit, target, direction, owner_team, sort_order, note
           FROM kpi_indicators WHERE active = 1 ORDER BY sort_order ASC, id ASC`
        )
        .all() as Array<Record<string, unknown>>
      const recent = db.prepare(
        `SELECT period, value FROM kpi_measurements
         WHERE indicator_id = ? ORDER BY period DESC LIMIT 2`
      )
      return rows.map((r) => {
        const meas = recent.all(r.id as number) as Array<{ period: string; value: number }>
        const toDto = (m?: { period: string; value: number }): KpiMeasurementDto | null =>
          m ? { period: m.period, value: m.value } : null
        return {
          id: r.id as number,
          name: r.name as string,
          unit: (r.unit as string) || '%',
          target: (r.target as number) ?? null,
          direction: (r.direction as 'higher' | 'lower') || 'higher',
          ownerTeam: (r.owner_team as string) || null,
          sortOrder: (r.sort_order as number) ?? 0,
          note: (r.note as string) || null,
          latest: toDto(meas[0]),
          prev: toDto(meas[1])
        }
      })
    } catch (err) {
      console.error('[kpi:home] failed:', (err as Error).message)
      return []
    }
  })

  // 월별 실적 입력 — 같은 (지표, 월) 재입력 시 값 교체(정정 허용)
  ipcMain.handle(IPC_CHANNELS.KPI_SAVE, (_event, input: KpiSaveInput): { success: boolean } => {
    try {
      if (!/^\d{4}-\d{2}$/.test(input.period) || !Number.isFinite(input.value)) {
        return { success: false }
      }
      db.prepare(
        `INSERT INTO kpi_measurements (indicator_id, period, value, entered_by)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(indicator_id, period) DO UPDATE SET value = excluded.value, entered_by = excluded.entered_by`
      ).run(input.indicatorId, input.period, input.value, input.enteredBy ?? null)
      return { success: true }
    } catch (err) {
      console.error('[kpi:save] failed:', (err as Error).message)
      return { success: false }
    }
  })
}
