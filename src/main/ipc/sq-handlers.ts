import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  SqReadinessDto,
  SqReadinessCategory,
  SqReadinessItem,
  SqSignal,
  SqItemDetailDto,
  SqItemFormRef,
  SqItemDoc
} from '@shared/ipc-types'

/**
 * SQ 준비도 — SQ 평가 백본(6대·42항목)을 forms.reg_code 로 양식에 연결해
 * 항목별 신호등(🟢🟡🔴)을 집계한다.
 *
 * 연결 다리: sq_reg_map.reg_code == forms.reg_code (예 'B-1100').
 * 신호 규칙(항목): std=layout 보유(작성가능) 양식수, drafted=작성본1건+ 양식수
 *   ⬜ gray  : 매핑된 양식이 0개 (측정 불가 — 규정↔양식 도메인 매핑 부재). red와 구분.
 *   🟢 green : 대표 양식 1개+ 표준화 && 작성본 1건+ (std>=1 && drafted>=1)
 *   🟡 yellow: 일부 표준화 또는 작성 (std>=1 || drafted>=1)
 *   🔴 red   : 양식은 매핑됐으나 표준화·작성 전무
 * (이전엔 green이 std===formCount를 요구해 구조적으로 도달 불가였음 — 대표양식 기준으로 정정)
 */
function itemSignal(formCount: number, std: number, drafted: number): SqSignal {
  if (formCount === 0) return 'gray'
  if (std >= 1 && drafted >= 1) return 'green'
  if (std >= 1 || drafted >= 1) return 'yellow'
  return 'red'
}

const SIGNAL_SCORE: Record<SqSignal, number> = { green: 1, yellow: 0.5, red: 0, gray: 0 }

export function registerSqHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.SQ_READINESS, (): SqReadinessDto => {
    try {
      const categories = db
        .prepare(
          'SELECT id, name, points, iatf_clause FROM sq_categories ORDER BY sort_order'
        )
        .all() as Array<{ id: number; name: string; points: number; iatf_clause: string | null }>

      // 항목 × 매핑양식 (한 행 = 항목,양식). 양식 없으면 form_code NULL.
      const rows = db
        .prepare(
          `SELECT i.code, i.title, i.points, i.category_id,
                  f.code AS form_code,
                  (f.layout_json IS NOT NULL) AS standardized,
                  (SELECT COUNT(*) FROM form_submissions s WHERE s.form_code = f.code) AS sub_count
           FROM sq_items i
           LEFT JOIN sq_reg_map m ON m.item_code = i.code
           LEFT JOIN forms f      ON f.reg_code = m.reg_code
           ORDER BY i.sort_order, f.code`
        )
        .all() as Array<{
        code: string
        title: string
        points: number
        category_id: number
        form_code: string | null
        standardized: number | null
        sub_count: number | null
      }>

      // 항목별 집계(양식 중복 방지 = form_code Set)
      interface Acc {
        title: string
        points: number
        categoryId: number
        forms: Set<string>
        std: Set<string>
        drafted: Set<string>
      }
      const byItem = new Map<string, Acc>()
      for (const r of rows) {
        let a = byItem.get(r.code)
        if (!a) {
          a = {
            title: r.title,
            points: r.points,
            categoryId: r.category_id,
            forms: new Set(),
            std: new Set(),
            drafted: new Set()
          }
          byItem.set(r.code, a)
        }
        if (r.form_code) {
          a.forms.add(r.form_code)
          if (r.standardized) a.std.add(r.form_code)
          if ((r.sub_count ?? 0) > 0) a.drafted.add(r.form_code)
        }
      }

      const itemsByCat = new Map<number, SqReadinessItem[]>()
      for (const [code, a] of byItem) {
        const item: SqReadinessItem = {
          code,
          title: a.title,
          points: a.points,
          formCount: a.forms.size,
          standardizedCount: a.std.size,
          draftedCount: a.drafted.size,
          signal: itemSignal(a.forms.size, a.std.size, a.drafted.size)
        }
        if (!itemsByCat.has(a.categoryId)) itemsByCat.set(a.categoryId, [])
        itemsByCat.get(a.categoryId)!.push(item)
      }

      const catDtos: SqReadinessCategory[] = categories.map((c) => {
        const items = itemsByCat.get(c.id) ?? []
        // 카테고리 신호 = 측정가능(gray 제외) 항목의 points 가중평균
        const scored = items.filter((it) => it.signal !== 'gray')
        const wsum = scored.reduce((s, it) => s + it.points, 0) || 1
        const ratio = scored.reduce((s, it) => s + SIGNAL_SCORE[it.signal] * it.points, 0) / wsum
        const signal: SqSignal =
          scored.length === 0 ? 'gray' : ratio >= 0.999 ? 'green' : ratio <= 0.001 ? 'red' : 'yellow'
        return {
          id: c.id,
          name: c.name,
          points: c.points,
          iatfClause: c.iatf_clause,
          signal,
          items
        }
      })

      const totalPoints = categories.reduce((s, c) => s + c.points, 0)
      return { categories: catDtos, totalPoints }
    } catch (err) {
      console.error('[sq:readiness] aggregation failed:', (err as Error).message)
      return { categories: [], totalPoints: 0 }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.SQ_ITEM_DETAIL,
    (_event, { code }: { code: string }): SqItemDetailDto | null => {
      try {
        const item = db
          .prepare(
            `SELECT i.code, i.title, i.points, i.requirement, c.name AS category_name
             FROM sq_items i JOIN sq_categories c ON c.id = i.category_id
             WHERE i.code = ?`
          )
          .get(code) as
          | { code: string; title: string; points: number; requirement: string | null; category_name: string }
          | undefined
        if (!item) return null

        const docs = db
          .prepare('SELECT doc_code, doc_name, dept FROM sq_item_docs WHERE item_code = ?')
          .all(code) as Array<{ doc_code: string | null; doc_name: string | null; dept: string | null }>

        const forms = db
          .prepare(
            `SELECT f.code AS form_code, f.name AS form_name, f.reg_code,
                    (f.layout_json IS NOT NULL) AS standardized,
                    (SELECT COUNT(*) FROM form_submissions s WHERE s.form_code = f.code) AS sub_count
             FROM sq_reg_map m
             JOIN forms f ON f.reg_code = m.reg_code
             WHERE m.item_code = ?
             ORDER BY f.code`
          )
          .all(code) as Array<{
          form_code: string
          form_name: string
          reg_code: string
          standardized: number
          sub_count: number
        }>

        const formTypes = db
          .prepare('SELECT form_type FROM sq_item_form_types WHERE item_code = ? ORDER BY count_in_archive DESC')
          .all(code) as Array<{ form_type: string }>

        const docDtos: SqItemDoc[] = docs.map((d) => ({
          docCode: d.doc_code,
          docName: d.doc_name,
          dept: d.dept
        }))
        const formDtos: SqItemFormRef[] = forms.map((f) => ({
          formCode: f.form_code,
          formName: f.form_name,
          regCode: f.reg_code,
          standardized: !!f.standardized,
          draftCount: f.sub_count
        }))

        return {
          code: item.code,
          title: item.title,
          points: item.points,
          requirement: item.requirement,
          categoryName: item.category_name,
          docs: docDtos,
          forms: formDtos,
          formTypes: formTypes.map((t) => t.form_type)
        }
      } catch (err) {
        console.error('[sq:itemDetail] failed:', (err as Error).message)
        return null
      }
    }
  )
}
