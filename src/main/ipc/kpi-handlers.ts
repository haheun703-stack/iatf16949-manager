import { BrowserWindow, dialog, ipcMain } from 'electron'
import ExcelJS from 'exceljs'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  KpiIndicatorDto,
  KpiMeasurementDto,
  KpiSaveInput,
  KpiMonthValueDto,
  KpiBatchSaveInput
} from '@shared/ipc-types'

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
  ipcMain.handle(IPC_CHANNELS.KPI_SAVE, (_event, input: KpiSaveInput): { success: boolean; error?: string } => {
    try {
      if (!/^\d{4}-\d{2}$/.test(input.period) || !Number.isFinite(input.value)) {
        return { success: false }
      }
      // M-1 최소방어: 기입 주체 빈 값 거부 — 웹은 STAMP 주입, 데스크톱은 사용자 미선택 시 여기서 멈춘다
      const enteredBy = input.enteredBy?.trim()
      if (!enteredBy) return { success: false, error: '기입 주체가 없습니다 — 사용자를 선택하세요.' }
      db.prepare(
        `INSERT INTO kpi_measurements (indicator_id, period, value, entered_by)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(indicator_id, period) DO UPDATE SET value = excluded.value, entered_by = excluded.entered_by`
      ).run(input.indicatorId, input.period, input.value, enteredBy)
      return { success: true }
    } catch (err) {
      console.error('[kpi:save] failed:', (err as Error).message)
      return { success: false }
    }
  })

  // 특정 월의 지표별 실적값 — 일괄 입력 화면 프리필(기존 값 위에 정정)
  ipcMain.handle(IPC_CHANNELS.KPI_MONTH, (_event, input: { period: string }): KpiMonthValueDto[] => {
    try {
      if (!/^\d{4}-\d{2}$/.test(input.period)) return []
      return db
        .prepare(`SELECT indicator_id AS indicatorId, value FROM kpi_measurements WHERE period = ?`)
        .all(input.period) as KpiMonthValueDto[]
    } catch (err) {
      console.error('[kpi:month] failed:', (err as Error).message)
      return []
    }
  })

  // 월별 실적 일괄 저장 — 값이 채워진 지표만 upsert(빈칸=미입력 유지). 한 트랜잭션으로 원자화.
  ipcMain.handle(
    IPC_CHANNELS.KPI_SAVE_BATCH,
    (_event, input: KpiBatchSaveInput): { success: boolean; saved: number; error?: string } => {
      try {
        if (!/^\d{4}-\d{2}$/.test(input.period) || !Array.isArray(input.entries)) {
          return { success: false, saved: 0 }
        }
        // M-1 최소방어: 기입 주체 빈 값 거부(단건 save와 동일)
        const enteredBy = input.enteredBy?.trim()
        if (!enteredBy) return { success: false, saved: 0, error: '기입 주체가 없습니다 — 사용자를 선택하세요.' }
        const stmt = db.prepare(
          `INSERT INTO kpi_measurements (indicator_id, period, value, entered_by)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(indicator_id, period) DO UPDATE SET value = excluded.value, entered_by = excluded.entered_by`
        )
        const apply = db.transaction((entries: KpiBatchSaveInput['entries']) => {
          let n = 0
          for (const e of entries) {
            if (Number.isInteger(e.indicatorId) && Number.isFinite(e.value)) {
              stmt.run(e.indicatorId, input.period, e.value, enteredBy)
              n++
            }
          }
          return n
        })
        return { success: true, saved: apply(input.entries) }
      } catch (err) {
        console.error('[kpi:save-batch] failed:', (err as Error).message)
        return { success: false, saved: 0 }
      }
    }
  )

  // ── PB2 ⓔ-2 — KPI 연간 그리드 엑셀 내보내기(4차 노트 §3 "기록을 밖으로") ──
  // 부호 착색 동봉: 목표 대비 불리 = 빨강 · 유리 = 파랑(8/4 사장님 확정 — direction 반영).
  ipcMain.handle(IPC_CHANNELS.KPI_EXPORT_XLSX, async (_e, { year }: { year: string }) => {
    try {
      if (!/^\d{4}$/.test(year || '')) return { success: false, error: '연도(YYYY)가 필요합니다.' }
      const inds = db
        .prepare(
          `SELECT id, name, unit, target, direction, owner_team FROM kpi_indicators
           WHERE active = 1 ORDER BY sort_order ASC, id ASC`
        )
        .all() as Array<{ id: number; name: string; unit: string | null; target: number | null; direction: string; owner_team: string | null }>
      const meas = db
        .prepare(`SELECT indicator_id, period, value FROM kpi_measurements WHERE period LIKE ?`)
        .all(`${year}-%`) as Array<{ indicator_id: number; period: string; value: number }>
      const byKey = new Map(meas.map((m) => [`${m.indicator_id}|${m.period}`, m.value]))

      const win = BrowserWindow.getFocusedWindow()
      const saveRes = win
        ? await dialog.showSaveDialog(win, {
            title: 'KPI 실적 그리드 저장',
            defaultPath: `KPI실적_${year}.xlsx`,
            filters: [{ name: 'Excel 파일', extensions: ['xlsx'] }]
          })
        : await dialog.showSaveDialog({
            title: 'KPI 실적 그리드 저장',
            defaultPath: `KPI실적_${year}.xlsx`,
            filters: [{ name: 'Excel 파일', extensions: ['xlsx'] }]
          })
      if (saveRes.canceled || !saveRes.filePath) return { success: false, canceled: true }

      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet(`KPI ${year}`, { views: [{ state: 'frozen', xSplit: 3, ySplit: 2 }] })
      // 병합 헤더(4차 §3): 1행 = 지표/단위/목표 + 분기 그룹, 2행 = 월
      ws.mergeCells('A1:A2'); ws.getCell('A1').value = '지표'
      ws.mergeCells('B1:B2'); ws.getCell('B1').value = '단위'
      ws.mergeCells('C1:C2'); ws.getCell('C1').value = '목표'
      for (let q = 0; q < 4; q++) {
        const start = 4 + q * 3
        ws.mergeCells(1, start, 1, start + 2)
        ws.getCell(1, start).value = `${q + 1}분기`
      }
      for (let m = 1; m <= 12; m++) ws.getCell(2, 3 + m).value = `${m}월`
      for (let c = 1; c <= 15; c++) {
        const h1 = ws.getCell(1, c); const h2 = ws.getCell(2, c)
        for (const cell of [h1, h2]) {
          cell.font = { bold: true }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF4FB' } }
          cell.border = { bottom: { style: 'thin' }, right: { style: 'thin' } }
        }
      }
      for (const ind of inds) {
        const row = ws.addRow([
          ind.name, ind.unit || '%', ind.target,
          ...Array.from({ length: 12 }, (_, i) => byKey.get(`${ind.id}|${year}-${String(i + 1).padStart(2, '0')}`) ?? null)
        ])
        for (let m = 1; m <= 12; m++) {
          const cell = row.getCell(3 + m)
          const v = cell.value
          if (typeof v === 'number' && ind.target != null) {
            const bad = ind.direction === 'lower' ? v > ind.target : v < ind.target
            cell.font = { color: { argb: bad ? 'FFB23A3A' : 'FF2467B3' }, bold: true }
          }
          cell.border = { bottom: { style: 'hair' }, right: { style: 'hair' } }
        }
      }
      ws.getColumn(1).width = 30; ws.getColumn(2).width = 8; ws.getColumn(3).width = 10
      for (let m = 4; m <= 15; m++) ws.getColumn(m).width = 9

      await wb.xlsx.writeFile(saveRes.filePath)
      return { success: true, filePath: saveRes.filePath }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}
