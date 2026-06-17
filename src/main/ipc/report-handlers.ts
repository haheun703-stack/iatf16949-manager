import { ipcMain, dialog, BrowserWindow } from 'electron'
import ExcelJS from 'exceljs'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type { ReportExportResult, FormScoreResultDto, FormScoreGapDto } from '@shared/ipc-types'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function registerReportHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.REPORT_EXPORT_SCORES, async (): Promise<ReportExportResult> => {
    try {
      // 양식별 최신 채점 결과
      const rows = db
        .prepare(
          `SELECT fs.form_code, fs.score, fs.grade, fs.verdict, fs.summary, fs.result_json,
                  fs.scored_at, fs.provider, f.name AS form_name, f.reg_code
           FROM form_scores fs
           JOIN (
             SELECT form_code, MAX(scored_at) AS max_at FROM form_scores GROUP BY form_code
           ) m ON fs.form_code = m.form_code AND fs.scored_at = m.max_at
              -- 동일 scored_at 동률 시 최신 id 1건만 선택(중복행 방지)
              AND fs.id = (SELECT MAX(z.id) FROM form_scores z
                           WHERE z.form_code = fs.form_code AND z.scored_at = m.max_at)
           JOIN forms f ON f.code = fs.form_code
           ORDER BY fs.score ASC`
        )
        .all() as Array<{
        form_code: string
        score: number
        grade: string | null
        verdict: string | null
        summary: string | null
        result_json: string
        scored_at: string
        provider: string | null
        form_name: string
        reg_code: string
      }>

      if (rows.length === 0) {
        return { success: false, error: '채점된 양식이 없습니다. 먼저 양식을 AI 채점해 주세요.' }
      }

      const win = BrowserWindow.getFocusedWindow()
      if (!win) return { success: false, error: '활성 창을 찾을 수 없습니다.' }

      const now = new Date()
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
      const saveRes = await dialog.showSaveDialog(win, {
        title: 'AI 채점 리포트 저장',
        defaultPath: `IATF16949_AI채점리포트_${stamp}.xlsx`,
        filters: [{ name: 'Excel 파일', extensions: ['xlsx'] }]
      })
      if (saveRes.canceled || !saveRes.filePath) {
        return { success: false, canceled: true }
      }

      const wb = new ExcelJS.Workbook()
      wb.creator = 'IATF 16949 Manager'
      wb.created = now

      const ws = wb.addWorksheet('AI 채점 리포트', {
        views: [{ state: 'frozen', ySplit: 4 }]
      })

      // Title
      ws.mergeCells('A1:H1')
      const titleCell = ws.getCell('A1')
      titleCell.value = 'IATF 16949 AI 채점 리포트 — TPC AM사업부'
      titleCell.font = { bold: true, size: 15 }
      titleCell.alignment = { vertical: 'middle' }
      ws.getRow(1).height = 24

      ws.mergeCells('A2:H2')
      const avg = Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
      ws.getCell('A2').value = `생성: ${now.toLocaleString('ko-KR')} · 채점 양식 ${rows.length}건 · 평균 ${avg}점`
      ws.getCell('A2').font = { size: 10, color: { argb: 'FF666666' } }

      // Header row (row 4)
      const headers = ['양식코드', '양식명', '규정', '점수', '등급', '판정', '주요 감점사유', '개선 제안']
      const headerRow = ws.getRow(4)
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1)
        cell.value = h
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } }
      })
      headerRow.height = 20

      ws.columns = [
        { width: 14 },
        { width: 34 },
        { width: 12 },
        { width: 8 },
        { width: 7 },
        { width: 10 },
        { width: 48 },
        { width: 48 }
      ]

      // Data rows
      for (const r of rows) {
        let parsed: FormScoreResultDto | null = null
        try {
          parsed = JSON.parse(r.result_json) as FormScoreResultDto
        } catch {
          parsed = null
        }
        const gaps = (parsed?.gaps ?? [])
          .map((g: FormScoreGapDto) => `· [${g.severity}] ${g.item}${g.regRef ? ` (${g.regRef})` : ''}`)
          .join('\n')
        const suggestions = (parsed?.suggestions ?? []).map((s) => `· ${s}`).join('\n')

        const row = ws.addRow([
          r.form_code,
          r.form_name,
          r.reg_code,
          r.score,
          r.grade ?? '',
          r.verdict ?? '',
          gaps,
          suggestions
        ])
        row.alignment = { vertical: 'top', wrapText: true }
        // 점수 색상
        const scoreCell = row.getCell(4)
        scoreCell.alignment = { vertical: 'middle', horizontal: 'center' }
        scoreCell.font = {
          bold: true,
          color: {
            argb:
              r.score >= 90
                ? 'FF16A34A'
                : r.score >= 75
                  ? 'FF7C3AED'
                  : r.score >= 60
                    ? 'FFD97706'
                    : 'FFEF4444'
          }
        }
        row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' }
        row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' }
      }

      await wb.xlsx.writeFile(saveRes.filePath)
      console.log(`[report] exported ${rows.length} scores → ${saveRes.filePath}`)
      return { success: true, filePath: saveRes.filePath, count: rows.length }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[report] export error', msg)
      return { success: false, error: msg }
    }
  })
}
