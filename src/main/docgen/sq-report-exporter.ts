import { app, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import ExcelJS from 'exceljs'
import type Database from 'better-sqlite3'
import type { SqSuggestedState } from '@shared/ipc-types'

/**
 * SQ 자체평가 내부 리포트 출력 — 코워크 템플릿 fill 방식 (08번 지시서 3절 셀맵 계약).
 *
 * 계약(그 외 셀 쓰기 금지 — 수식·드롭다운·조건부서식 보존):
 * - 「평가결과」: A열 \d+_\d+ 매칭 42행의 E(제안)/F(확정: 7문자열만)/H(관찰)/I(추가지적)만.
 *   G열 수식·G52/D53/D54/G54/G55 는 절대 건드리지 않음(fullCalcOnLoad 로 Excel이 재계산).
 * - 「표지」: C8 회차 · C9 평가일 · C10 평가자 · C11 입회 · F11 차기예정 · B20 종합의견.
 *   결재란(27~30행)은 사람 영역 — 쓰지 않음(approved_by 는 DB에만).
 * - 「지적사항 종합」: 5행부터 A순번/B항목/C지적사항. 4행 예시행은 보존.
 * - 저장 후 재오픈해 F열 드롭다운(dataValidations) 생존 검증(왕복 테스트).
 */

const FINAL_STATES: SqSuggestedState[] = ['우수', '양호', '보완', '일부미흡', '다수미흡', '미관리', '미해당']

/**
 * 웹(서버) 실행 여부 — server/electron-shim.cjs 만 `__webShim` 표식을 단다(실제 Electron 엔 없음).
 * N-1(8/14 검수 2차): 웹의 저장 경로는 서버가 주입한 임시 토큰 경로라 DB 각인 금지 판별에 쓴다.
 */
function isWebRuntime(): boolean {
  return (app as unknown as { __webShim?: boolean }).__webShim === true
}

function templatePath(): string {
  const rel = join('templates', 'sq_gap_forms', 'SQ자체평가_내부리포트_양식_Ver4.xlsx')
  return app.isPackaged
    ? join(process.resourcesPath, rel)
    : join(app.getAppPath(), 'resources', rel)
}

export async function exportSqReport(
  db: Database.Database,
  assessmentId: string
): Promise<{ success: boolean; filePath?: string; canceled?: boolean; validationsPreserved?: boolean; error?: string }> {
  try {
    const head = db.prepare('SELECT * FROM sq_assessments WHERE id = ?').get(assessmentId) as
      | Record<string, unknown>
      | undefined
    if (!head) return { success: false, error: '평가 세션을 찾을 수 없습니다.' }

    const lines = db
      .prepare(
        'SELECT item_code, suggested_state, final_state, observation, extra_finding FROM sq_assessment_lines WHERE assessment_id = ?'
      )
      .all(assessmentId) as Array<{
      item_code: string
      suggested_state: string | null
      final_state: string | null
      observation: string | null
      extra_finding: string | null
    }>
    const byCode = new Map(lines.map((l) => [l.item_code, l]))

    // F열 화이트리스트 검증 — 오타 = 원본 수식상 0점 (08번 주의)
    for (const l of lines) {
      if (l.final_state && !FINAL_STATES.includes(l.final_state as SqSuggestedState)) {
        return { success: false, error: `허용되지 않는 확정값: ${l.item_code} = "${l.final_state}"` }
      }
    }

    const tpl = templatePath()
    if (!existsSync(tpl)) return { success: false, error: `템플릿 없음: ${tpl}` }

    // 저장 위치
    const fileName = `SQ자체평가_${assessmentId}_${(head.assessed_at as string) || ''}.xlsx`.replace(/[\\/:*?"<>|]/g, '')
    const win = BrowserWindow.getFocusedWindow()
    const save = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'SQ 자체평가 리포트 저장',
      defaultPath: fileName,
      filters: [{ name: 'Excel 파일', extensions: ['xlsx'] }]
    })
    if (save.canceled || !save.filePath) return { success: false, canceled: true }

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(tpl) // 템플릿은 읽기 전용 — 복사본(출력 파일)에만 쓴다

    // ── 평가결과: A열 id 매칭(행번호 하드코딩 금지) ──
    const ws = wb.getWorksheet('평가결과')
    if (!ws) return { success: false, error: "'평가결과' 시트를 찾을 수 없습니다." }
    let written = 0
    ws.eachRow((row, rowNo) => {
      if (rowNo > 55) return
      const a = row.getCell(1).value
      const code = typeof a === 'string' ? a.trim() : ''
      if (!/^\d+_\d+$/.test(code)) return
      const l = byCode.get(code)
      if (!l) return
      row.getCell(5).value = l.suggested_state ?? null // E 제안(프로그램)
      row.getCell(6).value = l.final_state ?? null //     F 확정(사람)
      row.getCell(8).value = l.observation ?? null //     H 관찰사항
      row.getCell(9).value = l.extra_finding ?? null //   I 추가 지적
      written += 1
    })
    if (written !== 42) return { success: false, error: `평가결과 기입 ${written}행 — 42행 매칭 실패(템플릿 버전 확인)` }

    // ── 표지 ──
    const cover = wb.getWorksheet('표지')
    if (cover) {
      cover.getCell('C8').value = assessmentId
      cover.getCell('C9').value = (head.assessed_at as string) || null
      cover.getCell('C10').value = (head.assessor as string) || null
      cover.getCell('C11').value = (head.witness as string) || null
      cover.getCell('F11').value = (head.next_due as string) || null
      cover.getCell('B20').value = (head.summary_opinion as string) || null
    }

    // ── 지적사항 종합: 5행부터 (4행 예시 보존) ──
    const fnd = wb.getWorksheet('지적사항 종합')
    if (fnd) {
      const flagged = lines
        .filter((l) => (l.extra_finding && l.extra_finding.trim()) || (l.observation ?? '').includes('[대책수립 요청]'))
        .sort((a, b) => a.item_code.localeCompare(b.item_code))
      flagged.forEach((l, i) => {
        const row = fnd.getRow(5 + i)
        row.getCell(1).value = i + 1
        row.getCell(2).value = l.item_code
        row.getCell(3).value = l.extra_finding?.trim() || l.observation || ''
        // D~F(대책·기한·책임자)·H(시정조치 No.)는 팀 기재 — 비움
      })
    }

    // Excel 이 열 때 수식 전체 재계산 (G열·G52~G55 — ExcelJS 는 계산 엔진이 없음)
    wb.calcProperties.fullCalcOnLoad = true
    await wb.xlsx.writeFile(save.filePath)

    // ── 왕복 테스트: 드롭다운(dataValidations) 생존 확인 ──
    let validationsPreserved = false
    try {
      const rb = new ExcelJS.Workbook()
      await rb.xlsx.readFile(save.filePath)
      const rws = rb.getWorksheet('평가결과')
      const dv = (rws as unknown as { dataValidations?: { model?: Record<string, unknown> } })?.dataValidations?.model
      validationsPreserved = !!dv && Object.keys(dv).length > 0
    } catch {
      /* 검증 실패해도 파일 자체는 유효 */
    }

    // N-1(8/14 검수 2차): 웹 모드의 save.filePath 는 서버 exports 의 **임시 토큰 경로**로,
    // 다운로드 1회 or 30분 TTL 후 삭제된다. 각인하면 ①라이브 DB 에 곧 죽을 경로가 남고
    // ②데스크톱이 남긴 정상 경로까지 덮어쓴다. 웹은 사용자 PC 의 저장 위치를 서버가 알 수 없으므로
    // 미갱신이 정직한 상태(화면은 report_path 가 있을 때만 "리포트: …" 를 표시).
    if (!isWebRuntime()) {
      db.prepare('UPDATE sq_assessments SET report_path = ? WHERE id = ?').run(save.filePath, assessmentId)
    }
    return { success: true, filePath: save.filePath, validationsPreserved }
  } catch (err) {
    console.error('[sq:assessExport] failed:', (err as Error).message)
    return { success: false, error: (err as Error).message }
  }
}
