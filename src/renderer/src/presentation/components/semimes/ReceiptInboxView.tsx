import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, FileUp, Plus, Trash2, RefreshCw } from 'lucide-react'
import type {
  SemimesCaptureKind,
  SemimesCaptureListDto,
  SemimesItemSearchRowDto
} from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { EmptyResult, GroupLabel, StatBand, StatTile } from '../shared/list/ListKit'
import { ModalSheet } from '../shared/ModalSheet'

/**
 * G1 수집함 — 입고·출하 전표 사진 태깅 (29번 §8-⑥ · M1 견적 §2, 템플릿 C).
 * 방 1개 + 유형 태그: 외주 왕복(출하→재입고) 계보를 한 화면에서 본다(M1 §0-3 실측 근거).
 * 사진 1장 : 수불 N행(1:N) — [품목 행 추가]가 기본형(전표 4장 중 3장 다품목).
 * 태깅 전 사진 = '미분류 입고 증거'로 유효(15번 §0.5-2). 인수자 필수 아님(빈칸이 가짜보다 낫다).
 * 구조화는 품번·수량·거래처·일자·업체LOT 5개뿐 — 단가·금액 금지(경계 "돈은 안 만진다").
 */

type Filter = 'all' | 'untagged' | 'in' | 'out'

interface ItemRow {
  itemCode: string
  qty: string
  vendorLot: string
  suggestions: SemimesItemSearchRowDto[]
}

const EMPTY_ROW = (): ItemRow => ({ itemCode: '', qty: '', vendorLot: '', suggestions: [] })

/** 폰·스캔 원본을 서버 한도(8MB JSON) 아래로 — 긴 변 2000px·JPEG 0.85 다운스케일 */
async function fileToJpegBase64(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('이미지 해석 실패'))
      el.src = url
    })
    const maxEdge = 2000
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas 미지원')
    ctx.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

const fmtTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function ReceiptInboxView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name

  const [data, setData] = useState<SemimesCaptureListDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('untagged')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  /** 웹 스트림 URL 실패 시 1회 채널 폴백(Electron·파일 유실) — 재귀 방지 플래그 */
  const imageFellBack = useRef(false)
  const [imageZoom, setImageZoom] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  // ── 태깅 폼 상태 ──
  const [formKind, setFormKind] = useState<SemimesCaptureKind>('receipt_in')
  const [docDate, setDocDate] = useState('')
  const [partnerCode, setPartnerCode] = useState('')
  const [receiptClass, setReceiptClass] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<ItemRow[]>([EMPTY_ROW()])
  const searchTimer = useRef<number | null>(null)

  const inFileRef = useRef<HTMLInputElement>(null)
  const outFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_CAPTURE_LIST)) as SemimesCaptureListDto
      setData(res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = data?.rows ?? []
  const selected = rows.find((r) => r.id === selectedId) ?? null

  // 선택 변경 → 사진 소스 지정 + 폼 초기화(미분류일 때)
  // 소견 A(8/5 검수): base64 데이터URL(JSON)은 멀티-백KB 문자열이 힙·DOM에 얹혀 렌더러가
  // 얼어붙었다 — 웹은 로그인 가드 스트림 URL(<img>가 비동기 로드·디코드·캐시), 실패 시에만
  // 채널 폴백(Electron file:// 오리진·파일 유실 케이스).
  useEffect(() => {
    setImageZoom(false)
    setMsg(null)
    imageFellBack.current = false
    setImageUrl(selected?.hasImage ? `/api/capture-image/${selected.id}` : null)
    if (!selected) return
    if (selected.status === '미분류') {
      setFormKind(selected.kind)
      setDocDate('')
      setPartnerCode('')
      setReceiptClass('')
      classTouched.current = false // 새 전표 = 초안 규칙 재가동
      setNote('')
      setItems([EMPTY_ROW()])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  /** 거래처 입력 해석: 코드 우선, 아니면 이름(공백 무시) 유일 일치 시 코드로 (소견 D — 8/5 검수) */
  const resolvePartnerCode = useCallback(
    (input: string): string => {
      const t = input.trim()
      if (!t || !data) return t
      if (data.partners.some((p) => p.code === t)) return t
      const key = t.replace(/[\s　]/g, '')
      const byName = data.partners.filter((p) => p.name.replace(/[\s　]/g, '') === key)
      return byName.length === 1 ? byName[0].code : t
    },
    [data]
  )

  // 거래처 입력 → 입고 구분 초안(자재공급처→원자재·외주처→외주재입고, 태깅 때 확정 — M1 §1)
  // 이름 입력도 해석 후 초안(소견 D·E). 유형 '고객' 등은 규칙 대상 아님 — 수동 선택(설계 그대로).
  // 8/6 검수 Minor: 초안은 사람이 고른 구분을 덮지 않는다 — 수동 선택 후에는 초안 중지.
  const classTouched = useRef(false)
  useEffect(() => {
    if (classTouched.current) return
    const p = data?.partners.find((x) => x.code === resolvePartnerCode(partnerCode))
    if (!p) return
    if (p.type === '자재공급처') setReceiptClass('원자재')
    else if (p.type === '외주처') setReceiptClass('외주재입고')
  }, [partnerCode, data, resolvePartnerCode])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'untagged':
        return rows.filter((r) => r.status === '미분류')
      case 'in':
        return rows.filter((r) => r.kind === 'receipt_in')
      case 'out':
        return rows.filter((r) => r.kind === 'receipt_out')
      default:
        return rows
    }
  }, [rows, filter])

  const oldestUntagged = useMemo(
    () =>
      rows
        .filter((r) => r.status === '미분류')
        .slice()
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, 5),
    [rows]
  )

  async function upload(kind: SemimesCaptureKind, file: File | undefined): Promise<void> {
    if (!file) return
    setBusy(true)
    setMsg(null)
    try {
      const dataUrl = await fileToJpegBase64(file)
      const res = (await window.api.invoke(window.api.channels.SEMIMES_CAPTURE_CREATE, {
        kind,
        imageBase64: dataUrl,
        fileName: file.name,
        createdBy: userName
      })) as { success: boolean; id?: number; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '등록 실패' })
        return
      }
      await load()
      setFilter('untagged')
      setSelectedId(res.id ?? null)
      setMsg({ tone: 'ok', text: `${kind === 'receipt_in' ? '입고' : '출하'} 전표 사진 등록 — 태깅 대기` })
    } catch (e) {
      setMsg({ tone: 'bad', text: e instanceof Error ? e.message : '등록 실패' })
    } finally {
      setBusy(false)
      if (inFileRef.current) inFileRef.current.value = ''
      if (outFileRef.current) outFileRef.current.value = ''
    }
  }

  // 8/6 검수 Minor: 언마운트 시 검색 타이머 정리(늦은 응답의 setState 누수 방지)
  useEffect(() => () => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
  }, [])

  function searchItems(rowIdx: number, query: string): void {
    if (searchTimer.current) window.clearTimeout(searchTimer.current)
    searchTimer.current = window.setTimeout(() => {
      void (async () => {
        try {
          const res = (await window.api.invoke(window.api.channels.SEMIMES_ITEM_SEARCH, {
            query,
            limit: 20
          })) as SemimesItemSearchRowDto[]
          setItems((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, suggestions: res } : r)))
        } catch {
          /* 검색 실패 — 제안 없이 직접 입력 유지 */
        }
      })()
    }, 250)
  }

  async function saveTag(): Promise<void> {
    if (!selected) return
    // 8/6 검수 Minor: qty 빈칸/0 사전검증 — 서버 거부 전에 어느 행인지 짚어 안내
    const badRow = items.findIndex((r) => r.itemCode.trim() !== '' && !(Number(r.qty) > 0))
    if (badRow >= 0) {
      setMsg({ tone: 'bad', text: `${badRow + 1}행 수량이 비었거나 유효하지 않습니다 — 전표의 실측 수량을 기입하세요.` })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const payload = {
        captureId: selected.id,
        kind: formKind,
        docDate,
        partnerCode: resolvePartnerCode(partnerCode),
        receiptClass: formKind === 'receipt_in' ? receiptClass || undefined : undefined,
        items: items
          .filter((r) => r.itemCode.trim())
          .map((r) => ({
            itemCode: r.itemCode.trim(),
            qty: Number(r.qty),
            vendorLot: r.vendorLot.trim() || null // 전표에 없으면 비워 둔다 — 억지 기입 금지(M1 §0-2)
          })),
        note,
        createdBy: userName
      }
      const res = (await window.api.invoke(window.api.channels.SEMIMES_CAPTURE_TAG, payload)) as {
        success: boolean
        receiptIds?: number[]
        error?: string
      }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      await load()
      setMsg({
        tone: 'ok',
        text:
          formKind === 'receipt_in'
            ? `태깅완료 — 수불 ${res.receiptIds?.length ?? 0}행 생성(사진 1 : 수불 N)`
            : '태깅완료 — 출하 기록(구조화는 사진+태그만, 수불부 없음)'
      })
    } catch (e) {
      setMsg({ tone: 'bad', text: e instanceof Error ? e.message : '저장 실패' })
    } finally {
      setBusy(false)
    }
  }

  const kindBadge = (k: SemimesCaptureKind): JSX.Element => (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-bold shrink-0',
        k === 'receipt_in' ? 'bg-data-tint text-data-ink' : 'bg-warn-tint text-warn-ink'
      )}
    >
      {k === 'receipt_in' ? '입고' : '출하'}
    </span>
  )

  const statusBadge = (s: '미분류' | '태깅완료'): JSX.Element => (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-bold shrink-0',
        s === '미분류' ? 'bg-bad-tint text-bad-ink' : 'bg-ok-tint text-ok-ink'
      )}
    >
      {s}
    </span>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <GroupLabel
          bar="bg-data"
          title="수집함 — 입고·출하 전표"
          cap="사진 1장 → 태깅 → 수불 N행 · 태깅 전 사진도 미분류 증거로 유효"
        />
        <div className="flex items-center gap-2">
          <input
            ref={inFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void upload('receipt_in', e.target.files?.[0])}
          />
          <input
            ref={outFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void upload('receipt_out', e.target.files?.[0])}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inFileRef.current?.click()}
            className="h-9 px-3 rounded-lg bg-primary text-white text-[13px] font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" /> 입고 전표
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => outFileRef.current?.click()}
            className="h-9 px-3 rounded-lg border border-warn-ink/40 text-warn-ink text-[13px] font-bold flex items-center gap-1.5 hover:bg-warn-tint disabled:opacity-50"
          >
            <FileUp className="w-4 h-4" /> 출하 전표
          </button>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => void load()}
            title="새로고침"
            className="h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-muted"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <StatBand>
        <StatTile
          label="미분류 (태깅 대기)"
          value={data?.untagged ?? 0}
          tone={data && data.untagged > 0 ? 'bad' : 'ok'}
          active={filter === 'untagged'}
          onClick={() => setFilter('untagged')}
        />
        <StatTile
          label="오늘 입고 촬영"
          value={data?.todayIn ?? 0}
          tone="data"
          active={filter === 'in'}
          onClick={() => setFilter('in')}
        />
        <StatTile
          label="오늘 출하 촬영"
          value={data?.todayOut ?? 0}
          tone="warn"
          active={filter === 'out'}
          onClick={() => setFilter('out')}
        />
        <StatTile
          label="전체 (최근 500)"
          value={rows.length}
          tone="muted"
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
      </StatBand>

      {msg && (
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-[12.5px] font-semibold',
            msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink'
          )}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">
        {/* ── 좌: 사진함 목록 (템플릿 C 380px) ── */}
        <div className="rounded-[14px] border border-border bg-card shadow-card overflow-hidden">
          <div className="px-3 py-2 bg-muted/40 border-b border-border text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">
            촬영 목록 · {filtered.length}건
          </div>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-border">
            {filtered.length === 0 && (
              <EmptyResult message="해당 조건의 사진이 없습니다." onReset={() => setFilter('all')} />
            )}
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  'w-full px-3 py-2.5 text-left flex flex-col gap-1 hover:bg-muted/40 transition-colors',
                  selectedId === r.id && 'bg-primary/5 border-l-2 border-l-primary'
                )}
              >
                <div className="flex items-center gap-2">
                  {kindBadge(r.kind)}
                  {statusBadge(r.status)}
                  <span className="text-[12px] text-muted-foreground ml-auto tabular-nums">{fmtTime(r.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-[12.5px]">
                  <span className="font-semibold truncate">
                    {r.status === '태깅완료'
                      ? `${r.partnerName ?? r.partnerCode ?? '?'} · 품목 ${r.itemCount}${r.kind === 'receipt_in' ? ` · 수불 ${r.receiptRows}행` : ''}`
                      : '미분류 증거 (태깅 대기)'}
                  </span>
                  <span className="text-[11.5px] text-muted-foreground ml-auto shrink-0">{r.createdBy ?? '무기명'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── 우: 요약 카드 (상시 — 태깅은 모달 시트로, 31호 §6 적용 1호) ── */}
        {
          <div className="rounded-[14px] border border-border bg-card shadow-card p-5">
            <h3 className="text-[14px] font-extrabold mb-2">수집함 요약</h3>
            <p className="text-[13px] text-muted-foreground mb-4">
              좌측에서 사진을 선택하면 태깅합니다. 미분류 {data?.untagged ?? 0}건.
            </p>
            {oldestUntagged.length > 0 && (
              <>
                <div className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                  오래된 미분류 TOP {oldestUntagged.length}
                </div>
                <div className="flex flex-col gap-1">
                  {oldestUntagged.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border text-[12.5px] hover:bg-muted/40 text-left"
                    >
                      {kindBadge(r.kind)}
                      <span className="tabular-nums">{fmtTime(r.createdAt)}</span>
                      <span className="text-muted-foreground ml-auto">{r.createdBy ?? '무기명'}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        }
      </div>

      {/* ── 태깅 모달 시트 (31호 §6 적용 1호 — PC 중앙 모달·폰 풀스크린, 좌사진·우폼 2단) ── */}
      <ModalSheet
        open={!!selected}
        wide
        dirty={
          !!selected &&
          selected.status === '미분류' &&
          // 8/6 검수 Minor: receiptClass·kind 변경도 편집 흔적(무확인 파기 방지 축 완비)
          (docDate !== '' || partnerCode !== '' || note !== '' || receiptClass !== '' || formKind !== selected.kind ||
            items.some((r) => r.itemCode !== '' || r.qty !== '' || r.vendorLot !== ''))
        }
        onClose={() => setSelectedId(null)}
        title={
          selected
            ? `전표 ${selected.status === '미분류' ? '태깅' : '내용'} — ${selected.kind === 'receipt_in' ? '입고' : '출하'} · ${fmtTime(selected.createdAt)}`
            : ''
        }
      >
        {selected && msg && (
          <div
            className={cn(
              'rounded-lg px-3 py-2 mb-3 text-[12.5px] font-semibold',
              msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink'
            )}
          >
            {msg.text}
          </div>
        )}
        {selected && (
          <div className="grid sm:grid-cols-2 gap-4 items-start min-w-0">
            {/* 사진 뷰어 */}
            <div className="rounded-[14px] border border-border bg-card shadow-card p-3">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="전표 사진"
                  loading="lazy"
                  decoding="async"
                  onError={() => {
                    // 웹 스트림 실패(Electron file:// 오리진·파일 유실) → 1회 채널 폴백
                    if (imageFellBack.current || !selected) return
                    imageFellBack.current = true
                    void (async () => {
                      try {
                        const res = (await window.api.invoke(window.api.channels.SEMIMES_CAPTURE_IMAGE, {
                          id: selected.id
                        })) as { dataUrl: string | null }
                        setImageUrl(res.dataUrl)
                      } catch {
                        setImageUrl(null)
                      }
                    })()
                  }}
                  onClick={() => setImageZoom((z) => !z)}
                  className={cn(
                    'w-full rounded-lg cursor-zoom-in bg-muted/30',
                    imageZoom ? 'max-h-none cursor-zoom-out' : 'max-h-[360px] object-contain'
                  )}
                />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-[13px] text-muted-foreground">
                  사진 없음
                </div>
              )}
              <div className="mt-2 flex items-center gap-2 text-[12px] text-muted-foreground">
                {kindBadge(selected.kind)}
                {statusBadge(selected.status)}
                <span>
                  촬영 {fmtTime(selected.createdAt)} · {selected.createdBy ?? '무기명'}
                </span>
              </div>
            </div>

            {selected.status === '태깅완료' ? (
              <div className="rounded-[14px] border border-border bg-card shadow-card p-4 text-[13px]">
                <h3 className="text-[14px] font-extrabold mb-2">태깅 내용</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  <div>
                    전표 일자 — <b>{selected.docDate ?? '-'}</b>
                  </div>
                  <div>
                    거래처 — <b>{selected.partnerName ?? selected.partnerCode ?? '-'}</b>
                  </div>
                  <div>
                    품목 — <b>{selected.itemCount}건</b>
                  </div>
                  {selected.kind === 'receipt_in' ? (
                    <>
                      <div>
                        입고 구분 — <b>{selected.receiptClass ?? '-'}</b>
                      </div>
                      <div>
                        수불 기록 — <b>{selected.receiptRows}행</b> (사진 1 : 수불 N)
                      </div>
                    </>
                  ) : (
                    <div className="col-span-2 text-muted-foreground">
                      출하는 수불 테이블을 만들지 않습니다 — 사진+태그가 증거(LOT 스토리 종점).
                    </div>
                  )}
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  정정은 append-only — 이 태깅을 수정하지 않고, 잘못이면 검수 트랙에서 취소+재등록합니다.
                </p>
              </div>
            ) : (
              <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
                <h3 className="text-[14px] font-extrabold mb-3">태깅 — 전표에서 옮겨 적기</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
                    유형 (오촬영 정정 가능)
                    <div className="flex gap-1.5">
                      {(['receipt_in', 'receipt_out'] as const).map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setFormKind(k)}
                          className={cn(
                            'h-9 px-3 rounded-lg border text-[13px] font-bold flex-1',
                            formKind === k
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-foreground hover:bg-muted'
                          )}
                        >
                          {k === 'receipt_in' ? '입고' : '출하'}
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
                    전표 일자
                    <input
                      type="date"
                      value={docDate}
                      onChange={(e) => setDocDate(e.target.value)}
                      className="h-9 px-2.5 rounded-lg border border-border bg-card text-[13px] text-foreground"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
                    거래처 (코드·이름 모두 인식)
                    <input
                      list="g1-partners"
                      value={partnerCode}
                      onChange={(e) => setPartnerCode(e.target.value)}
                      placeholder="코드 또는 이름 입력·선택"
                      className="h-9 px-2.5 rounded-lg border border-border bg-card text-[13px] text-foreground"
                    />
                    <datalist id="g1-partners">
                      {data?.partners.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name} ({p.type})
                        </option>
                      ))}
                    </datalist>
                    {partnerCode && data && resolvePartnerCode(partnerCode) !== partnerCode && (
                      <span className="text-[11.5px] text-ok-ink">
                        → 코드 {resolvePartnerCode(partnerCode)} 로 해석됨
                      </span>
                    )}
                  </label>
                  {formKind === 'receipt_in' && (
                    <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
                      입고 구분 (거래처 유형으로 초안)
                      <select
                        value={receiptClass}
                        onChange={(e) => {
                          classTouched.current = true // 수동 선택 — 이후 초안이 덮지 않음
                          setReceiptClass(e.target.value)
                        }}
                        className="h-9 px-2.5 rounded-lg border border-border bg-card text-[13px] text-foreground"
                      >
                        <option value="">선택</option>
                        <option value="원자재">원자재</option>
                        <option value="외주재입고">외주재입고</option>
                      </select>
                    </label>
                  )}
                </div>

                <div className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
                  품목 (다품목 전표 = 행 추가 · 업체LOT은 전표에 없으면 비워 둠)
                </div>
                <div className="flex flex-col gap-2 mb-2">
                  {items.map((row, i) => (
                    <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_90px_minmax(0,1fr)_32px] gap-2">
                      <input
                        list={`g1-items-${i}`}
                        value={row.itemCode}
                        onChange={(e) => {
                          const v = e.target.value
                          setItems((prev) => prev.map((r, j) => (j === i ? { ...r, itemCode: v } : r)))
                          if (v.trim().length >= 2) searchItems(i, v.trim())
                        }}
                        placeholder="품번"
                        className="h-9 px-2.5 rounded-lg border border-border bg-card text-[13px]"
                      />
                      <datalist id={`g1-items-${i}`}>
                        {row.suggestions.map((s) => (
                          <option key={s.itemCode} value={s.itemCode}>
                            {s.itemName ?? ''} ({s.itemType})
                          </option>
                        ))}
                      </datalist>
                      <input
                        type="number"
                        min={1}
                        value={row.qty}
                        onChange={(e) =>
                          setItems((prev) => prev.map((r, j) => (j === i ? { ...r, qty: e.target.value } : r)))
                        }
                        placeholder="수량"
                        className="h-9 px-2.5 rounded-lg border border-border bg-card text-[13px] tabular-nums"
                      />
                      <input
                        value={row.vendorLot}
                        onChange={(e) =>
                          setItems((prev) => prev.map((r, j) => (j === i ? { ...r, vendorLot: e.target.value } : r)))
                        }
                        placeholder="업체LOT (공란 허용)"
                        className="h-9 px-2.5 rounded-lg border border-border bg-card text-[13px]"
                      />
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                        title="행 삭제"
                        className="h-9 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-bad-tint hover:text-bad-ink disabled:opacity-30"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, EMPTY_ROW()])}
                  className="h-8 px-2.5 rounded-lg border border-dashed border-border text-[12.5px] font-semibold text-muted-foreground flex items-center gap-1 hover:bg-muted mb-3"
                >
                  <Plus className="w-3.5 h-3.5" /> 품목 행 추가
                </button>

                <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground mb-4">
                  비고 (단가·금액 기입 금지 — 사진 원본이 증거)
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-9 px-2.5 rounded-lg border border-border bg-card text-[13px] text-foreground"
                  />
                </label>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveTag()}
                    className="h-10 px-5 rounded-lg bg-primary text-white text-[13.5px] font-bold disabled:opacity-50"
                  >
                    저장 — {formKind === 'receipt_in' ? '수불 기록 생성' : '출하 태그 확정'}
                  </button>
                  <span className="text-[12px] text-muted-foreground">
                    기록 주체 = {userName ?? '(사용자 미선택)'} — 세션·선택 사용자로 실명 기록
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalSheet>
    </div>
  )
}
