import { Fragment, useCallback, useEffect, useState } from 'react'
import { todayKST, ymdAddKST } from '@shared/date-kst'
import type { SemimesInspRowDto, SemimesInspValueRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 32호 1차분 ④·⑤ — 검사내역 조회.
 *  · fixedKind='수입' → 수입검사내역조회(그림30 — SQ 2_1·2_2 · L2100-07 근거양식 직행 동봉)
 *  · 미지정 → 품질검사내역(그림32~36 — 검사구분 콤보 1화면 · SQ 1_4·2_7)
 * PC-1 계약 전부 표출: 초중종 · 확인자 2단(대기 표시) · spec_revision · 취소 정직 표기.
 * 행 클릭 → 측정값(시료 1~n) 확장 — 연결 스펙 규격 이탈은 빨강(33호 "검사내역 보기" 문법).
 */

const KINDS = ['수입', '공정', '자주', '패트롤', '출하']

// P2″(슬러지): 화면별 ymdAdd 복제 → 공용 ymdAddKST 치환(date-kst — 8/12 배치⑶ 승격분)
const ymdAdd = (days: number): string => ymdAddKST(todayKST(), days)

export function InspHistoryView({ fixedKind }: { fixedKind?: string }): JSX.Element {
  const { setPage, setSelectedFormCode } = useUIStore()
  const [from, setFrom] = useState(ymdAdd(-6))
  const [to, setTo] = useState(ymdAdd(0))
  const [kind, setKind] = useState(fixedKind ?? '')
  const [itemCode, setItemCode] = useState('')
  const [rows, setRows] = useState<SemimesInspRowDto[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)
  const [values, setValues] = useState<SemimesInspValueRowDto[]>([])

  const load = useCallback(async (): Promise<void> => {
    setBusy(true)
    setErr(null)
    setOpenId(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_INSP_LIST, {
        from, to, kind: (fixedKind ?? kind) || undefined, itemCode: itemCode.trim() || undefined
      })) as SemimesInspRowDto[]
      setRows(res)
    } catch {
      setErr('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
  }, [from, to, kind, itemCode, fixedKind])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleValues = async (id: number): Promise<void> => {
    if (openId === id) {
      setOpenId(null)
      return
    }
    try {
      setValues((await window.api.invoke(window.api.channels.SEMIMES_INSP_VALUES, { id })) as SemimesInspValueRowDto[])
      setOpenId(id)
    } catch {
      setErr('측정값 조회 실패 — 통신 오류.')
    }
  }

  const excel = (): void => {
    downloadCsv(
      `${fixedKind === '수입' ? '수입검사내역' : '품질검사내역'}_${from}_${to}.csv`,
      ['검사일', '구분', '품번', '품명', 'LOT', '공정', '초중종', '판정', '불량수', 'REV', '검사자', '확인자', '측정값 수', '취소'],
      rows.map((r) => [r.inspDate, r.inspKind, r.itemCode, r.itemName, r.lotNo, r.procCode, r.samplePhase, r.judgment, r.defectQty, r.specRevision, r.inspector, r.confirmer, r.valueCnt, r.canceled ? '취소' : ''])
    )
  }

  // 시료 pivot: 항목별 → sampleNo 열
  const byItem = new Map<string, { su: number | null; sl: number | null; unit: string | null; samples: Map<number, number> }>()
  let maxSample = 1
  for (const v of values) {
    const e = byItem.get(v.inspItem) ?? { su: v.su, sl: v.sl, unit: v.unit, samples: new Map() }
    e.samples.set(v.sampleNo, v.value)
    if (v.sampleNo > maxSample) maxSample = v.sampleNo
    byItem.set(v.inspItem, e)
  }
  const sampleCols = Array.from({ length: Math.min(maxSample, 5) }, (_, i) => i + 1)

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'
  const isIncoming = fixedKind === '수입'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">{isIncoming ? '수입검사내역 조회' : '품질검사내역'}</h1>
        {(isIncoming ? ['2_1', '2_2'] : ['1_4', '2_7']).map((s) => (
          <span key={s} className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-secondary text-primary">SQ {s}</span>
        ))}
        <span className="text-[13px] text-muted-foreground">
          {isIncoming ? '원천 = 직접 기록(수입) · 수집함 T4 연동 — 이력카드는 근거양식으로' : '검사구분 통합 조회 — 초중종·확인자 2단·REV 스냅샷 표출'}
        </span>
        {isIncoming && (
          <button type="button" className="text-[12px] font-bold text-primary underline underline-offset-2"
            onClick={() => { setSelectedFormCode('L2100-07'); setPage('form-builder') }}>
            수입검사 이력카드(L2100-07) 작성 ↗
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar onReset={() => { setItemCode(''); setKind(fixedKind ?? ''); setFrom(ymdAdd(-6)); setTo(ymdAdd(0)) }} onSearch={() => void load()} onExcel={excel} onPrint={() => window.print()} busy={busy} />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          {!fixedKind && (
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
              <option value="">전체 구분</option>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          )}
          기간
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px]" />
          ~
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px]" />
          <input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="품번" className="h-8 w-[140px] px-2 rounded-lg border border-border bg-card text-[12px]" />
        </span>
      </div>

      {err && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{err}</div>}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[980px]">
          <thead>
            <tr>{['검사일', '구분', '품번', '품명', 'LOT', '공정', '초중종', '판정', 'REV', '검사자', '확인자(2단)', '측정값'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && !busy && (
              <tr><td colSpan={12} className="py-8 text-center text-muted-foreground text-[13px]">기간 내 검사기록이 없습니다.</td></tr>
            )}
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr className={cn(r.canceled && 'opacity-45')}>
                  <td className={TD}>{r.inspDate}{r.canceled && <span className="ml-1.5 inline-block text-[10.5px] font-bold rounded px-1.5 bg-bad-tint text-bad-ink">취소</span>}</td>
                  <td className={cn(TD, 'font-bold')}>{r.inspKind}</td>
                  <td className={cn(TD, 'font-semibold')}>{r.itemCode}</td>
                  <td className={cn(TD, 'text-muted-foreground max-w-[180px] truncate')}>{r.itemName ?? ''}</td>
                  <td className={cn(TD, 'font-bold text-primary')}>{r.lotNo ?? '—'}</td>
                  <td className={TD}>{r.procCode ?? '—'}</td>
                  <td className={TD}>{r.samplePhase ?? '—'}</td>
                  <td className={cn(TD, 'font-bold', r.judgment === '합격' ? 'text-ok-ink' : r.judgment === '불합격' ? 'text-bad-ink' : 'text-warn-ink')}>
                    {r.judgment}{r.defectQty ? ` (${r.defectQty})` : ''}
                  </td>
                  <td className={cn(TD, 'tabular-nums text-muted-foreground')}>{r.specRevision ?? '—'}</td>
                  <td className={TD}>{r.inspector ?? '—'}</td>
                  <td className={TD}>
                    {r.confirmer
                      ? <span className="font-semibold">{r.confirmer} ✓</span>
                      : r.canceled
                        ? '—'
                        : <span className="inline-block text-[10.5px] font-bold rounded px-1.5 py-[1px] bg-warn-tint text-warn-ink">확인 대기</span>}
                  </td>
                  <td className={TD}>
                    {r.valueCnt > 0
                      ? <button type="button" onClick={() => void toggleValues(r.id)} className="text-[12px] font-bold text-primary underline underline-offset-2">{r.valueCnt}건 {openId === r.id ? '접기' : '보기'}</button>
                      : '—'}
                  </td>
                </tr>
                {openId === r.id && (
                  <tr>
                    <td colSpan={12} className="bg-muted/40 px-4 py-3 border-b border-border/60">
                      <table className="text-[12px] border-collapse">
                        <thead>
                          <tr>
                            <th className="text-left font-bold pr-4 py-1">검사항목</th>
                            <th className="text-left font-bold pr-4 py-1">규격</th>
                            {sampleCols.map((n) => <th key={n} className="text-right font-bold pr-4 py-1">시료{n}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from(byItem.entries()).map(([item, e]) => (
                            <tr key={item}>
                              <td className="pr-4 py-1 font-semibold">{item}</td>
                              <td className="pr-4 py-1 text-muted-foreground">
                                {e.sl != null || e.su != null ? `${e.sl ?? ''}~${e.su ?? ''}${e.unit ? ` ${e.unit}` : ''}` : '—'}
                              </td>
                              {sampleCols.map((n) => {
                                const v = e.samples.get(n)
                                const off = v != null && ((e.su != null && v > e.su) || (e.sl != null && v < e.sl))
                                return (
                                  <td key={n} className={cn('text-right tabular-nums pr-4 py-1', off ? 'font-bold text-bad-ink' : 'font-medium')}>
                                    {v != null ? v : '—'}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {/* 8/11 검수 Minor: 시료 6번부터 열이 잘려 조용히 감춰졌다 — 감춘 사실을 표기(정직 문법).
                          엑셀은 헤더 요약(측정값 수)만이라 대체 경로로 안내하지 않는다. */}
                      {maxSample > sampleCols.length && (
                        <p className="mt-2 text-[11.5px] font-semibold text-warn-ink">
                          이 기록은 시료 {maxSample}개 — 화면에는 {sampleCols.length}개까지만 표시됩니다(시료 {sampleCols.length + 1}~{maxSample}번은 접힘 · 기록 자체는 보존).
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
